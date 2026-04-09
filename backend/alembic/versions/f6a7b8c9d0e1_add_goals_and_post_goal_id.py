"""add goals table and post goal_id

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # goalsテーブル作成
    op.create_table(
        'goals',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('achieved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    # postsにgoal_idカラムを追加
    op.add_column('posts', sa.Column('goal_id', sa.String(), nullable=True))
    op.create_foreign_key('fk_posts_goal_id', 'posts', 'goals', ['goal_id'], ['id'])

    # 既存ユーザーのgoalテキストからGoalレコードを作成し、投稿を紐付け
    op.execute("""
        INSERT INTO goals (id, user_id, title, is_active, achieved_at, created_at)
        SELECT
            gen_random_uuid()::text,
            id,
            CASE WHEN goal = '' THEN '目標未設定' ELSE goal END,
            true,
            NULL,
            created_at
        FROM users
        WHERE is_onboarding_complete = true
    """)

    # 既存投稿を各ユーザーのアクティブなGoalに紐付け
    op.execute("""
        UPDATE posts
        SET goal_id = goals.id
        FROM goals
        WHERE goals.user_id = posts.user_id
          AND goals.is_active = true
    """)


def downgrade() -> None:
    op.drop_constraint('fk_posts_goal_id', 'posts', type_='foreignkey')
    op.drop_column('posts', 'goal_id')
    op.drop_table('goals')
