"""add created_at to interview_answers

Revision ID: 80e21438a21d
Revises: 6e249b1feb73
Create Date: 2026-08-22 01:07:24.921366

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80e21438a21d'
down_revision: Union[str, Sequence[str], None] = '6e249b1feb73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "interview_answers",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("interview_answers", "created_at")
