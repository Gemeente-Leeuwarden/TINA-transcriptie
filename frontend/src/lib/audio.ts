const SAMPLE_RATE = 16000;

export type AudioCaptureSource = "mic" | "display" | "mix";

export interface AudioCaptureController {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
}

export async function startAudioCapture(
  onChunk: (pcm: Uint8Array) => void,
  source: AudioCaptureSource = "mic",
  onStop?: () => void
): Promise<AudioCaptureController> {
  const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  let stream: MediaStream;
  let micStream: MediaStream | null = null;
  let displayStream: MediaStream | null = null;
  let paused = false;

  if (source === "display") {
    stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
  } else if (source === "mix") {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
    if (displayStream.getAudioTracks().length === 0) {
      micStream.getTracks().forEach((t) => t.stop());
      displayStream.getTracks().forEach((t) => t.stop());
      throw new Error("Geen tab-audio gedetecteerd. Zorg dat je tab-audio deelt.");
    }
    const destination = audioCtx.createMediaStreamDestination();
    audioCtx
      .createMediaStreamSource(micStream)
      .connect(destination);
    audioCtx
      .createMediaStreamSource(displayStream)
      .connect(destination);
    stream = destination.stream;
  } else {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  }

  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    displayStream?.getTracks().forEach((t) => t.stop());
    throw new Error("Geen audiospoor beschikbaar. Zorg dat je tab-audio deelt.");
  }

  const sourceNode = audioCtx.createMediaStreamSource(stream);

  // ScriptProcessor with 4096 buffer size, mono input, mono output
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    if (paused) return;
    const float32 = e.inputBuffer.getChannelData(0);
    // Convert float32 [-1,1] to int16 PCM
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    onChunk(new Uint8Array(int16.buffer));
  };

  sourceNode.connect(processor);
  processor.connect(audioCtx.destination);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    processor.disconnect();
    sourceNode.disconnect();
    audioCtx.close();
    stream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    displayStream?.getTracks().forEach((t) => t.stop());
    onStop?.();
  };

  stream.getTracks().forEach((track) => {
    track.addEventListener("ended", stop);
  });

  return {
    stop,
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    isPaused: () => paused,
  };
}
