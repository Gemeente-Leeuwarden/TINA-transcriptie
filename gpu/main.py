"""TINA transcription worker.

Consumes jobs published by the Go backend on RABBITMQ_IN_QUEUE (default
"session") and publishes results to RABBITMQ_OUT_QUEUE (default
"transcription") in the shape internal/queue's Go structs expect.

Audio jobs: fetches the referenced audio from MinIO and transcribes it via a
swappable TRANSCRIPTION_PROVIDER. Prompt jobs (prompt_apply): applies the
prompt to the transcript carried in the message via a swappable LLM_PROVIDER
(OpenAI-compatible chat-completions endpoint).

Message contract (must match internal/queue/*.go):
  in  (by "type"): segment_ready, upload_ready, recording_ready,
                    upload_finalize, prompt_apply
  out (by "type"): segment_transcribed, session_transcribed,
                    upload_transcribed, prompt_applied
"""

import json
import logging
import os
import signal
import time

import pika
from dotenv import load_dotenv

import storage
import wav
from llm import get_provider as get_llm_provider
from transcription import get_provider

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("tina.transcription_worker")


def segment_to_dict(start_ms: int, end_ms: int, text: str, speaker: str | None = None) -> dict:
    d = {"start_ms": start_ms, "end_ms": end_ms, "text": text}
    if speaker:
        d["speaker"] = speaker
    return d


class Worker:
    def __init__(self):
        self.in_queue = os.getenv("RABBITMQ_IN_QUEUE", "session")
        self.out_queue = os.getenv("RABBITMQ_OUT_QUEUE", "transcription")
        self.fallback_bucket = os.getenv("MINIO_BUCKET", "")
        self.provider = get_provider(os.getenv("TRANSCRIPTION_PROVIDER", "openai_compatible"))
        # Instantiated on first prompt_apply job so deployments without LLM_*
        # configured can still run transcription-only.
        self.llm = None
        self.stopping = False
        self.connection = None
        self.channel = None

        credentials = pika.PlainCredentials(
            os.getenv("RABBITMQ_USERNAME", "guest"),
            os.getenv("RABBITMQ_PASSWORD", "guest"),
        )
        self.params = pika.ConnectionParameters(
            host=os.getenv("RABBITMQ_HOST", "localhost"),
            port=int(os.getenv("RABBITMQ_PORT", "5672")),
            virtual_host=os.getenv("RABBITMQ_VHOST", "/"),
            credentials=credentials,
            # The worker blocks on HTTP calls of up to 600s and cannot service
            # heartbeats meanwhile; the broker default (60s) would close the
            # connection mid-job.
            heartbeat=int(os.getenv("RABBITMQ_HEARTBEAT", "1800")),
        )

    def _connect(self) -> None:
        self.connection = pika.BlockingConnection(self.params)
        self.channel = self.connection.channel()
        self.channel.queue_declare(queue=self.in_queue, durable=True)
        self.channel.queue_declare(queue=self.out_queue, durable=True)
        # Manual ack + prefetch 1: a job that dies with the connection is
        # redelivered instead of lost.
        self.channel.basic_qos(prefetch_count=1)
        self.channel.basic_consume(queue=self.in_queue, on_message_callback=self.on_message, auto_ack=False)

    def publish(self, message: dict) -> None:
        self.channel.basic_publish(
            exchange="",
            routing_key=self.out_queue,
            body=json.dumps(message).encode("utf-8"),
        )

    def handle_segment_ready(self, msg: dict) -> None:
        segment_id = msg["segment_id"]
        session_id = msg["session_id"]
        bucket = msg["bucket"]
        object_name = msg["object_name"]

        pcm = storage.get_object(bucket, object_name)
        audio_bytes = wav.wrap_pcm16_as_wav(pcm)
        result = self.provider.transcribe(audio_bytes, filename=f"segment_{segment_id}.wav", content_type="audio/wav")

        self.publish({
            "type": "segment_transcribed",
            "transcript": result.text,
            "summary": "",
            "segments": [],
            "language": result.language or "",
            "model": result.model or "",
            "payload": {
                "type": "segment_ready",
                "segment_id": segment_id,
                "session_id": session_id,
            },
        })
        log.info("transcribed segment %s (session %s)", segment_id, session_id)

    def handle_upload_ready(self, msg: dict) -> None:
        session_id = msg["session_id"]
        object_name = msg["object_name"]
        file_name = msg.get("file_name") or object_name
        content_type = msg.get("content_type") or "application/octet-stream"
        bucket = msg.get("bucket") or self.fallback_bucket
        if not bucket:
            log.error("upload_ready for session %s has no bucket and no MINIO_BUCKET fallback configured", session_id)
            return

        audio_bytes = storage.get_object(bucket, object_name)
        result = self.provider.transcribe(audio_bytes, filename=file_name, content_type=content_type)

        self.publish({
            "type": "upload_transcribed",
            "transcript": result.text,
            "segments": [segment_to_dict(s.start_ms, s.end_ms, s.text) for s in result.segments],
            "language": result.language or "",
            "model": result.model or "",
            "payload": {
                "type": "upload_ready",
                "session_id": session_id,
            },
        })
        log.info("transcribed upload for session %s", session_id)

    def handle_batch(self, msg: dict, msg_type: str) -> None:
        session_id = msg["session_id"]
        bucket = msg["bucket"]
        segment_infos = sorted(msg.get("segments", []), key=lambda s: s.get("started_at_ms", 0))

        segments: list[dict] = []
        transcript_parts: list[str] = []

        for seg_info in segment_infos:
            object_name = seg_info["object_name"]
            user_id = seg_info.get("user_id")
            started_at_ms = seg_info.get("started_at_ms", 0)
            ended_at_ms = seg_info.get("ended_at_ms", started_at_ms)

            try:
                pcm = storage.get_object(bucket, object_name)
                audio_bytes = wav.wrap_pcm16_as_wav(pcm)
                result = self.provider.transcribe(audio_bytes, filename=f"{object_name}.wav", content_type="audio/wav")
            except Exception:
                log.exception("failed to transcribe segment %s for session %s, skipping", object_name, session_id)
                continue

            text = result.text.strip()
            if not text:
                continue

            segments.append(segment_to_dict(started_at_ms, ended_at_ms, text, speaker=user_id))
            transcript_parts.append(text)

        self.publish({
            "type": "session_transcribed" if msg_type == "recording_ready" else "upload_transcribed",
            "transcript": "\n".join(transcript_parts),
            "segments": segments,
            "language": "",
            "model": "",
            "payload": {
                "type": msg_type,
                "session_id": session_id,
            },
        })
        log.info("transcribed %s for session %s (%d segments)", msg_type, session_id, len(segments))

    def _get_llm(self):
        if self.llm is None:
            self.llm = get_llm_provider(os.getenv("LLM_PROVIDER", "openai_compatible"))
        return self.llm

    def handle_prompt_apply(self, msg: dict) -> None:
        prompt_result_id = msg.get("prompt_result_id", "")
        reply = {
            "type": "prompt_applied",
            "prompt_result_id": prompt_result_id,
            "session_id": msg.get("session_id", ""),
            "prompt_id": msg.get("prompt_id", ""),
            "prompt_title": msg.get("prompt_title", ""),
            "result": "",
            "error": "",
            "model": "",
        }

        # Failures go back as a prompt_applied with "error" set so the Go side
        # can mark the SessionPromptResult failed instead of leaving it queued.
        try:
            prompt_content = msg.get("prompt_content", "").strip()
            transcription = msg.get("transcription", "").strip()
            if not prompt_content:
                raise ValueError("prompt_apply message has empty prompt_content")
            if not transcription:
                raise ValueError("prompt_apply message has empty transcription")

            result = self._get_llm().apply_prompt(prompt_content, transcription)
            reply["result"] = result.text
            reply["model"] = result.model or ""
            log.info("applied prompt result %s (session %s)", prompt_result_id, msg.get("session_id"))
        except Exception as exc:
            log.exception("failed to apply prompt result %s", prompt_result_id)
            reply["error"] = str(exc)

        self.publish(reply)

    def on_message(self, channel, method, properties, body: bytes) -> None:
        try:
            msg = json.loads(body)
        except json.JSONDecodeError:
            log.error("could not decode message body: %r", body)
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        msg_type = msg.get("type")
        try:
            if msg_type == "segment_ready":
                self.handle_segment_ready(msg)
            elif msg_type == "upload_ready":
                self.handle_upload_ready(msg)
            elif msg_type in ("recording_ready", "upload_finalize"):
                self.handle_batch(msg, msg_type)
            elif msg_type == "prompt_apply":
                self.handle_prompt_apply(msg)
            else:
                log.info("ignoring unknown message type: %s", msg_type)
        except Exception:
            # Processing errors are logged and acked; only a dead connection
            # (ack below raising) leads to redelivery.
            log.exception("failed to process %s message", msg_type)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    def run(self) -> None:
        def stop(signum, frame):
            log.info("shutting down")
            self.stopping = True
            if self.channel is not None and self.channel.is_open:
                self.channel.stop_consuming()

        signal.signal(signal.SIGINT, stop)
        signal.signal(signal.SIGTERM, stop)

        backoff = 2
        while not self.stopping:
            try:
                self._connect()
                backoff = 2
                log.info("waiting for messages on queue '%s', publishing results to '%s'", self.in_queue, self.out_queue)
                self.channel.start_consuming()
            except (
                pika.exceptions.AMQPConnectionError,
                pika.exceptions.StreamLostError,
                pika.exceptions.ChannelClosedByBroker,
                pika.exceptions.ConnectionWrongStateError,
            ) as exc:
                if self.stopping:
                    break
                log.error("lost RabbitMQ connection (%s), reconnecting in %ds", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)

        if self.connection is not None and self.connection.is_open:
            self.connection.close()


if __name__ == "__main__":
    load_dotenv()
    Worker().run()