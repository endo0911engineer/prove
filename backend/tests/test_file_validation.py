"""ファイルバリデーションのテスト"""
import io
import pytest
from app.core.file_validation import validate_image_bytes, MAX_FILE_SIZE
from fastapi import HTTPException


class TestValidateImageBytes:
    def test_valid_jpeg(self):
        jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 200
        validate_image_bytes(jpeg)  # 例外が出なければOK

    def test_valid_png(self):
        png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200
        validate_image_bytes(png)

    def test_valid_heic(self):
        # ISO Base Media: 4バイトサイズ + "ftyp" + ブランド "heic"
        heic = b"\x00\x00\x00\x18ftyp" + b"heic" + b"\x00" * 200
        validate_image_bytes(heic)

    def test_valid_avif(self):
        avif = b"\x00\x00\x00\x18ftyp" + b"avif" + b"\x00" * 200
        validate_image_bytes(avif)

    def test_empty_file_raises(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_image_bytes(b"")
        assert exc_info.value.status_code == 400
        assert "Empty" in exc_info.value.detail

    def test_file_too_large_raises(self):
        oversized = b"\xff\xd8\xff\xe0" + b"\x00" * (MAX_FILE_SIZE + 1)
        with pytest.raises(HTTPException) as exc_info:
            validate_image_bytes(oversized)
        assert exc_info.value.status_code == 400
        assert "large" in exc_info.value.detail.lower()

    def test_invalid_type_raises(self):
        fake = b"GIF89a" + b"\x00" * 200
        with pytest.raises(HTTPException) as exc_info:
            validate_image_bytes(fake)
        assert exc_info.value.status_code == 400
        assert "Invalid" in exc_info.value.detail

    def test_pdf_rejected(self):
        pdf = b"%PDF-1.4" + b"\x00" * 200
        with pytest.raises(HTTPException) as exc_info:
            validate_image_bytes(pdf)
        assert exc_info.value.status_code == 400

    def test_text_file_rejected(self):
        text = b"hello world this is a text file"
        with pytest.raises(HTTPException) as exc_info:
            validate_image_bytes(text)
        assert exc_info.value.status_code == 400

    def test_exactly_at_size_limit(self):
        """サイズ上限ちょうどはOK"""
        jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * (MAX_FILE_SIZE - 4)
        validate_image_bytes(jpeg)

    def test_one_byte_over_limit_raises(self):
        jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * (MAX_FILE_SIZE - 4 + 1)
        with pytest.raises(HTTPException) as exc_info:
            validate_image_bytes(jpeg)
        assert exc_info.value.status_code == 400

    def test_unknown_ftyp_brand_rejected(self):
        """ftypだがHEIC/AVIFでないブランドは拒否される"""
        mp4 = b"\x00\x00\x00\x18ftyp" + b"mp42" + b"\x00" * 200
        with pytest.raises(HTTPException) as exc_info:
            validate_image_bytes(mp4)
        assert exc_info.value.status_code == 400


class TestFileUploadEndpoint:
    """実際のアップロードエンドポイント経由でのバリデーションテスト"""

    async def test_upload_invalid_file_returns_400(self, client, posted_user_a):
        """無効なファイルを投稿しようとすると400"""
        # 一日一回制限があるので別ユーザーを作る必要はなく、
        # 直接アバターアップロードエンドポイントでテスト
        resp = await client.post(
            "/api/v1/users/me/avatar",
            files={"image": ("evil.pdf", io.BytesIO(b"%PDF-1.4" + b"\x00" * 200), "image/jpeg")},
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 400

    async def test_upload_valid_jpeg_avatar(self, client, user_a):
        jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 200
        resp = await client.post(
            "/api/v1/users/me/avatar",
            files={"image": ("avatar.jpg", io.BytesIO(jpeg), "image/jpeg")},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200

    async def test_upload_valid_png_avatar(self, client, user_a):
        png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200
        resp = await client.post(
            "/api/v1/users/me/avatar",
            files={"image": ("avatar.png", io.BytesIO(png), "image/png")},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
