"""add interview speech analytics

Revision ID: b30c3773ec9a
Revises: c427a22ec329
Create Date: 2026-09-14 23:50:52.731561

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b30c3773ec9a'
down_revision: Union[str, Sequence[str], None] = 'c427a22ec329'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute(
        """
        CREATE TABLE interview_answer_speech_metrics (
            id SERIAL PRIMARY KEY,
            interview_answer_id INTEGER NOT NULL UNIQUE,
            response_mode VARCHAR(20) NOT NULL DEFAULT 'practice',
            speaking_duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
            response_duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
            word_count INTEGER NOT NULL DEFAULT 0,
            wpm DOUBLE PRECISION NOT NULL DEFAULT 0,
            pause_duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
            filler_word_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT fk_interview_answer_speech_metrics_answer
                FOREIGN KEY (interview_answer_id)
                REFERENCES interview_answers (id)
                ON DELETE CASCADE,

            CONSTRAINT ck_interview_answer_speech_metrics_mode
                CHECK (response_mode IN ('practice', 'live')),

            CONSTRAINT ck_interview_answer_speech_metrics_non_negative
                CHECK (
                    speaking_duration_seconds >= 0 AND
                    response_duration_seconds >= 0 AND
                    word_count >= 0 AND
                    wpm >= 0 AND
                    pause_duration_seconds >= 0 AND
                    filler_word_count >= 0
                )
        )
        """
    )

    op.execute(
        """
        CREATE INDEX ix_interview_answer_speech_metrics_response_mode
        ON interview_answer_speech_metrics (response_mode)
        """
    )

    op.execute(
        """
        CREATE INDEX ix_interview_answer_speech_metrics_answer_id
        ON interview_answer_speech_metrics (interview_answer_id)
        """
    )


def downgrade():
    op.execute(
        "DROP INDEX IF EXISTS ix_interview_answer_speech_metrics_answer_id"
    )

    op.execute(
        "DROP INDEX IF EXISTS ix_interview_answer_speech_metrics_response_mode"
    )

    op.execute(
        "DROP TABLE IF EXISTS interview_answer_speech_metrics"
    )
