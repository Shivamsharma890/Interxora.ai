"""add feedback score and created at to interview answers

Revision ID: 476ed56dfcc6
Revises: e8e795f23c24
Create Date: 2026-08-14 17:10:06.794416

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '476ed56dfcc6'
down_revision: Union[str, Sequence[str], None] = 'e8e795f23c24'
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

    op.add_column(
        "interview_answers",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False
        )
    )


def downgrade() -> None:
    op.drop_column("interview_answers", "created_at")
    op.drop_column("interview_answers", "score")
    op.drop_column("interview_answers", "ai_feedback")
