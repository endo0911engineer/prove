"""検索エンドポイントのテスト"""
import pytest
from httpx import AsyncClient
from .conftest import register, onboard


class TestSearchUsers:
    async def test_search_by_username(self, client: AsyncClient, user_a: dict, user_b: dict):
        resp = await client.get(
            "/api/v1/search/users?q=user_b",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 1
        assert results[0]["username"] == "user_b"

    async def test_search_partial_match(self, client: AsyncClient, user_a: dict, user_b: dict):
        resp = await client.get(
            "/api/v1/search/users?q=user",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        usernames = [u["username"] for u in resp.json()]
        # user_a は自分なので除外される
        assert "user_b" in usernames
        assert "user_a" not in usernames

    async def test_search_no_results(self, client: AsyncClient, user_a: dict, user_b: dict):
        resp = await client.get(
            "/api/v1/search/users?q=nonexistent_xyz_123",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_search_excludes_self(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/search/users?q=user_a",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        usernames = [u["username"] for u in resp.json()]
        assert "user_a" not in usernames

    async def test_search_no_query_returns_all_others(self, client: AsyncClient, user_a: dict, user_b: dict):
        resp = await client.get(
            "/api/v1/search/users",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        usernames = [u["username"] for u in resp.json()]
        assert "user_b" in usernames
        assert "user_a" not in usernames

    async def test_sort_by_streak(self, client: AsyncClient, user_a: dict, user_b: dict):
        resp = await client.get(
            "/api/v1/search/users?sort=streak",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        results = resp.json()
        if len(results) >= 2:
            streaks = [r["current_streak"] for r in results]
            assert streaks == sorted(streaks, reverse=True)

    async def test_sort_by_new(self, client: AsyncClient, user_a: dict, user_b: dict):
        resp = await client.get(
            "/api/v1/search/users?sort=new",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_pagination(self, client: AsyncClient, user_a: dict, user_b: dict):
        resp = await client.get(
            "/api/v1/search/users?skip=0&limit=1",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) <= 1

    async def test_pagination_skip(self, client: AsyncClient, user_a: dict, user_b: dict):
        all_resp = await client.get(
            "/api/v1/search/users",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        all_results = all_resp.json()

        if len(all_results) >= 2:
            skip_resp = await client.get(
                "/api/v1/search/users?skip=1",
                headers={"Authorization": f"Bearer {user_a['token']}"},
            )
            assert skip_resp.status_code == 200
            assert len(skip_resp.json()) == len(all_results) - 1

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/search/users?q=test")
        assert resp.status_code == 401

    async def test_case_insensitive_search(self, client: AsyncClient, user_a: dict, user_b: dict):
        resp = await client.get(
            "/api/v1/search/users?q=USER_B",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        usernames = [u["username"] for u in resp.json()]
        assert "user_b" in usernames

    async def test_search_multiple_users(self, client: AsyncClient, user_a: dict, user_b: dict):
        """3人目のユーザーを作ってクエリなしで全員取得"""
        tokens = await register(client, "c@test.com")
        await onboard(client, tokens["access_token"], username="user_c", goal="筋トレ")

        resp = await client.get(
            "/api/v1/search/users",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        usernames = [u["username"] for u in resp.json()]
        assert "user_b" in usernames
        assert "user_c" in usernames
