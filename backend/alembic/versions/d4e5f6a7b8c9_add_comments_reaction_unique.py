"""add_comments_reaction_unique

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # コメントテーブル作成
    op.create_table(
        'comments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('post_id', sa.String(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # リアクションの重複を除去してからユニーク制約を追加
    # 同一 (user_id, post_id) の重複がある場合、最新1件のみ残す
    op.execute("""
        DELETE FROM reactions
        WHERE id NOT IN (
            SELECT DISTINCT ON (user_id, post_id) id
            FROM reactions
            ORDER BY user_id, post_id, created_at DESC
        )
    """)

    op.create_unique_constraint('uq_reaction_user_post', 'reactions', ['user_id', 'post_id'])


def downgrade() -> None:
    op.drop_constraint('uq_reaction_user_post', 'reactions', type_='unique')
    op.drop_table('comments')
