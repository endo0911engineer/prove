"""ゴールエンドポイントのテスト"""
import pytest
from httpx import AsyncClient
from .conftest import create_post


class TestGetMyGoals:
    async def test_has_goal_after_onboarding(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 200
        goals = resp.json()
        assert len(goals) == 1
        assert goals[0]["title"] == "プログラミングを学ぶ"
        assert goals[0]["is_active"] is True

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/users/me/goals")
        assert resp.status_code == 401

    async def test_goal_includes_post_count(self, client: AsyncClient, posted_user_a: dict):
        resp = await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        goal = resp.json()[0]
        assert goal["post_count"] == 1


class TestGetUserGoals:
    async def test_success(self, client: AsyncClient, user_a: dict, user_b: dict):
        user_a_id = user_a["user"]["id"]
        resp = await client.get(
            f"/api/v1/users/{user_a_id}/goals",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_user_not_found(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/users/nonexistent/goals",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 404

    async def test_requires_auth(self, client: AsyncClient, user_a: dict):
        user_a_id = user_a["user"]["id"]
        resp = await client.get(f"/api/v1/users/{user_a_id}/goals")
        assert resp.status_code == 401


class TestGetGoalPosts:
    async def test_success(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        goals_resp = await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        goal_id = goals_resp.json()[0]["id"]

        resp = await client.get(
            f"/api/v1/goals/{goal_id}/posts",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        posts = resp.json()
        assert len(posts) == 1
        assert posts[0]["goal_id"] == goal_id

    async def test_empty_when_no_posts(self, client: AsyncClient, user_a: dict, user_b: dict):
        goals_resp = await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        goal_id = goals_resp.json()[0]["id"]

        resp = await client.get(
            f"/api/v1/goals/{goal_id}/posts",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_goal_not_found(self, client: AsyncClient, user_a: dict):
        resp = await client.get(
            "/api/v1/goals/nonexistent/posts",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 404

    async def test_pagination(self, client: AsyncClient, posted_user_a: dict):
        goals_resp = await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        goal_id = goals_resp.json()[0]["id"]

        resp = await client.get(
            f"/api/v1/goals/{goal_id}/posts?skip=0&limit=10",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200

    async def test_requires_auth(self, client: AsyncClient, posted_user_a: dict):
        goals_resp = await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        goal_id = goals_resp.json()[0]["id"]
        resp = await client.get(f"/api/v1/goals/{goal_id}/posts")
        assert resp.status_code == 401
