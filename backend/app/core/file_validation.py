from fastapi import HTTPException

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# JPEG: FF D8 FF
# PNG:  89 50 4E 47 0D 0A 1A 0A
_MAGIC_SIGNATURES = [
    (b'\xff\xd8\xff', "JPEG"),
    (b'\x89PNG\r\n\x1a\n', "PNG"),
]

# HEIC/HEIFは先頭4バイトがサイズ、次の4バイトが "ftyp"、その後4バイトがブランド
_HEIC_BRANDS = {b'heic', b'heix', b'mif1', b'msf1', b'hevc', b'hevx', b'avif'}


def validate_image_bytes(file_bytes: bytes) -> None:
    """
    ファイルサイズとマジックナンバーを検証する。
    JPEG・PNG・HEIC/HEIF・AVIF のみ許可。
    不正な場合は HTTPException(400) を送出する。
    """
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    # JPEG / PNG チェック
    for magic, _ in _MAGIC_SIGNATURES:
        if file_bytes[:len(magic)] == magic:
            return

    # HEIC / HEIF / AVIF チェック（ISO Base Media File Format）
    if len(file_bytes) >= 12 and file_bytes[4:8] == b'ftyp':
        brand = file_bytes[8:12]
        if brand in _HEIC_BRANDS:
            return

    raise HTTPException(
        status_code=400,
        detail="Invalid file type. Only JPEG, PNG, and HEIC are allowed"
    )
