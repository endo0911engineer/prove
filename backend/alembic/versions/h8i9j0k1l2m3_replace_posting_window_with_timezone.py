"""replace_posting_window_with_timezone

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-04-29 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'h8i9j0k1l2m3'
down_revision: Union[str, None] = 'g7h8i9j0k1l2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('users', 'posting_window_start')
    op.drop_column('users', 'posting_window_end')
    op.add_column('users', sa.Column('timezone', sa.String(100), server_default='Asia/Tokyo', nullable=False))
    op.add_column('users', sa.Column('reminder_hour', sa.Integer(), server_default='21', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'reminder_hour')
    op.drop_column('users', 'timezone')
    op.add_column('users', sa.Column('posting_window_end', sa.Integer(), server_default='23', nullable=False))
    op.add_column('users', sa.Column('posting_window_start', sa.Integer(), server_default='0', nullable=False))
