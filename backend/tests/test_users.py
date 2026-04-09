"""ユーザーエンドポイントのテスト"""
import io
import pytest
from httpx import AsyncClient
from .conftest import MINIMAL_JPEG, create_post


class TestGetMe:
    async def test_success(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "user_a"
        assert "follower_count" in data
        assert "following_count" in data
        assert "current_streak" in data

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/users/me")
        assert resp.status_code == 401


class TestUpdateProfile:
    async def test_update_bio(self, client: AsyncClient, user_a: dict):
        resp = await client.patch(
            "/api/v1/users/me",
            json={"bio": "新しいbioです"},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["bio"] == "新しいbioです"

    async def test_update_posting_window(self, client: AsyncClient, user_a: dict):
        resp = await client.patch(
            "/api/v1/users/me",
            json={"posting_window_start": 7, "posting_window_end": 22},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["posting_window_start"] == 7
        assert data["posting_window_end"] == 22

    async def test_update_notification_enabled(self, client: AsyncClient, user_a: dict):
        resp = await client.patch(
            "/api/v1/users/me",
            json={"notification_enabled": False},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["notification_enabled"] is False

    async def test_update_privacy(self, client: AsyncClient, user_a: dict):
        resp = await client.patch(
            "/api/v1/users/me",
            json={"is_private": True},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_private"] is True

    async def test_partial_update(self, client: AsyncClient, user_a: dict):
        """未指定フィールドは変更されないこと"""
        # まずbioを設定
        await client.patch(
            "/api/v1/users/me",
            json={"bio": "元のbio"},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        # goalだけ更新
        resp = await client.patch(
            "/api/v1/users/me",
            json={"goal": "新しい目標"},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["bio"] == "元のbio"  # 保持されている

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.patch("/api/v1/users/me", json={"bio": "x"})
        assert resp.status_code == 401


class TestGetUserById:
    async def test_success(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_id = user_a["user"]["id"]
        resp = await client.get(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "user_a"
        assert "follower_count" in data

    async def test_not_found(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/users/nonexistent-id",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 404


class TestGetUserPosts:
    async def test_success(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        user_id = posted_user_a["user"]["id"]
        resp = await client.get(
            f"/api/v1/users/{user_id}/posts",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        posts = resp.json()
        assert len(posts) == 1
        assert posts[0]["user_id"] == user_id

    async def test_empty_when_no_posts(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_id = user_a["user"]["id"]
        resp = await client.get(
            f"/api/v1/users/{user_id}/posts",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_requires_auth(self, client: AsyncClient, user_a: dict):
        user_id = user_a["user"]["id"]
        resp = await client.get(f"/api/v1/users/{user_id}/posts")
        assert resp.status_code == 401

    async def test_pagination(self, client: AsyncClient, user_a: dict, user_b: dict):
        """skip/limitパラメータが機能すること"""
        user_id = user_a["user"]["id"]
        resp = await client.get(
            f"/api/v1/users/{user_id}/posts?skip=0&limit=5",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200


class TestUploadAvatar:
    async def test_success(self, client: AsyncClient, user_a: dict):
        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers={"Authorization": f"Bearer {user_a['token']}"},
            files={"image": ("avatar.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        )
        assert resp.status_code == 200
        assert resp.json()["avatar_url"] is not None

    async def test_invalid_file_rejected(self, client: AsyncClient, user_a: dict):
        fake_data = b"not an image at all"
        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers={"Authorization": f"Bearer {user_a['token']}"},
            files={"image": ("fake.jpg", io.BytesIO(fake_data), "image/jpeg")},
        )
        assert resp.status_code == 400
