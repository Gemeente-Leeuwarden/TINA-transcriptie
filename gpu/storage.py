import os

from minio import Minio


def _client() -> Minio:
    endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    use_ssl = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
    return Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=use_ssl)


_minio_client = None


def get_object(bucket: str, object_name: str) -> bytes:
    global _minio_client
    if _minio_client is None:
        _minio_client = _client()

    response = _minio_client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()