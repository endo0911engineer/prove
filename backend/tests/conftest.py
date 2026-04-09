"""
テスト共通設定・フィクスチャ

DB構成:
  - テスト専用DB (prove_test) を使用
  - get_db dependency を override してテストDBのセッションを使用
  - 各テスト前に全テーブルをTRUNCATEして分離を保証
"""
import io
import asyncio
import asyncpg
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text

# ── テストDB設定 ───────────────────────────────────────────
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:password@db:5432/prove_test"
TEST_ASYNCPG_URL = "postgresql://postgres:password@db:5432/prove_test"
POSTGRES_URL = "postgresql://postgres:password@db:5432/postgres"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestingSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)

# ── アプリのget_dbをテストDB向けにoverride ───────────────────
from app.main import app as fastapi_app
from app.db.session import get_db, Base
import app.models  # noqa: F401 – 全モデルをインポートしてcreate_allに含める


async def _override_get_db():
    async with TestingSessionLocal() as session:
        yield session


fastapi_app.dependency_overrides[get_db] = _override_get_db

# ── テスト用定数 ───────────────────────────────────────────
# マジックナンバーだけ正しい最小JEPGバイト列
MINIMAL_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 200
# マジックナンバーだけ正しい最小PNGバイト列
MINIMAL_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200


# ── セッションスコープ: テストDBを1度だけセットアップ (SYNC) ──────
@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """テストDBが存在しない場合は作成し、全テーブルを生成する (sync wrapper)"""
    async def _create():
        raw_conn = await asyncpg.connect(POSTGRES_URL)
        try:
            await raw_conn.execute("CREATE DATABASE prove_test")
        except asyncpg.exceptions.DuplicateDatabaseError:
            pass
        finally:
            await raw_conn.close()
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def _drop():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    asyncio.run(_create())
    yield
    asyncio.run(_drop())


# ── 関数スコープ: 各テスト前にデータを全削除 ────────────────────
@pytest.fixture(autouse=True)
async def clean_tables():
    """各テスト前に全テーブルをTRUNCATEして独立性を保証する"""
    conn = await asyncpg.connect(TEST_ASYNCPG_URL)
    try:
        await conn.execute(
            "TRUNCATE TABLE refresh_tokens, reactions, comments, posts, goals, "
            "goal_achievements, follows, users RESTART IDENTITY CASCADE"
        )
    finally:
        await conn.close()
    yield


# ── レート制限リセット ────────────────────────────────────────
@pytest.fixture(autouse=True)
def reset_rate_limits():
    """テスト間でインメモリレート制限ストレージをリセットする"""
    from app.core.limiter import limiter
    storage = getattr(limiter, "_storage", None)
    if storage is not None:
        raw = getattr(storage, "storage", None)
        if isinstance(raw, dict):
            raw.clear()
    yield


# ── HTTPクライアント ───────────────────────────────────────────
@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=fastapi_app), base_url="http://test"
    ) as ac:
        yield ac


# ── ヘルパー関数 ────────────────────────────────────────────────
async def register(client: AsyncClient, email: str = "user@test.com", password: str = "password123") -> dict:
    resp = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201, resp.text
    return resp.json()


async def onboard(
    client: AsyncClient,
    token: str,
    username: str = "testuser",
    goal: str = "毎日勉強する",
    window_start: int = 0,
    window_end: int = 23,
) -> dict:
    resp = await client.post(
        "/api/v1/auth/onboarding",
        json={
            "username": username,
            "goal": goal,
            "posting_window_start": window_start,
            "posting_window_end": window_end,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


async def create_post(client: AsyncClient, token: str, text: str = "") -> dict:
    data = {"files": {"image": ("test.jpg", io.BytesIO(MINIMAL_JPEG), "image/jpeg")}}
    if text:
        data["data"] = {"text": text}
    resp = await client.post(
        "/api/v1/posts",
        headers={"Authorization": f"Bearer {token}"},
        **data,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── よく使うフィクスチャ ────────────────────────────────────────
@pytest.fixture
async def user_a(client):
    """登録・オンボーディング済みユーザーA"""
    tokens = await register(client, "a@test.com")
    user_data = await onboard(client, tokens["access_token"], username="user_a", goal="プログラミングを学ぶ")
    return {
        "token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "user": user_data,
    }


@pytest.fixture
async def user_b(client):
    """登録・オンボーディング済みユーザーB"""
    tokens = await register(client, "b@test.com")
    user_data = await onboard(client, tokens["access_token"], username="user_b", goal="英語を習得する")
    return {
        "token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "user": user_data,
    }


@pytest.fixture
async def posted_user_a(client, user_a):
    """今日投稿済みのユーザーA"""
    post = await create_post(client, user_a["token"])
    user_a["post"] = post
    return user_a
