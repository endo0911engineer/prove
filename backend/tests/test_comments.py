"""コメントエンドポイントのテスト"""
import pytest
from httpx import AsyncClient


class TestAddComment:
    async def test_success(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        post_id = posted_user_a["post"]["id"]
        resp = await client.post(
            f"/api/v1/posts/{post_id}/comments",
            json={"text": "すごい努力ですね！"},
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["text"] == "すごい努力ですね！"
        assert data["user"]["username"] == "user_b"

    async def test_own_post_comment(self, client: AsyncClient, posted_user_a: dict):
        """自分の投稿にもコメントできること"""
        post_id = posted_user_a["post"]["id"]
        resp = await client.post(
            f"/api/v1/posts/{post_id}/comments",
            json={"text": "自己コメント"},
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 201

    async def test_whitespace_trimmed(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """前後の空白がトリムされること"""
        post_id = posted_user_a["post"]["id"]
        resp = await client.post(
            f"/api/v1/posts/{post_id}/comments",
            json={"text": "  スペースあり  "},
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 201
        assert resp.json()["text"] == "スペースあり"

    async def test_post_not_found(self, client: AsyncClient, user_a: dict):
        resp = await client.post(
            "/api/v1/posts/nonexistent/comments",
            json={"text": "コメント"},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 404

    async def test_requires_auth(self, client: AsyncClient, posted_user_a: dict):
        post_id = posted_user_a["post"]["id"]
        resp = await client.post(
            f"/api/v1/posts/{post_id}/comments",
            json={"text": "コメント"},
        )
        assert resp.status_code == 401


class TestGetComments:
    async def test_success(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        post_id = posted_user_a["post"]["id"]
        await client.post(
            f"/api/v1/posts/{post_id}/comments",
            json={"text": "1つ目"},
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        await client.post(
            f"/api/v1/posts/{post_id}/comments",
            json={"text": "2つ目"},
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        resp = await client.get(
            f"/api/v1/posts/{post_id}/comments",
            headers={"Authorization": f"Bearer {user_a['token']}"}
            if False else {"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        comments = resp.json()
        assert len(comments) == 2
        # 時系列順で返ること
        assert comments[0]["text"] == "1つ目"
        assert comments[1]["text"] == "2つ目"

    async def test_empty_when_no_comments(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        post_id = posted_user_a["post"]["id"]
        resp = await client.get(
            f"/api/v1/posts/{post_id}/comments",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_requires_auth(self, client: AsyncClient, posted_user_a: dict):
        post_id = posted_user_a["post"]["id"]
        resp = await client.get(f"/api/v1/posts/{post_id}/comments")
        assert resp.status_code == 401
