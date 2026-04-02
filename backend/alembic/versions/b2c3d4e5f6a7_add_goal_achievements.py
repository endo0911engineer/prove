"""add_goal_achievements

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-01 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'goal_achievements',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('goal_text', sa.String(200), nullable=False),
        sa.Column('comment', sa.String(300), nullable=True),
        sa.Column('proof_post_id', sa.String(), sa.ForeignKey('posts.id'), nullable=True),
        sa.Column('is_public', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('achieved_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_goal_achievements_user_id', 'goal_achievements', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_goal_achievements_user_id', 'goal_achievements')
    op.drop_table('goal_achievements')
