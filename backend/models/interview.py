from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    role = Column(String(100), nullable=False)

    interview_type = Column(
        String(50),
        nullable=False
    )

    difficulty = Column(
        String(30),
        nullable=False
    )
    
    max_questions = Column(Integer, nullable=False, default=5)
    
    time_limit = Column(Integer, default=30, nullable=False)
    
    final_feedback = Column(Text, nullable=True)
    
    final_score = Column(Integer, nullable=True)

    status = Column(
        String(30),
        nullable=False,
        default="created"
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )