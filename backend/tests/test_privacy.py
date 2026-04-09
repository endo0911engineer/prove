"""
非公開アカウントのアクセス制御テスト

非公開ユーザーのコンテンツはフォロワーのみアクセス可能。
"""
import pytest
from httpx import AsyncClient


async def make_private(client: AsyncClient, token: str) -> None:
    await client.patch(
        "/api/v1/users/me",
        json={"is_private": True},
        headers={"Authorization": f"Bearer {token}"},
    )


async def follow_user(client: AsyncClient, follower_token: str, target_id: str) -> None:
    await client.post(
        f"/api/v1/users/{target_id}/follow",
        headers={"Authorization": f"Bearer {follower_token}"},
    )


class TestPrivateUserPosts:
    async def test_non_follower_gets_403(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        user_a_id = posted_user_a["user"]["id"]

        resp = await client.get(
            f"/api/v1/users/{user_a_id}/posts",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 403

    async def test_follower_gets_200(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        user_a_id = posted_user_a["user"]["id"]
        await follow_user(client, user_b["token"], user_a_id)

        resp = await client.get(
            f"/api/v1/users/{user_a_id}/posts",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200

    async def test_self_gets_200(self, client: AsyncClient, posted_user_a: dict):
        await make_private(client, posted_user_a["token"])
        user_a_id = posted_user_a["user"]["id"]

        resp = await client.get(
            f"/api/v1/users/{user_a_id}/posts",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200


class TestPrivateUserPost:
    async def test_non_follower_cannot_get_post(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        post_id = posted_user_a["post"]["id"]

        resp = await client.get(
            f"/api/v1/posts/{post_id}",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 403

    async def test_follower_can_get_post(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        user_a_id = posted_user_a["user"]["id"]
        post_id = posted_user_a["post"]["id"]
        await follow_user(client, user_b["token"], user_a_id)

        resp = await client.get(
            f"/api/v1/posts/{post_id}",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200


class TestPrivateUserGoals:
    async def test_non_follower_gets_403(self, client: AsyncClient, user_a: dict, user_b: dict):
        await make_private(client, user_a["token"])
        user_a_id = user_a["user"]["id"]

        resp = await client.get(
            f"/api/v1/users/{user_a_id}/goals",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 403

    async def test_follower_gets_200(self, client: AsyncClient, user_a: dict, user_b: dict):
        await make_private(client, user_a["token"])
        user_a_id = user_a["user"]["id"]
        await follow_user(client, user_b["token"], user_a_id)

        resp = await client.get(
            f"/api/v1/users/{user_a_id}/goals",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200


class TestPrivateUserGoalPosts:
    async def test_non_follower_cannot_get_goal_posts(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        goals = (await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )).json()
        goal_id = goals[0]["id"]

        resp = await client.get(
            f"/api/v1/goals/{goal_id}/posts",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 403

    async def test_follower_can_get_goal_posts(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        user_a_id = posted_user_a["user"]["id"]
        await follow_user(client, user_b["token"], user_a_id)

        goals = (await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )).json()
        goal_id = goals[0]["id"]

        resp = await client.get(
            f"/api/v1/goals/{goal_id}/posts",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200


class TestPrivateUserReactionsAndComments:
    async def test_non_follower_cannot_react(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        post_id = posted_user_a["post"]["id"]

        resp = await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "KEEP_GOING"},
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 403

    async def test_non_follower_cannot_comment(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        post_id = posted_user_a["post"]["id"]

        resp = await client.post(
            f"/api/v1/posts/{post_id}/comments",
            json={"text": "コメント"},
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 403

    async def test_non_follower_cannot_get_comments(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        post_id = posted_user_a["post"]["id"]

        resp = await client.get(
            f"/api/v1/posts/{post_id}/comments",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 403

    async def test_follower_can_react(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        await make_private(client, posted_user_a["token"])
        user_a_id = posted_user_a["user"]["id"]
        await follow_user(client, user_b["token"], user_a_id)

        post_id = posted_user_a["post"]["id"]
        resp = await client.post(
            f"/api/v1/posts/{post_id}/reactions",
            json={"type": "INSPIRED"},
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 200
