import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models.interview import Interview
from schemas.interview import InterviewCreate, InterviewResponse
from security.dependencies import get_current_user
from models.user import User
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field
from models.interview_question import InterviewQuestion
from models.interview_answer import InterviewAnswer
from AI.interview_engine import (
    evaluate_answer,
    generate_first_question,
    generate_next_question,
    generate_final_feedback,
)

router = APIRouter(prefix="/interviews", tags=["Interviews"])


class SpeechMetrics(BaseModel):
    speaking_duration_seconds: float = Field(default=0, ge=0)
    response_duration_seconds: float = Field(default=0, ge=0)
    word_count: int = Field(default=0, ge=0)
    wpm: float = Field(default=0, ge=0)
    pause_duration_seconds: float = Field(default=0, ge=0)
    filler_word_count: int = Field(default=0, ge=0)


class AnswerSubmitPayload(BaseModel):
    question_id: int
    answer_text: str
    response_mode: Literal["practice", "live"] = "practice"
    speech_metrics: Optional[SpeechMetrics] = None


def save_speech_metrics(db: Session, answer_id: int, payload: AnswerSubmitPayload) -> None:
    """Persist response-mode and speech analytics in the dedicated metrics table."""
    metrics = payload.speech_metrics

    if metrics is None:
        speaking_duration = 0
        response_duration = 0
        word_count = 0
        wpm = 0
        pause_duration = 0
        filler_count = 0
    else:
        speaking_duration = metrics.speaking_duration_seconds
        response_duration = metrics.response_duration_seconds
        word_count = metrics.word_count
        wpm = metrics.wpm
        pause_duration = metrics.pause_duration_seconds
        filler_count = metrics.filler_word_count

    db.execute(
        text(
            """
            INSERT INTO interview_answer_speech_metrics (
                interview_answer_id,
                response_mode,
                speaking_duration_seconds,
                response_duration_seconds,
                word_count,
                wpm,
                pause_duration_seconds,
                filler_word_count
            )
            VALUES (
                :answer_id,
                :response_mode,
                :speaking_duration_seconds,
                :response_duration_seconds,
                :word_count,
                :wpm,
                :pause_duration_seconds,
                :filler_word_count
            )
            ON CONFLICT (interview_answer_id) DO UPDATE SET
                response_mode = EXCLUDED.response_mode,
                speaking_duration_seconds = EXCLUDED.speaking_duration_seconds,
                response_duration_seconds = EXCLUDED.response_duration_seconds,
                word_count = EXCLUDED.word_count,
                wpm = EXCLUDED.wpm,
                pause_duration_seconds = EXCLUDED.pause_duration_seconds,
                filler_word_count = EXCLUDED.filler_word_count
            """
        ),
        {
            "answer_id": answer_id,
            "response_mode": payload.response_mode,
            "speaking_duration_seconds": speaking_duration,
            "response_duration_seconds": response_duration,
            "word_count": word_count,
            "wpm": wpm,
            "pause_duration_seconds": pause_duration,
            "filler_word_count": filler_count,
        },
    )


def get_speech_metrics_map(db: Session, answer_ids: list[int]) -> dict[int, dict]:
    """Load persisted speech metrics for report serialization."""
    if not answer_ids:
        return {}

    rows = db.execute(
        text(
            """
            SELECT
                interview_answer_id,
                response_mode,
                speaking_duration_seconds,
                response_duration_seconds,
                word_count,
                wpm,
                pause_duration_seconds,
                filler_word_count
            FROM interview_answer_speech_metrics
            WHERE interview_answer_id = ANY(:answer_ids)
            """
        ),
        {"answer_ids": answer_ids},
    ).mappings().all()

    return {
        int(row["interview_answer_id"]): {
            "response_mode": row["response_mode"],
            "speech_metrics": {
                "speaking_duration_seconds": float(row["speaking_duration_seconds"] or 0),
                "response_duration_seconds": float(row["response_duration_seconds"] or 0),
                "word_count": int(row["word_count"] or 0),
                "wpm": float(row["wpm"] or 0),
                "pause_duration_seconds": float(row["pause_duration_seconds"] or 0),
                "filler_word_count": int(row["filler_word_count"] or 0),
            },
        }
        for row in rows
    }


@router.post("/", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def create_interview(
    interview: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_interview = Interview(
        user_id=current_user.id,
        role=interview.role,
        interview_type=interview.interview_type,
        difficulty=interview.difficulty,
        max_questions=interview.max_questions,
        time_limit=interview.time_limit,
        status="created",
    )

    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return new_interview


@router.get("/", response_model=list[InterviewResponse])
def get_interviews(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return (
        db.query(Interview)
        .filter(Interview.user_id == current_user.id)
        .order_by(Interview.created_at.desc())
        .all()
    )


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found"
        )
    return interview


@router.patch("/{interview_id}/start", response_model=InterviewResponse)
def start_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found"
        )

    if interview.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed interview cannot be started again",
        )
    if interview.status == "started":
        return interview

    interview.status = "started"
    interview.started_at = datetime.now(timezone.utc)

    # Generate first AI question
    question_text = generate_first_question(
        role=interview.role,
        interview_type=interview.interview_type,
        difficulty=interview.difficulty,
    )

    # Save question in database
    first_question = InterviewQuestion(
        interview_id=interview.id, question_number=1, question_text=question_text
    )

    db.add(first_question)

    db.commit()
    db.refresh(interview)

    return interview


@router.get("/{interview_id}/questions")
def get_interview_questions(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    questions = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.interview_id == interview_id
        )
        .order_by(
            InterviewQuestion.question_number
        )
        .all()
    )

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questions found for this interview",
        )

    return questions


@router.post("/{interview_id}/answers")
def submit_answer(
    interview_id: int,
    answer: AnswerSubmitPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ---------------------------------------------------------
    # 1. Get interview and verify ownership
    # ---------------------------------------------------------
    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    # ---------------------------------------------------------
    # 2. Interview must be active
    # ---------------------------------------------------------
    if interview.status != "started":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview is not currently active",
        )

    # ---------------------------------------------------------
    # 3. Get the question
    # ---------------------------------------------------------
    question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.id == answer.question_id,
            InterviewQuestion.interview_id == interview_id,
        )
        .first()
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found for this interview",
        )

    # ---------------------------------------------------------
    # 4. IDEMPOTENT RECOVERY
    # ---------------------------------------------------------
    # If a previous request successfully saved the answer but
    # failed while generating the next question, do not reject
    # the retry with "already answered". Recover the interview
    # from the persisted answer instead.
    existing_answer = (
        db.query(InterviewAnswer)
        .filter(
            InterviewAnswer.interview_question_id == question.id
        )
        .first()
    )

    if existing_answer:
        # -----------------------------------------------------
        # Existing answer belongs to the final question.
        # Retry final-feedback generation if the previous
        # request failed after saving the answer.
        # -----------------------------------------------------
        if question.question_number >= interview.max_questions:
            if interview.status == "completed":
                return {
                    "message": "Interview already completed",
                    "interview_id": interview.id,
                    "answer": existing_answer,
                    "completed": True,
                    "final_feedback": interview.final_feedback,
                }

            all_questions = (
                db.query(InterviewQuestion)
                .filter(
                    InterviewQuestion.interview_id == interview_id
                )
                .order_by(InterviewQuestion.question_number)
                .all()
            )

            all_answers = (
                db.query(InterviewAnswer)
                .join(
                    InterviewQuestion,
                    InterviewAnswer.interview_question_id
                    == InterviewQuestion.id,
                )
                .filter(
                    InterviewQuestion.interview_id == interview_id
                )
                .order_by(InterviewQuestion.question_number)
                .all()
            )

            questions_and_answers = ""

            for q in all_questions:
                matching_answer = next(
                    (
                        a
                        for a in all_answers
                        if a.interview_question_id == q.id
                    ),
                    None,
                )

                questions_and_answers += f"""
Question {q.question_number}:
{q.question_text}

Candidate Answer:
{
    matching_answer.answer_text
    if matching_answer
    else "No answer provided"
}

Score:
{
    matching_answer.score
    if matching_answer
    else 0
}/10

Individual Feedback:
{
    matching_answer.ai_feedback
    if matching_answer
    else "No feedback available"
}

--------------------------------
"""

            # Calculate the official score from the stored answer scores.
            total_score = sum(float(a.score or 0) for a in all_answers)
            maximum_score = len(all_answers) * 10
            overall_score = (
                (total_score / maximum_score) * 100
                if maximum_score > 0
                else 0
            )
            overall_score = round(max(0, min(100, overall_score)), 2)

            try:
                final_feedback = generate_final_feedback(
                    role=interview.role,
                    interview_type=interview.interview_type,
                    difficulty=interview.difficulty,
                    questions_and_answers=questions_and_answers,
                    overall_score=overall_score,
                )
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Final feedback generation temporarily unavailable: {str(e)}",
                )

            interview.status = "completed"
            interview.completed_at = datetime.now(timezone.utc)
            interview.final_feedback = final_feedback
            db.commit()
            db.refresh(interview)

            return {
                "message": "Interview completed",
                "interview_id": interview.id,
                "answer": existing_answer,
                "completed": True,
                "final_feedback": interview.final_feedback,
            }

        # -----------------------------------------------------
        # Existing non-final answer: return an already-created
        # next question if it exists.
        # -----------------------------------------------------
        next_question_number = question.question_number + 1

        existing_next_question = (
            db.query(InterviewQuestion)
            .filter(
                InterviewQuestion.interview_id == interview_id,
                InterviewQuestion.question_number == next_question_number,
            )
            .first()
        )

        if existing_next_question:
            return {
                "message": "Answer already submitted",
                "answer": existing_answer,
                "next_question": existing_next_question,
                "question_number": existing_next_question.question_number,
                "max_questions": interview.max_questions,
                "completed": False,
            }

        # -----------------------------------------------------
        # Previous request saved the answer but failed before
        # saving the next question. Generate the missing question.
        # -----------------------------------------------------
        try:
            next_question_text = generate_next_question(
                role=interview.role,
                interview_type=interview.interview_type,
                difficulty=interview.difficulty,
                previous_question=question.question_text,
                candidate_answer=existing_answer.answer_text,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Next question generation temporarily unavailable: {str(e)}",
            )

        next_question = InterviewQuestion(
            interview_id=interview_id,
            question_number=next_question_number,
            question_text=next_question_text,
        )

        db.add(next_question)
        db.commit()
        db.refresh(next_question)

        return {
            "message": "Answer recovered successfully",
            "answer": existing_answer,
            "next_question": next_question,
            "question_number": next_question.question_number,
            "max_questions": interview.max_questions,
            "completed": False,
        }

    # ---------------------------------------------------------
    # 5. Evaluate answer using AI
    # ---------------------------------------------------------
    try:
        evaluation = evaluate_answer(
            question=question.question_text,
            answer=answer.answer_text,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI evaluation temporarily unavailable: {str(e)}",
        )

    # ---------------------------------------------------------
    # 6. Validate AI evaluation
    # ---------------------------------------------------------
    if not isinstance(evaluation, dict):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI evaluation returned invalid data",
        )

    ai_feedback = evaluation.get("ai_feedback")
    score = evaluation.get("score")

    if ai_feedback is None:
        ai_feedback = "No feedback generated."

    if score is None:
        score = 0

    try:
        score = int(score)
    except (TypeError, ValueError):
        score = 0

    score = max(0, min(score, 10))

    # ---------------------------------------------------------
    # 7. Prepare answer without committing yet.
    # ---------------------------------------------------------
    new_answer = InterviewAnswer(
        interview_question_id=question.id,
        answer_text=answer.answer_text,
        ai_feedback=ai_feedback,
        score=score,
    )

    # ---------------------------------------------------------
    # 8. Final question
    # ---------------------------------------------------------
    if question.question_number >= interview.max_questions:
        db.add(new_answer)
        db.flush()
        save_speech_metrics(db, new_answer.id, answer)

        all_questions = (
            db.query(InterviewQuestion)
            .filter(
                InterviewQuestion.interview_id == interview_id
            )
            .order_by(InterviewQuestion.question_number)
            .all()
        )

        all_answers = (
            db.query(InterviewAnswer)
            .join(
                InterviewQuestion,
                InterviewAnswer.interview_question_id
                == InterviewQuestion.id,
            )
            .filter(
                InterviewQuestion.interview_id == interview_id
            )
            .order_by(InterviewQuestion.question_number)
            .all()
        )

        questions_and_answers = ""

        for q in all_questions:
            matching_answer = next(
                (
                    a
                    for a in all_answers
                    if a.interview_question_id == q.id
                ),
                None,
            )

            questions_and_answers += f"""
Question {q.question_number}:
{q.question_text}

Candidate Answer:
{
    matching_answer.answer_text
    if matching_answer
    else "No answer provided"
}

Score:
{
    matching_answer.score
    if matching_answer
    else 0
}/10

Individual Feedback:
{
    matching_answer.ai_feedback
    if matching_answer
    else "No feedback available"
}

--------------------------------
"""

        # Calculate the official score from the stored answer scores.
        total_score = sum(float(a.score or 0) for a in all_answers)
        maximum_score = len(all_answers) * 10
        overall_score = (
            (total_score / maximum_score) * 100
            if maximum_score > 0
            else 0
        )
        overall_score = round(max(0, min(100, overall_score)), 2)

        try:
            final_feedback = generate_final_feedback(
                role=interview.role,
                interview_type=interview.interview_type,
                difficulty=interview.difficulty,
                questions_and_answers=questions_and_answers,
                overall_score=overall_score,
            )
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Final feedback generation temporarily unavailable: {str(e)}",
            )

        interview.status = "completed"
        interview.completed_at = datetime.now(timezone.utc)
        interview.final_feedback = final_feedback

        db.commit()
        db.refresh(new_answer)
        db.refresh(interview)

        return {
            "message": "Interview completed",
            "interview_id": interview.id,
            "answer": new_answer,
            "completed": True,
            "final_feedback": interview.final_feedback,
        }

    # ---------------------------------------------------------
    # 9. Generate next question BEFORE committing the answer.
    # ---------------------------------------------------------
    # This prevents the exact bug shown in the screenshot:
    # answer gets committed -> Gemini fails -> API returns 503 ->
    # user retries -> API says question already answered.
    next_question_number = question.question_number + 1

    try:
        next_question_text = generate_next_question(
            role=interview.role,
            interview_type=interview.interview_type,
            difficulty=interview.difficulty,
            previous_question=question.question_text,
            candidate_answer=answer.answer_text,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Next question generation temporarily unavailable: {str(e)}",
        )

    next_question = InterviewQuestion(
        interview_id=interview_id,
        question_number=next_question_number,
        question_text=next_question_text,
    )

    db.add(new_answer)
    db.add(next_question)
    db.flush()
    save_speech_metrics(db, new_answer.id, answer)

    try:
        db.commit()
        db.refresh(new_answer)
        db.refresh(next_question)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to save interview response: {str(e)}",
        )

    return {
        "message": "Answer submitted successfully",
        "answer": new_answer,
        "next_question": next_question,
        "question_number": next_question.question_number,
        "max_questions": interview.max_questions,
        "completed": False,
    }


@router.patch("/{interview_id}/complete", response_model=InterviewResponse)
def complete_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found"
        )

    if interview.status == "created":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview has not been started",
        )

    if interview.status == "started":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview is already started",
        )

    if interview.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed interview cannot be started again",
        )

    interview.status = "completed"
    interview.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(interview)

    return interview



def analyze_delivery_metrics(metrics: dict) -> dict:
    """Compute transparent, heuristic delivery indicators from stored live speech metrics.

    These indicators are descriptive coaching signals only. They are intentionally
    separate from the official interview/technical score.
    """
    metrics = metrics or {}
    words = max(0, int(metrics.get("word_count", 0) or 0))
    wpm = max(0.0, float(metrics.get("wpm", 0) or 0))
    response_seconds = max(0.0, float(metrics.get("response_duration_seconds", 0) or 0))
    speaking_seconds = max(0.0, float(metrics.get("speaking_duration_seconds", 0) or 0))
    pause_seconds = max(0.0, float(metrics.get("pause_duration_seconds", 0) or 0))
    fillers = max(0, int(metrics.get("filler_word_count", 0) or 0))

    filler_rate = (fillers / words * 100) if words > 0 else 0.0
    pause_ratio = (pause_seconds / response_seconds * 100) if response_seconds > 0 else 0.0
    speaking_ratio = (speaking_seconds / response_seconds * 100) if response_seconds > 0 else 0.0

    if wpm <= 0:
        pace_label = "No measurable speech pace"
        pace_status = "no_data"
    elif wpm < 110:
        pace_label = "Slower measured pace"
        pace_status = "slow"
    elif wpm <= 160:
        pace_label = "Comfortable interview pace"
        pace_status = "balanced"
    elif wpm <= 190:
        pace_label = "Fast measured pace"
        pace_status = "fast"
    else:
        pace_label = "Very fast measured pace"
        pace_status = "very_fast"

    if words <= 0:
        length_label = "No response-length data"
        length_status = "no_data"
    elif words < 40:
        length_label = "Short response"
        length_status = "short"
    elif words <= 180:
        length_label = "Moderate response length"
        length_status = "balanced"
    else:
        length_label = "Long response"
        length_status = "long"

    if words <= 0:
        filler_label = "No filler data"
        filler_status = "no_data"
    elif filler_rate <= 2:
        filler_label = "Low filler usage"
        filler_status = "low"
    elif filler_rate <= 5:
        filler_label = "Moderate filler usage"
        filler_status = "moderate"
    else:
        filler_label = "High filler usage"
        filler_status = "high"

    if response_seconds <= 0:
        pause_label = "No pause data"
        pause_status = "no_data"
    elif pause_ratio <= 10:
        pause_label = "Limited pause time"
        pause_status = "low"
    elif pause_ratio <= 25:
        pause_label = "Moderate pause time"
        pause_status = "moderate"
    else:
        pause_label = "High pause proportion"
        pause_status = "high"

    # Transparent heuristic index; never used for the official interview score.
    delivery_score = 100.0
    if wpm <= 0:
        delivery_score -= 20
    elif wpm < 80 or wpm > 190:
        delivery_score -= 10
    elif wpm < 110 or wpm > 160:
        delivery_score -= 5

    if filler_rate > 5:
        delivery_score -= 12
    elif filler_rate > 2:
        delivery_score -= 5

    if pause_ratio > 25:
        delivery_score -= 12
    elif pause_ratio > 10:
        delivery_score -= 5

    if words > 0 and words < 40:
        delivery_score -= 8
    elif words > 180:
        delivery_score -= 5

    delivery_score = round(max(0.0, min(100.0, delivery_score)), 1)

    observations = []
    if pace_status in {"slow", "very_fast", "fast"}:
        observations.append(pace_label + ".")
    elif pace_status == "balanced":
        observations.append("Measured speaking pace stayed within the configured interview range.")

    if filler_status == "high":
        observations.append("Filler-word usage was relatively high for the response length.")
    elif filler_status == "moderate":
        observations.append("Some filler words were detected.")

    if pause_status == "high":
        observations.append("A relatively large share of the response time was spent in pauses.")
    elif pause_status == "moderate":
        observations.append("The response included a noticeable amount of pause time.")

    if length_status == "short":
        observations.append("The response was brief based on word count.")
    elif length_status == "long":
        observations.append("The response was relatively long based on word count.")

    if not observations:
        observations.append("No notable delivery signal was detected by the configured heuristics.")

    return {
        "delivery_score": delivery_score,
        "is_heuristic": True,
        "pace": {"wpm": round(wpm, 1), "label": pace_label, "status": pace_status},
        "filler_usage": {"count": fillers, "rate_percent": round(filler_rate, 2), "label": filler_label, "status": filler_status},
        "pauses": {"seconds": round(pause_seconds, 2), "ratio_percent": round(pause_ratio, 2), "label": pause_label, "status": pause_status},
        "response_length": {"words": words, "label": length_label, "status": length_status},
        "speaking_ratio_percent": round(speaking_ratio, 2),
        "observations": observations,
    }

def build_delivery_summary(live_metrics: list[dict]) -> dict:
    """Aggregate live-response delivery signals for the final report."""
    if not live_metrics:
        return {"available": False, "response_count": 0, "message": "No live speech analytics were recorded."}

    analyses = [analyze_delivery_metrics(item) for item in live_metrics]
    avg_score = sum(item["delivery_score"] for item in analyses) / len(analyses)
    total_words = sum(max(0, int(item.get("word_count", 0) or 0)) for item in live_metrics)
    total_fillers = sum(max(0, int(item.get("filler_word_count", 0) or 0)) for item in live_metrics)
    total_pause = sum(max(0.0, float(item.get("pause_duration_seconds", 0) or 0)) for item in live_metrics)
    total_response = sum(max(0.0, float(item.get("response_duration_seconds", 0) or 0)) for item in live_metrics)
    avg_wpm = sum(max(0.0, float(item.get("wpm", 0) or 0)) for item in live_metrics) / len(live_metrics)
    filler_rate = (total_fillers / total_words * 100) if total_words else 0.0
    pause_ratio = (total_pause / total_response * 100) if total_response else 0.0

    focus_areas = []
    if avg_wpm < 110 and avg_wpm > 0:
        focus_areas.append("speaking pace")
    elif avg_wpm > 160:
        focus_areas.append("speaking pace control")
    if filler_rate > 5:
        focus_areas.append("filler-word reduction")
    if pause_ratio > 25:
        focus_areas.append("pause management")

    return {
        "available": True,
        "response_count": len(live_metrics),
        "delivery_score": round(avg_score, 1),
        "average_wpm": round(avg_wpm, 1),
        "total_words": total_words,
        "total_filler_words": total_fillers,
        "filler_rate_percent": round(filler_rate, 2),
        "total_pause_seconds": round(total_pause, 2),
        "pause_ratio_percent": round(pause_ratio, 2),
        "focus_areas": focus_areas,
        "method": "Transparent browser speech-metric heuristics; not part of the official interview score.",
    }


def build_interview_intelligence(
    overall_score: float,
    answers: list[dict],
    final_feedback: dict,
    delivery_summary: dict,
    interview_type: str,
    difficulty: str,
) -> dict:
    """Build the complete interview-level coaching profile.

    This layer does not change the official interview score. It combines the
    stored answer scores, existing AI-generated final feedback, question-level
    data, and optional live delivery analytics into a separate coaching view.
    """
    safe_answers = answers or []
    count = len(safe_answers)

    avg_answer = (
        sum(float(item.get("score", 0) or 0) for item in safe_answers) / count
        if count else 0.0
    )

    high_scores = [item for item in safe_answers if float(item.get("score", 0) or 0) >= 8]
    low_scores = [item for item in safe_answers if float(item.get("score", 0) or 0) < 6]

    technical = final_feedback.get("technical") if isinstance(final_feedback.get("technical"), dict) else {}
    communication = final_feedback.get("communication") if isinstance(final_feedback.get("communication"), dict) else {}

    technical_score = float(technical.get("score", 0) or 0)
    communication_score = float(communication.get("score", 0) or 0)

    # Readiness is a separate coaching metric, never the official score.
    readiness_components = [overall_score]
    if technical_score > 0:
        readiness_components.append(technical_score * 10)
    if communication_score > 0:
        readiness_components.append(communication_score * 10)
    if delivery_summary.get("available"):
        readiness_components.append(float(delivery_summary.get("delivery_score", 0) or 0))

    overall_readiness = round(sum(readiness_components) / len(readiness_components), 1) if readiness_components else 0.0

    def readiness_label(value: float) -> str:
        if value >= 90:
            return "Interview Ready"
        if value >= 75:
            return "Nearly Ready"
        if value >= 60:
            return "Building Readiness"
        return "Needs More Practice"

    strengths = []
    focus_areas = []

    if overall_score >= 75:
        strengths.append("Strong overall interview performance")
    elif overall_score < 60:
        focus_areas.append("Raise consistency across interview responses")

    if technical_score >= 8:
        strengths.append("Technical knowledge and answer quality")
    elif technical_score > 0 and technical_score < 6:
        focus_areas.append("Technical depth and correctness")

    if communication_score >= 8:
        strengths.append("Clear communication and explanation")
    elif communication_score > 0 and communication_score < 6:
        focus_areas.append("Clarity and structure of explanations")

    if high_scores:
        strengths.append(f"{len(high_scores)} response{'s' if len(high_scores) != 1 else ''} scored 8/10 or higher")
    if low_scores:
        focus_areas.append(f"Review {len(low_scores)} lower-scoring response{'s' if len(low_scores) != 1 else ''}")

    if delivery_summary.get("available"):
        delivery_score = float(delivery_summary.get("delivery_score", 0) or 0)
        if delivery_score >= 80:
            strengths.append("Consistent live delivery signals")
        elif delivery_score < 65:
            focus_areas.append("Improve live response delivery")
        for area in delivery_summary.get("focus_areas", []) or []:
            if area not in focus_areas:
                focus_areas.append(area)

    # Reuse the AI-generated final feedback when it already provides explicit
    # strengths/improvements, while keeping the response compact and safe.
    ai_strengths = final_feedback.get("strengths", [])
    ai_improvements = final_feedback.get("improvements", [])
    if isinstance(ai_strengths, list):
        for value in ai_strengths[:4]:
            text_value = str(value).strip()
            if text_value and text_value not in strengths:
                strengths.append(text_value)
    if isinstance(ai_improvements, list):
        for value in ai_improvements[:4]:
            text_value = str(value).strip()
            if text_value and text_value not in focus_areas:
                focus_areas.append(text_value)

    strengths = strengths[:6]
    focus_areas = focus_areas[:6]

    difficulty_distribution = {}
    for item in safe_answers:
        label = str(item.get("difficulty") or difficulty or "unknown").lower()
        difficulty_distribution.setdefault(label, {"count": 0, "total_score": 0.0})
        difficulty_distribution[label]["count"] += 1
        difficulty_distribution[label]["total_score"] += float(item.get("score", 0) or 0)

    difficulty_analysis = []
    for label, values in difficulty_distribution.items():
        avg = values["total_score"] / values["count"] if values["count"] else 0
        difficulty_analysis.append({
            "difficulty": label,
            "responses": values["count"],
            "average_score": round(avg, 1),
        })

    coaching_summary = (
        f"For this {difficulty or 'adaptive'} {interview_type or 'interview'}, "
        f"you completed {count} response{'s' if count != 1 else ''} with an average answer score of "
        f"{avg_answer:.1f}/10. Your interview readiness profile is {overall_readiness:.0f}/100. "
    )
    if focus_areas:
        coaching_summary += "Prioritize " + ", ".join(focus_areas[:3]) + "."
    elif strengths:
        coaching_summary += "Maintain the strengths shown across your strongest responses."
    else:
        coaching_summary += "Complete more interviews to build a stronger performance baseline."

    return {
        "available": True,
        "version": "2.3",
        "method": "Interview-level coaching analytics combining stored answer scores, existing AI feedback, question data, and optional live delivery metrics.",
        "official_score_unchanged": True,
        "technical_readiness": round(max(0, min(100, technical_score * 10)), 1),
        "communication_readiness": round(max(0, min(100, communication_score * 10)), 1),
        "problem_solving_readiness": round(max(0, min(100, avg_answer * 10)), 1),
        "delivery_readiness": round(max(0, min(100, float(delivery_summary.get("delivery_score", 0) or 0))), 1) if delivery_summary.get("available") else None,
        "overall_readiness": overall_readiness,
        "readiness_label": readiness_label(overall_readiness),
        "average_answer_score": round(avg_answer, 1),
        "responses_analyzed": count,
        "strengths": strengths,
        "focus_areas": focus_areas,
        "difficulty_analysis": difficulty_analysis,
        "coaching_summary": coaching_summary,
    }

@router.get("/{interview_id}/result")
def get_interview_result(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the complete interview report data.

    The frontend report depends on BOTH the structured final AI feedback
    and the question-by-question answer records.  Keep the database answer
    scores authoritative for the overall score.
    """

    interview = (
        db.query(Interview)
        .filter(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview_id)
        .order_by(InterviewQuestion.question_number)
        .all()
    )

    answer_rows = (
        db.query(InterviewAnswer, InterviewQuestion)
        .join(
            InterviewQuestion,
            InterviewAnswer.interview_question_id == InterviewQuestion.id,
        )
        .filter(InterviewQuestion.interview_id == interview_id)
        .order_by(InterviewQuestion.question_number)
        .all()
    )

    answered_questions = len(answer_rows)
    total_questions = interview.max_questions

    # ---------------------------------------------------------
    # Official score: ALWAYS calculated from stored answer scores.
    # ---------------------------------------------------------
    total_score = sum(
        float(answer.score or 0)
        for answer, question in answer_rows
    )

    maximum_score = answered_questions * 10

    overall_score = (
        (total_score / maximum_score) * 100
        if maximum_score > 0
        else 0
    )
    overall_score = round(max(0, min(100, overall_score)), 2)

    if overall_score >= 90:
        performance_label = "Outstanding Performance"
    elif overall_score >= 75:
        performance_label = "Strong Performance"
    elif overall_score >= 60:
        performance_label = "Good Performance"
    elif overall_score >= 40:
        performance_label = "Developing Performance"
    else:
        performance_label = "Needs Practice"

    # ---------------------------------------------------------
    # Parse structured final AI feedback safely.
    # ---------------------------------------------------------
    final_feedback = interview.final_feedback

    if isinstance(final_feedback, str):
        cleaned = final_feedback.strip()

        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        try:
            final_feedback = json.loads(cleaned.strip())
        except (json.JSONDecodeError, TypeError, ValueError):
            final_feedback = {}

    if not isinstance(final_feedback, dict):
        final_feedback = {}

    # Never allow an old/stale AI score to override the official score.
    final_feedback["overall_score"] = overall_score
    final_feedback["headline"] = performance_label

    # ---------------------------------------------------------
    # Load persisted response-mode / speech analytics.
    # ---------------------------------------------------------
    answer_ids = [answer.id for answer, question in answer_rows]
    speech_metrics_map = get_speech_metrics_map(db, answer_ids)

    # ---------------------------------------------------------
    # Complete question-by-question report + delivery analytics.
    # ---------------------------------------------------------
    report_answers = []
    live_metrics_for_summary = []

    for answer, question in answer_rows:
        metric_record = speech_metrics_map.get(answer.id, {})
        response_mode = metric_record.get("response_mode", "practice")
        speech_metrics = metric_record.get(
            "speech_metrics",
            {
                "speaking_duration_seconds": 0,
                "response_duration_seconds": 0,
                "word_count": 0,
                "wpm": 0,
                "pause_duration_seconds": 0,
                "filler_word_count": 0,
            },
        )

        delivery_analytics = None
        if response_mode == "live":
            delivery_analytics = analyze_delivery_metrics(speech_metrics)
            live_metrics_for_summary.append(speech_metrics)

        report_answers.append({
            "id": answer.id,
            "question_id": question.id,
            "question_number": question.question_number,
            "question_text": question.question_text,
            "answer_text": answer.answer_text,
            "score": float(answer.score or 0),
            "difficulty": interview.difficulty,
            "feedback": answer.ai_feedback or "No feedback available.",
            "response_mode": response_mode,
            "speech_metrics": speech_metrics,
            "delivery_analytics": delivery_analytics,
        })

    delivery_summary = build_delivery_summary(live_metrics_for_summary)

    intelligence = build_interview_intelligence(
        overall_score=overall_score,
        answers=report_answers,
        final_feedback=final_feedback,
        delivery_summary=delivery_summary,
        interview_type=interview.interview_type,
        difficulty=interview.difficulty,
    )

    return {
        "interview_id": interview.id,
        "status": interview.status,
        "role": interview.role,
        "interview_type": interview.interview_type,
        "difficulty": interview.difficulty,
        "time_limit": interview.time_limit,
        "total_questions": total_questions,
        "answered_questions": answered_questions,
        "total_score": total_score,
        "maximum_score": maximum_score,
        "percentage": overall_score,
        "overall_score": overall_score,
        "performance_label": performance_label,
        "feedback": final_feedback,
        "final_feedback": final_feedback,
        "delivery_summary": delivery_summary,
        "interview_intelligence": intelligence,
        "answers": report_answers,
    }