"""add_tags_and_user_prefs

Revision ID: a1b2c3d4e5f6
Revises: 0c06ee5d0c53
Create Date: 2026-04-01 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '0c06ee5d0c53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('tags', sa.JSON(), server_default='[]', nullable=False))
    op.add_column('users', sa.Column('notification_enabled', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('users', sa.Column('posting_window_start', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('posting_window_end', sa.Integer(), server_default='23', nullable=False))
    op.add_column('users', sa.Column('is_private', sa.Boolean(), server_default='false', nullable=False))
    op.alter_column('users', 'goal', type_=sa.String(200))


def downgrade() -> None:
    op.drop_column('users', 'is_private')
    op.drop_column('users', 'posting_window_end')
    op.drop_column('users', 'posting_window_start')
    op.drop_column('users', 'notification_enabled')
    op.drop_column('users', 'tags')
    op.alter_column('users', 'goal', type_=sa.String(100))
