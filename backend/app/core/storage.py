import uuid
import os
import boto3
from .config import settings

UPLOAD_DIR = "/app/uploads"


def upload_image(file_bytes: bytes, content_type: str) -> str:
    if settings.storage_backend == "s3":
        return _upload_to_s3(file_bytes, content_type)
    return _upload_to_local(file_bytes)


def _upload_to_local(file_bytes: bytes) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.jpg"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/{filename}"


def _upload_to_s3(file_bytes: bytes, content_type: str) -> str:
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )
    key = f"posts/{uuid.uuid4()}.jpg"
    s3.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{key}"
