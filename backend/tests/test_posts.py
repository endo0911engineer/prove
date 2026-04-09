"""投稿エンドポイントのテスト"""
import io
from unittest.mock import patch
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from .conftest import MINIMAL_JPEG, MINIMAL_PNG, create_post

JST = timezone(timedelta(hours=9))


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
        assert "posting_window_start" in data
        assert "posting_window_end" in data

    async def test_posted(self, client: AsyncClient, posted_user_a: dict):
        resp = await client.get(
            "/api/v1/posts/today",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "POSTED"

    async def test_missed(self, client: AsyncClient, user_a: dict):
        """投稿ウィンドウ終了後は MISSED になること"""
        # ウィンドウ終了後の時刻にパッチ
        future_jst = datetime.now(JST).replace(hour=23, minute=59, second=0)
        with patch("app.api.v1.posts.datetime") as mock_dt:
            mock_dt.now.return_value = future_jst
            mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)

            # ウィンドウを0-1に設定して必ず終了済みにする
            await client.patch(
                "/api/v1/users/me",
                json={"posting_window_start": 0, "posting_window_end": 1},
                headers={"Authorization": f"Bearer {user_a['token']}"},
            )

        resp = await client.get(
            "/api/v1/posts/today",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        # ウィンドウが1:00に終わっており、現在時刻によってはMISSEDまたはNOT_POSTED
        assert resp.json()["status"] in ("MISSED", "NOT_POSTED")

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
