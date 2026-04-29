"""認証エンドポイントのテスト"""
import pytest
from httpx import AsyncClient
from .conftest import register, onboard


# ── 登録 ────────────────────────────────────────────────────────
class TestRegister:
    async def test_success(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "new@test.com", "password": "password123"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["needs_onboarding"] is True

    async def test_duplicate_email(self, client: AsyncClient):
        await register(client, "dup@test.com")
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "dup@test.com", "password": "password123"},
        )
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"]

    async def test_missing_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "", "password": "password123"},
        )
        assert resp.status_code == 400

    async def test_missing_password(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "valid@test.com", "password": ""},
        )
        assert resp.status_code == 400

    async def test_refresh_token_stored_in_db(self, client: AsyncClient):
        """登録時にリフレッシュトークンがDBに保存されること"""
        tokens = await register(client)
        # リフレッシュが成功すればDBに保存されている証拠
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert resp.status_code == 200


# ── ログイン ────────────────────────────────────────────────────
class TestLogin:
    async def test_success(self, client: AsyncClient):
        await register(client, "login@test.com", "mypassword")
        resp = await client.post(
            "/api/v1/auth/token",
            content="username=login@test.com&password=mypassword",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_wrong_password(self, client: AsyncClient):
        await register(client, "login2@test.com", "correct")
        resp = await client.post(
            "/api/v1/auth/token",
            content="username=login2@test.com&password=wrong",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 401

    async def test_wrong_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/token",
            content="username=nobody@test.com&password=anything",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 401

    async def test_multiple_logins_each_get_token(self, client: AsyncClient):
        """同一ユーザーが複数回ログインしてもそれぞれトークンを取得できること"""
        await register(client, "multi@test.com", "pass")
        for _ in range(3):
            resp = await client.post(
                "/api/v1/auth/token",
                content="username=multi@test.com&password=pass",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            assert resp.status_code == 200


# ── オンボーディング ────────────────────────────────────────────
class TestOnboarding:
    async def test_success(self, client: AsyncClient):
        tokens = await register(client)
        resp = await client.post(
            "/api/v1/auth/onboarding",
            json={
                "username": "myusername",
                "goal": "毎日筋トレをする",
                "timezone": "Asia/Tokyo",
            },
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "myusername"
        assert data["goal"] == "毎日筋トレをする"
        assert data["timezone"] == "Asia/Tokyo"

    async def test_duplicate_username(self, client: AsyncClient):
        tokens1 = await register(client, "user1@test.com")
        await onboard(client, tokens1["access_token"], username="taken_name")

        tokens2 = await register(client, "user2@test.com")
        resp = await client.post(
            "/api/v1/auth/onboarding",
            json={
                "username": "taken_name",
                "goal": "目標",
                "timezone": "Asia/Tokyo",
            },
            headers={"Authorization": f"Bearer {tokens2['access_token']}"},
        )
        assert resp.status_code == 400
        assert "already taken" in resp.json()["detail"]

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/onboarding",
            json={"username": "x", "goal": "y"},
        )
        assert resp.status_code == 401

    async def test_empty_username(self, client: AsyncClient):
        tokens = await register(client)
        resp = await client.post(
            "/api/v1/auth/onboarding",
            json={"username": "", "goal": "goal"},
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert resp.status_code == 400

    async def test_creates_goal_record(self, client: AsyncClient):
        """オンボーディング完了時にGoalレコードが作成されること"""
        tokens = await register(client)
        await onboard(client, tokens["access_token"], goal="英語を話せるようになる")
        resp = await client.get(
            "/api/v1/users/me/goals",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert resp.status_code == 200
        goals = resp.json()
        assert len(goals) == 1
        assert goals[0]["title"] == "英語を話せるようになる"
        assert goals[0]["is_active"] is True


# ── リフレッシュ ────────────────────────────────────────────────
class TestRefresh:
    async def test_success(self, client: AsyncClient):
        tokens = await register(client)
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # ローテーション: 新しいトークンが発行される
        assert data["refresh_token"] != tokens["refresh_token"]

    async def test_old_token_revoked_after_rotation(self, client: AsyncClient):
        """使用済みリフレッシュトークンは再利用不可"""
        tokens = await register(client)
        old_refresh = tokens["refresh_token"]

        # 1回目のリフレッシュ
        await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})

        # 古いトークンで再リフレッシュ → 失敗
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh},
        )
        assert resp.status_code == 401

    async def test_replay_attack_revokes_all_tokens(self, client: AsyncClient):
        """
        使用済みトークンを再利用しようとするとそのユーザーの全トークンが失効する
        (盗用検知: トークンが漏洩して第三者が使い回そうとしているケース)
        """
        tokens = await register(client)
        old_refresh = tokens["refresh_token"]

        # 正規の1回目リフレッシュ
        new_tokens = (await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
        )).json()

        # 古いトークンで再試行 → 全トークン失効
        await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})

        # 新しいトークンも使えなくなっている
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": new_tokens["refresh_token"]},
        )
        assert resp.status_code == 401

    async def test_invalid_token(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "totally.invalid.token"},
        )
        assert resp.status_code == 401

    async def test_new_access_token_is_usable(self, client: AsyncClient):
        """リフレッシュで得た新アクセストークンでAPIを呼べること"""
        tokens = await register(client)
        await onboard(client, tokens["access_token"])

        new_tokens = (await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )).json()

        resp = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
        )
        assert resp.status_code == 200


# ── ログアウト ───────────────────────────────────────────────────
class TestLogout:
    async def test_success(self, client: AsyncClient):
        tokens = await register(client)
        resp = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert resp.status_code == 204

    async def test_token_unusable_after_logout(self, client: AsyncClient):
        """ログアウト後はリフレッシュトークンが無効になること"""
        tokens = await register(client)
        await client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})

        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert resp.status_code == 401

    async def test_invalid_token_returns_204(self, client: AsyncClient):
        """無効なトークンでもログアウトは冪等に204を返す"""
        resp = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": "invalid.token.here"},
        )
        assert resp.status_code == 204
