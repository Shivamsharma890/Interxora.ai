"""create interview answers table

Revision ID: 9278195da8d6
Revises: 53583e1fff67
Create Date: 2026-08-22 00:07:59.004607

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9278195da8d6'
down_revision: Union[str, Sequence[str], None] = '53583e1fff67'
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

