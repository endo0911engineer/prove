"""google_auth_onboarding

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-02 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('google_id', sa.String(255), nullable=True))
    op.create_unique_constraint('uq_users_google_id', 'users', ['google_id'])
    op.add_column('users', sa.Column('is_onboarding_complete', sa.Boolean(), server_default='false', nullable=False))
    op.alter_column('users', 'hashed_password', nullable=True)
    op.alter_column('users', 'goal', server_default='', nullable=False)


def downgrade() -> None:
    op.drop_constraint('uq_users_google_id', 'users', type_='unique')
    op.drop_column('users', 'google_id')
    op.drop_column('users', 'is_onboarding_complete')
    op.alter_column('users', 'hashed_password', nullable=False)
