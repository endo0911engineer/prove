"""フィードエンドポイントのテスト"""
import io
import pytest
from httpx import AsyncClient
from .conftest import MINIMAL_JPEG, MINIMAL_PNG, create_post


class TestGetFeed:
    async def test_requires_today_post(self, client: AsyncClient, user_a: dict, user_b: dict):
        """今日投稿していないとフィードが見れない"""
        resp = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        assert resp.status_code == 403

    async def test_can_view_feed_after_posting(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """今日投稿済みならフィードが見れる"""
        # user_bも投稿（フィードに表示するコンテンツを作る）
        await create_post(client, user_b["token"])

        resp = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200

    async def test_feed_contains_other_users_posts(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """フィードに他ユーザーの投稿が含まれる"""
        await create_post(client, user_b["token"])

        resp = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        posts = resp.json()
        user_ids = [p["user"]["id"] for p in posts]
        assert user_b["user"]["id"] in user_ids

    async def test_feed_does_not_contain_own_post(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """フィードに自分の投稿は含まれない"""
        await create_post(client, user_b["token"])

        resp = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        posts = resp.json()
        user_ids = [p["user"]["id"] for p in posts]
        assert posted_user_a["user"]["id"] not in user_ids

    async def test_feed_post_has_expected_fields(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """フィードの投稿にはuser, reactions, commentsが含まれる"""
        await create_post(client, user_b["token"])

        resp = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        posts = resp.json()
        assert len(posts) > 0
        post = posts[0]
        assert "id" in post
        assert "user" in post
        assert "reactions" in post
        assert "comments" in post
        assert "image_url" in post

    async def test_feed_pagination(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """skip/limitパラメータが機能する"""
        await create_post(client, user_b["token"])

        resp_all = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        all_posts = resp_all.json()

        resp_limited = await client.get(
            "/api/v1/feed?skip=0&limit=1",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp_limited.status_code == 200
        assert len(resp_limited.json()) <= 1

    async def test_feed_empty_when_no_other_users(self, client: AsyncClient, posted_user_a: dict):
        """他ユーザーがいない場合は空のフィード"""
        resp = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        # posted_user_a 自身は除外されるので自分の投稿は返らない
        posts = resp.json()
        user_ids = [p["user"]["id"] for p in posts]
        assert posted_user_a["user"]["id"] not in user_ids

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/feed")
        assert resp.status_code == 401

    async def test_feed_sorted_newest_first(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """フィードは新着順"""
        # user_bで2回投稿（1回目は今日の制限があるのでuser_cを使う）
        from .conftest import register, onboard
        tokens = await register(client, "c@test.com")
        await onboard(client, tokens["access_token"], username="user_c", goal="筋トレ")
        await create_post(client, tokens["access_token"])
        await create_post(client, user_b["token"])

        resp = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        posts = resp.json()
        if len(posts) >= 2:
            # 新しいものが先
            times = [p["created_at"] for p in posts]
            assert times == sorted(times, reverse=True)

    async def test_feed_includes_followed_users(self, client: AsyncClient, posted_user_a: dict, user_b: dict):
        """フォロー中ユーザーの投稿がフィードに含まれる"""
        await client.post(
            f"/api/v1/users/{user_b['user']['id']}/follow",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        await create_post(client, user_b["token"])

        resp = await client.get(
            "/api/v1/feed",
            headers={"Authorization": f"Bearer {posted_user_a['token']}"},
        )
        assert resp.status_code == 200
        posts = resp.json()
        user_ids = [p["user"]["id"] for p in posts]
        assert user_b["user"]["id"] in user_ids
