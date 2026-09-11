"""create interview answers table

Revision ID: e8e795f23c24
Revises: 069bd643d7d2
Create Date: 2026-08-14 16:39:17.005099

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8e795f23c24'
down_revision: Union[str, Sequence[str], None] = '069bd643d7d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interview_answers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "interview_question_id",
            sa.Integer(),
            sa.ForeignKey("interview_questions.id"),
            nullable=False,
        ),
        sa.Column(
            "answer_text",
            sa.Text(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("interview_answers")
