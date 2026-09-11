from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)

    interview_question_id = Column(
        Integer,
        ForeignKey("interview_questions.id"),
        nullable=False
    )

    answer_text = Column(
        Text,
        nullable=False
    )

    ai_feedback = Column(
        Text,
        nullable=True
    )

    score = Column(
        Integer,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )