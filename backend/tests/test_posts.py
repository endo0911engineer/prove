"""投稿エンドポイントのテスト"""
import io

import pytest
from httpx import AsyncClient
from .conftest import MINIMAL_JPEG, MINIMAL_PNG, create_post


# ── 今日のステータス ─────────────────────────────────────────────
class TestTodayStatus:
    async def test_not_posted(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/posts/today",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "NOT_POSTED"
        assert "streak" in data
        assert "timezone" in data

    async def test_posted(self, client: AsyncClient, posted_user_a: dict):
        resp = await client.get(
            "/api/v1/posts/today",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "POSTED"

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/posts/today")
        assert resp.status_code == 401

    async def test_streak_and_max_streak_returned(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/posts/today",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        data = resp.json()
        assert "streak" in data
        assert "max_streak" in data  # フィールド名確認


# ── 投稿作成 ─────────────────────────────────────────────────────
class TestCreatePost:
    async def test_success_with_jpeg(self, client: AsyncClient, user_a: dict):
        resp = await client.post(
            "/api/v1/posts",
            headers={"Authorization": f"Bearer {user_a['token']}"},
            files={"image": ("test.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "POSTED"
        assert "image_url" in data
        assert data["user"]["username"] == "user_a"

    async def test_success_with_png(self, client: AsyncClient, user_a: dict):
        resp = await client.post(
            "/api/v1/posts",
            headers={"Authorization": f"Bearer {user_a['token']}"},
            files={"image": ("test.png", io.BytesIO(MINIMAL_PNG), "image/png")},
        )
        assert resp.status_code == 201

    async def test_success_with_text(self, client: AsyncClient, user_a: dict):
        resp = await client.post(
            "/api/v1/posts",
            headers={"Authorization": f"Bearer {user_a['token']}"},
            files={"image": ("test.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
            data={"text": "今日も頑張った！"},
        )
        assert resp.status_code == 201
        assert resp.json()["text"] == "今日も頑張った！"

    async def test_already_posted_today(self, client: AsyncClient, posted_user_a: dict):
        resp = await client.post(
            "/api/v1/posts",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
            files={"image": ("test.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "Already posted" in resp.json()["detail"]

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/posts",
            files={"image": ("test.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")},
        )
        assert resp.status_code == 401

    async def test_assigns_active_goal(self, client: AsyncClient, user_a: dict):
        """投稿がアクティブなGoalに紐付けられること"""
        post = await create_post(client, user_a["token"])
        assert post["goal_id"] is not None

    async def test_streak_increments_after_post(self, client: AsyncClient, user_a: dict):
        await create_post(client, user_a["token"])
        resp = await client.get(
            "/api/v1/posts/today",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.json()["streak"] == 1


# ── 投稿取得 ─────────────────────────────────────────────────────
class TestGetPost:
    async def test_success(self, client: AsyncClient, posted_user_a: dict):
        post_id = posted_user_a["post"]["id"]
        resp = await client.get(
            f"/api/v1/posts/{post_id}",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == post_id
        assert "reactions" in data
        assert "comments" in data

    async def test_not_found(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/posts/nonexistent-id",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 404

    async def test_requires_auth(self, client: AsyncClient, posted_user_a: dict):
        post_id = posted_user_a["post"]["id"]
        resp = await client.get(f"/api/v1/posts/{post_id}")
        assert resp.status_code == 401
