from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class InterviewCreate(BaseModel):
    role: str
    interview_type: str
    difficulty: str
    max_questions: int = Field(5, ge = 1, le = 20)
    time_limit: int = Field(30, ge = 1, le = 120)


class InterviewResponse(BaseModel):
    id: int
    user_id: int
    role: str
    interview_type: str
    difficulty: str
    max_questions: int
    time_limit: int
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime | None
    final_feedback: str | None
    model_config = ConfigDict(from_attributes=True)
    

class AnswerSubmit(BaseModel):
    question_id: int
    answer_text: str