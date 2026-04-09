"""リアクションエンドポイントのテスト"""
import pytest
from httpx import AsyncClient


class TestToggleReaction:
    async def test_add_reaction(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        post_id = posted_user_a["post"]["id"]
        resp = await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "KEEP_GOING"},
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["type"] == "KEEP_GOING"

    async def test_same_type_removes_reaction(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """同じリアクションを2回押すと解除される"""
        post_id = posted_user_a["post"]["id"]
        headers = {"Authorization": f"Bearer {user_b['token']}"}

        await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "KEEP_GOING"},
            headers=headers,
        )
        resp = await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "KEEP_GOING"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json().get("action") == "removed"

    async def test_different_type_replaces_reaction(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """異なるリアクションを押すと差し替えられる"""
        post_id = posted_user_a["post"]["id"]
        headers = {"Authorization": f"Bearer {user_b['token']}"}

        await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "KEEP_GOING"},
            headers=headers,
        )
        resp = await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "INSPIRED"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["type"] == "INSPIRED"

        # 投稿を取得してリアクションが1件だけか確認
        post_resp = await client.get(
            f"/api/v1/posts/{post_id}",
            headers=headers,
        )
        reactions = post_resp.json()["reactions"]
        assert len(reactions) == 1
        assert reactions[0]["type"] == "INSPIRED"

    async def test_all_reaction_types_accepted(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        post_id = posted_user_a["post"]["id"]
        headers = {"Authorization": f"Bearer {user_b['token']}"}

        for reaction_type in ("KEEP_GOING", "NICE_EFFORT", "INSPIRED"):
            resp = await client.post(
                f"/api/v1/posts/{post_id}/reactions",
                json={"type": reaction_type},
                headers=headers,
            )
            assert resp.status_code == 200

    async def test_post_not_found(self, client: AsyncClient, user_a: dict):
        resp = await client.post(
            "/api/v1/posts/nonexistent/reactions",
            json={"type": "KEEP_GOING"},
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 404

    async def test_requires_auth(self, client: AsyncClient, posted_user_a: dict):
        post_id = posted_user_a["post"]["id"]
        resp = await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "KEEP_GOING"},
        )
        assert resp.status_code == 401

    async def test_own_post_reaction(self, client: AsyncClient, posted_user_a: dict):
        """自分の投稿にもリアクションできること"""
        post_id = posted_user_a["post"]["id"]
        resp = await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "KEEP_GOING"},
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
