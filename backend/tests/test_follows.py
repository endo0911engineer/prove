"""フォローエンドポイントのテスト"""
import pytest
from httpx import AsyncClient


class TestFollow:
    async def test_follow_user(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_b_id = user_b["user"]["id"]
        resp = await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 204

    async def test_follow_self(self, client: AsyncClient, user_a: dict):
        user_a_id = user_a["user"]["id"]
        resp = await client.post(
            f"/api/v1/users/{user_a_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 400

    async def test_follow_already_following_is_idempotent(self, client: AsyncClient, user_a: dict, user_b: dict):
        """重複フォローは204を返してエラーにならないこと"""
        user_b_id = user_b["user"]["id"]
        await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        resp = await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 204

    async def test_requires_auth(self, client: AsyncClient, user_b: dict):
        user_b_id = user_b["user"]["id"]
        resp = await client.post(f"/api/v1/users/{user_b_id}/follow")
        assert resp.status_code == 401


class TestUnfollow:
    async def test_unfollow(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_b_id = user_b["user"]["id"]
        # まずフォロー
        await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        # アンフォロー
        resp = await client.delete(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 204

    async def test_unfollow_not_following_is_idempotent(self, client: AsyncClient, user_a: dict, user_b: dict):
        """フォローしていない相手をアンフォローしてもエラーにならないこと"""
        user_b_id = user_b["user"]["id"]
        resp = await client.delete(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 204

    async def test_follower_count_decrements(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_b_id = user_b["user"]["id"]
        await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        await client.delete(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        resp = await client.get(
            f"/api/v1/users/{user_b_id}",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.json()["follower_count"] == 0


class TestGetFollowers:
    async def test_get_followers(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_b_id = user_b["user"]["id"]
        await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        resp = await client.get(
            f"/api/v1/users/{user_b_id}/followers",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        followers = resp.json()
        assert len(followers) == 1
        assert followers[0]["username"] == "user_a"

    async def test_empty_followers(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_a_id = user_a["user"]["id"]
        resp = await client.get(
            f"/api/v1/users/{user_a_id}/followers",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetFollowing:
    async def test_get_following(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_b_id = user_b["user"]["id"]
        await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        user_a_id = user_a["user"]["id"]
        resp = await client.get(
            f"/api/v1/users/{user_a_id}/following",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        following = resp.json()
        assert len(following) == 1
        assert following[0]["username"] == "user_b"

    async def test_follower_count_reflects_follow(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_b_id = user_b["user"]["id"]
        await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        resp = await client.get(
            f"/api/v1/users/{user_b_id}",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.json()["follower_count"] == 1


class TestIsFollowing:
    async def test_is_following_true(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_b_id = user_b["user"]["id"]
        await client.post(
            f"/api/v1/users/{user_b_id}/follow",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        resp = await client.get(
            f"/api/v1/users/{user_b_id}/is_following",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_following"] is True

    async def test_is_following_false(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_b_id = user_b["user"]["id"]
        resp = await client.get(
            f"/api/v1/users/{user_b_id}/is_following",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_following"] is False
