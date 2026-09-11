"""add feedback and score to interview answers

Revision ID: 6e249b1feb73
Revises: 9278195da8d6
Create Date: 2026-08-22 00:43:51.454275

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e249b1feb73'
down_revision: Union[str, Sequence[str], None] = '9278195da8d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "interview_answers",
        sa.Column("ai_feedback", sa.Text(), nullable=True)
    )
    op.add_column(
        "interview_answers",
        sa.Column("score", sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("interview_answers", "score")
    op.drop_column("interview_answers", "ai_feedback")
