# import json
# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from database import get_db
# from models.interview import Interview
# from schemas.interview import InterviewCreate, InterviewResponse, AnswerSubmit
# from security.dependencies import get_current_user
# from models.user import User
# from datetime import datetime, timezone
# from models.interview_question import InterviewQuestion
# from models.interview_answer import InterviewAnswer
# from AI.interview_engine import (
#     evaluate_answer,
#     generate_first_question,
#     generate_next_question,
#     generate_final_feedback,
# )

# router = APIRouter(prefix="/interviews", tags=["Interviews"])


# @router.post("/", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
# def create_interview(
#     interview: InterviewCreate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     new_interview = Interview(
#         user_id=current_user.id,
#         role=interview.role,
#         interview_type=interview.interview_type,
#         difficulty=interview.difficulty,
#         max_questions=interview.max_questions,
#         time_limit=interview.time_limit,
#         status="created",
#     )

#     db.add(new_interview)
#     db.commit()
#     db.refresh(new_interview)

#     return new_interview


# @router.get("/", response_model=list[InterviewResponse])
# def get_interviews(
#     db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
# ):
#     return (
#         db.query(Interview)
#         .filter(Interview.user_id == current_user.id)
#         .order_by(Interview.created_at.desc())
#         .all()
#     )


# @router.get("/{interview_id}", response_model=InterviewResponse)
# def get_interview(
#     interview_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     interview = (
#         db.query(Interview)
#         .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
#         .first()
#     )

#     if not interview:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found"
#         )
#     return interview


# @router.patch("/{interview_id}/start", response_model=InterviewResponse)
# def start_interview(
#     interview_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     interview = (
#         db.query(Interview)
#         .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
#         .first()
#     )

#     if not interview:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found"
#         )

#     if interview.status == "completed":
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Completed interview cannot be started again",
#         )
#     if interview.status == "started":
#         return interview

#     interview.status = "started"
#     interview.started_at = datetime.now(timezone.utc)

#     # Generate first AI question
#     question_text = generate_first_question(
#         role=interview.role,
#         interview_type=interview.interview_type,
#         difficulty=interview.difficulty,
#     )

#     # Save question in database
#     first_question = InterviewQuestion(
#         interview_id=interview.id, question_number=1, question_text=question_text
#     )

#     db.add(first_question)

#     db.commit()
#     db.refresh(interview)

#     return interview


# @router.get("/{interview_id}/questions")
# def get_interview_questions(
#     interview_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     interview = (
#         db.query(Interview)
#         .filter(
#             Interview.id == interview_id,
#             Interview.user_id == current_user.id,
#         )
#         .first()
#     )

#     if not interview:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Interview not found",
#         )

#     questions = (
#         db.query(InterviewQuestion)
#         .filter(InterviewQuestion.interview_id == interview_id)
#         .order_by(InterviewQuestion.question_number)
#         .all()
#     )

#     if not questions:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="No questions found for this interview",
#         )

#     return questions


# @router.post("/{interview_id}/answers")
# def submit_answer(
#     interview_id: int,
#     answer: AnswerSubmit,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     # ---------------------------------------------------------
#     # 1. Get interview and verify ownership
#     # ---------------------------------------------------------
#     interview = (
#         db.query(Interview)
#         .filter(
#             Interview.id == interview_id,
#             Interview.user_id == current_user.id,
#         )
#         .first()
#     )

#     if not interview:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Interview not found",
#         )

#     # ---------------------------------------------------------
#     # 2. Interview must be active
#     # ---------------------------------------------------------
#     if interview.status != "started":
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Interview is not currently active",
#         )

#     # ---------------------------------------------------------
#     # 3. Get the question
#     # ---------------------------------------------------------
#     question = (
#         db.query(InterviewQuestion)
#         .filter(
#             InterviewQuestion.id == answer.question_id,
#             InterviewQuestion.interview_id == interview_id,
#         )
#         .first()
#     )

#     if not question:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Question not found for this interview",
#         )

#     # ---------------------------------------------------------
#     # 4. Prevent answering the same question twice
#     # ---------------------------------------------------------
#     existing_answer = (
#         db.query(InterviewAnswer)
#         .filter(InterviewAnswer.interview_question_id == question.id)
#         .first()
#     )

#     if existing_answer:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="This question has already been answered",
#         )

#     # ---------------------------------------------------------
#     # 5. Evaluate answer using AI
#     # ---------------------------------------------------------
#     try:
#         evaluation = evaluate_answer(
#             question=question.question_text,
#             answer=answer.answer_text,
#         )
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"AI evaluation failed: {str(e)}",
#         )

#     # ---------------------------------------------------------
#     # 6. Validate AI evaluation
#     # ---------------------------------------------------------
#     if not isinstance(evaluation, dict):
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail="AI evaluation returned invalid data",
#         )

#     ai_feedback = evaluation.get("ai_feedback")
#     score = evaluation.get("score")

#     if ai_feedback is None:
#         ai_feedback = "No feedback generated."

#     if score is None:
#         score = 0

#     try:
#         score = int(score)
#     except (TypeError, ValueError):
#         score = 0

#     # Keep score between 0 and 10
#     score = max(0, min(score, 10))

#     # ---------------------------------------------------------
#     # 7. Save answer
#     # ---------------------------------------------------------
#     new_answer = InterviewAnswer(
#         interview_question_id=question.id,
#         answer_text=answer.answer_text,
#         ai_feedback=ai_feedback,
#         score=score,
#     )

#     db.add(new_answer)
#     db.commit()
#     db.refresh(new_answer)

#     # ---------------------------------------------------------
#     # 8. Check whether this was the final question
#     # ---------------------------------------------------------
#     if question.question_number >= interview.max_questions:

#         # -----------------------------------------------------
#         # Get ALL questions
#         # -----------------------------------------------------
#         all_questions = (
#             db.query(InterviewQuestion)
#             .filter(InterviewQuestion.interview_id == interview_id)
#             .order_by(InterviewQuestion.question_number)
#             .all()
#         )

#         # -----------------------------------------------------
#         # Get ALL answers
#         # -----------------------------------------------------
#         all_answers = (
#             db.query(InterviewAnswer)
#             .join(
#                 InterviewQuestion,
#                 InterviewAnswer.interview_question_id == InterviewQuestion.id,
#             )
#             .filter(InterviewQuestion.interview_id == interview_id)
#             .order_by(InterviewQuestion.question_number)
#             .all()
#         )

#         # -----------------------------------------------------
#         # Build Q&A history
#         # -----------------------------------------------------
#         questions_and_answers = ""

#         for q in all_questions:

#             matching_answer = next(
#                 (a for a in all_answers if a.interview_question_id == q.id),
#                 None,
#             )

#             questions_and_answers += f"""
# Question {q.question_number}:
# {q.question_text}

# Candidate Answer:
# {
#     matching_answer.answer_text
#     if matching_answer
#     else "No answer provided"
# }

# Score:
# {
#     matching_answer.score
#     if matching_answer
#     else 0
# }/10

# Individual Feedback:
# {
#     matching_answer.ai_feedback
#     if matching_answer
#     else "No feedback available"
# }


# --------------------------------
# """
#         # Calculate official interview score
#         all_answers = (
#           db.query(InterviewAnswer)
#           .join(
#           InterviewQuestion,
#           InterviewAnswer.interview_question_id == InterviewQuestion.id
#         )
#         .filter(InterviewQuestion.interview_id == interview_id)
#         .all()
#     )

#         # Calculate answer score
#         total_score = sum(float(answer.score or 0) for answer in all_answers)

#         maximum_score = len(all_answers) * 10

#         if maximum_score > 0:
#             overall_score = (
#         total_score / maximum_score
#     ) * 100
#         else:
#             overall_score = 0

#         overall_score = round(
#     max(0, min(100, overall_score)),
#     2
# )

#         # -----------------------------------------------------
#         # Generate final AI feedback
#         # -----------------------------------------------------
#         try:
#             final_feedback = generate_final_feedback(
#                 role=interview.role,
#                 interview_type=interview.interview_type,
#                 difficulty=interview.difficulty,
#                 questions_and_answers=questions_and_answers,
#                 overall_score=overall_score
#             )
#         except Exception as e:
#             db.rollback()

#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Final feedback generation failed: {str(e)}",
#             )

#         # -----------------------------------------------------
#         # Complete interview
#         # -----------------------------------------------------
#         interview.status = "completed"
#         interview.completed_at = datetime.now(timezone.utc)
#         interview.final_feedback = final_feedback

#         db.commit()
#         db.refresh(interview)

#         return {
#             "message": "Interview completed",
#             "interview_id": interview.id,
#             "answer": new_answer,
#             "completed": True,
#             "final_feedback": interview.final_feedback,
#         }

#     # ---------------------------------------------------------
#     # 9. NOT final question -> generate next question
#     # ---------------------------------------------------------

#     try:
#         next_question_text = generate_next_question(
#             role=interview.role,
#             interview_type=interview.interview_type,
#             difficulty=interview.difficulty,
#             previous_question=question.question_text,
#             candidate_answer=answer.answer_text,
#         )
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Next question generation failed: {str(e)}",
#         )

#     # ---------------------------------------------------------
#     # 10. Get next question number
#     # ---------------------------------------------------------
#     next_question_number = question.question_number + 1

#     # ---------------------------------------------------------
#     # 11. Save next question
#     # ---------------------------------------------------------
#     next_question = InterviewQuestion(
#         interview_id=interview_id,
#         question_number=next_question_number,
#         question_text=next_question_text,
#     )

#     db.add(next_question)
#     db.commit()
#     db.refresh(next_question)

#     # ---------------------------------------------------------
#     # 12. Return next question
#     # ---------------------------------------------------------
#     return {
#         "message": "Answer submitted successfully",
#         "answer": new_answer,
#         "next_question": next_question,
#         "question_number": next_question.question_number,
#         "max_questions": interview.max_questions,
#         "completed": False,
#     }


# @router.patch("/{interview_id}/complete", response_model=InterviewResponse)
# def complete_interview(
#     interview_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     interview = (
#         db.query(Interview)
#         .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
#         .first()
#     )

#     if not interview:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found"
#         )

#     if interview.status == "created":
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Interview has not been started",
#         )

#     if interview.status == "started":
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Interview is already started",
#         )

#     if interview.status == "completed":
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Completed interview cannot be started again",
#         )

#     interview.status = "completed"
#     interview.completed_at = datetime.now(timezone.utc)

#     db.commit()
#     db.refresh(interview)

#     return interview


# # @router.get("/{interview_id}/result")
# # def get_interview_result(
# #     interview_id: int,
# #     db: Session = Depends(get_db),
# #     current_user: User = Depends(get_current_user),
# # ):
# #     # Get interview
# #     interview = (
# #         db.query(Interview)
# #         .filter(Interview.id == interview_id, Interview.user_id == current_user.id)
# #         .first()
# #     )

# #     if not interview:
# #         raise HTTPException(
# #             status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found"
# #         )

# #     # Get all questions
# #     questions = (
# #         db.query(InterviewQuestion)
# #         .filter(InterviewQuestion.interview_id == interview_id)
# #         .order_by(InterviewQuestion.question_number)
# #         .all()
# #     )

# #     # Get all answers
# #     answers = (
# #         db.query(InterviewAnswer)
# #         .join(
# #             InterviewQuestion,
# #             InterviewAnswer.interview_question_id == InterviewQuestion.id,
# #         )
# #         .filter(InterviewQuestion.interview_id == interview_id)
# #         .all()
# #     )

# #     # Calculate score
# #     total_score = sum(answer.score or 0 for answer in answers)

# #     maximum_score = len(answers) * 10

# #     percentage = (total_score / maximum_score) * 100 if maximum_score > 0 else 0

# #     # Collect AI feedback
# #     feedback = []

# #     for answer in answers:
# #         if answer.ai_feedback:
# #             feedback.append(answer.ai_feedback)

# #     return {
# #         "interview_id": interview.id,
# #         "status": interview.status,
# #         "total_questions": interview.max_questions,
# #         "answered_questions": len(answers),
# #         "total_score": total_score,
# #         "maximum_score": maximum_score,
# #         "percentage": round(percentage, 2),
# #         "feedback": feedback,
# #     }


# # @router.get("/{interview_id}/result")
# # def get_interview_result(
# #     interview_id: int,
# #     db: Session = Depends(get_db),
# #     current_user: User = Depends(get_current_user),
# # ):
# #     # ---------------------------------------------------------
# #     # 1. Get interview
# #     # ---------------------------------------------------------
# #     interview = (
# #         db.query(Interview)
# #         .filter(
# #             Interview.id == interview_id,
# #             Interview.user_id == current_user.id,
# #         )
# #         .first()
# #     )

# #     if not interview:
# #         raise HTTPException(
# #             status_code=status.HTTP_404_NOT_FOUND,
# #             detail="Interview not found",
# #         )

# #     # ---------------------------------------------------------
# #     # 2. Get all answers
# #     # ---------------------------------------------------------
# #     answers = (
# #         db.query(InterviewAnswer)
# #         .join(
# #             InterviewQuestion,
# #             InterviewAnswer.interview_question_id == InterviewQuestion.id,
# #         )
# #         .filter(
# #             InterviewQuestion.interview_id == interview_id
# #         )
# #         .order_by(InterviewQuestion.question_number)
# #         .all()
# #     )

# #     # ---------------------------------------------------------
# #     # 3. Basic statistics
# #     # ---------------------------------------------------------
# #     answered_questions = len(answers)
# #     total_questions = interview.max_questions

# #     # ---------------------------------------------------------
# #     # 4. Parse final AI feedback
# #     # ---------------------------------------------------------
# #     final_feedback = parse_final_feedback(
# #         interview.final_feedback
# #     )

# #     # ---------------------------------------------------------
# #     # 5. IMPORTANT:
# #     #    Calculate the OFFICIAL score ONLY from
# #     #    the actual answer scores stored in database.
# #     #
# #     #    NEVER use:
# #     #    final_feedback["overall_score"]
# #     # ---------------------------------------------------------
# #     total_score = sum(
# #         float(answer.score or 0)
# #         for answer in answers
# #     )

# #     maximum_score = len(answers) * 10

# #     if maximum_score > 0:
# #         overall_score = (
# #             total_score / maximum_score
# #         ) * 100
# #     else:
# #         overall_score = 0

# #     # Keep score safely between 0 and 100
# #     overall_score = round(
# #         max(0, min(100, overall_score)),
# #         2
# #     )

# #     # ---------------------------------------------------------
# #     # 6. Performance label
# #     # ---------------------------------------------------------
# #     if overall_score >= 90:
# #         performance_label = "Outstanding Performance"

# #     elif overall_score >= 75:
# #         performance_label = "Strong Performance"

# #     elif overall_score >= 60:
# #         performance_label = "Good Performance"

# #     elif overall_score >= 40:
# #         performance_label = "Developing Performance"

# #     else:
# #         performance_label = "Needs Practice"

# #     # ---------------------------------------------------------
# #     # 7. Make AI feedback consistent with official score
# #     #
# #     # This also fixes old interviews whose saved AI feedback
# #     # still contains an old overall_score such as 20.
# #     # ---------------------------------------------------------
# #     final_feedback["overall_score"] = overall_score

# #     # Keep the headline consistent too
# #     final_feedback["headline"] = performance_label

# #     # ---------------------------------------------------------
# #     # 8. Return ONE authoritative score
# #     # ---------------------------------------------------------
# #     return {
# #         "interview_id": interview.id,
# #         "status": interview.status,
# #         "total_questions": total_questions,
# #         "answered_questions": answered_questions,

# #         # OFFICIAL SCORE
# #         "percentage": overall_score,
# #         "overall_score": overall_score,
# #         "performance_label": performance_label,

# #         # AI feedback
# #         "feedback": final_feedback,

# #         # Individual answers
# #         "answers": [
# #             {
# #                 "id": answer.id,
# #                 "question_id": answer.interview_question_id,
# #                 "question_text": next(
# #                    (
# #                       q.question_text
# #                       for q in interview.questions
# #                       if q.id == answer.interview_question_id
# #                     ),
# #                     "Question unavailable",
# #                 ),
# #                 "score": answer.score,
# #                 "feedback": answer.ai_feedback,
# #                 "answer_text": answer.answer_text,
# #             }
# #             for answer in answers
# #         ],
# #     }


# @router.get("/{interview_id}/result")
# def get_interview_result(
#     interview_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
# ):
#     # ---------------------------------------------------------
#     # 1. Get interview and verify ownership
#     # ---------------------------------------------------------
#     interview = (
#         db.query(Interview)
#         .filter(
#             Interview.id == interview_id,
#             Interview.user_id == current_user.id,
#         )
#         .first()
#     )

#     if not interview:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Interview not found",
#         )

#     # ---------------------------------------------------------
#     # 2. Get all answers with their questions
#     # ---------------------------------------------------------
#     answer_rows = (
#         db.query(
#             InterviewAnswer,
#             InterviewQuestion,
#         )
#         .join(
#             InterviewQuestion,
#             InterviewAnswer.interview_question_id
#             == InterviewQuestion.id,
#         )
#         .filter(
#             InterviewQuestion.interview_id == interview_id
#         )
#         .order_by(
#             InterviewQuestion.question_number
#         )
#         .all()
#     )

#     # ---------------------------------------------------------
#     # 3. Basic statistics
#     # ---------------------------------------------------------
#     answered_questions = len(answer_rows)
#     total_questions = interview.max_questions

#     # ---------------------------------------------------------
#     # 4. Calculate official score
#     #    ONLY from stored answer scores
#     # ---------------------------------------------------------
#     total_score = sum(
#         float(answer.score or 0)
#         for answer, question in answer_rows
#     )

#     maximum_score = answered_questions * 10

#     if maximum_score > 0:
#         overall_score = (
#             total_score / maximum_score
#         ) * 100
#     else:
#         overall_score = 0

#     # Keep score between 0 and 100
#     overall_score = round(
#         max(0, min(100, overall_score)),
#         2,
#     )

#     # ---------------------------------------------------------
#     # 5. Performance label
#     # ---------------------------------------------------------
#     if overall_score >= 90:
#         performance_label = "Outstanding Performance"

#     elif overall_score >= 75:
#         performance_label = "Strong Performance"

#     elif overall_score >= 60:
#         performance_label = "Good Performance"

#     elif overall_score >= 40:
#         performance_label = "Developing Performance"

#     else:
#         performance_label = "Needs Practice"

#     # ---------------------------------------------------------
#     # 6. Parse saved final AI feedback safely
#     # ---------------------------------------------------------
#     final_feedback = interview.final_feedback

#     if isinstance(final_feedback, str):
#         try:
#             final_feedback = json.loads(final_feedback)
#         except (json.JSONDecodeError, TypeError, ValueError):
#             final_feedback = {}

#     if not isinstance(final_feedback, dict):
#         final_feedback = {}

#     # ---------------------------------------------------------
#     # 7. Keep saved feedback consistent with official score
#     # ---------------------------------------------------------
#     final_feedback["overall_score"] = overall_score
#     final_feedback["headline"] = performance_label

#     # ---------------------------------------------------------
#     # 8. Build question + answer history
#     # ---------------------------------------------------------
#     answers = []

#     for answer, question in answer_rows:
#         answers.append(
#             {
#                 "id": answer.id,
#                 "question_id": question.id,
#                 "question_number": question.question_number,
#                 "question_text": question.question_text,
#                 "answer_text": answer.answer_text,
#                 "score": answer.score,
#                 "feedback": answer.ai_feedback,
#             }
#         )

#     # ---------------------------------------------------------
#     # 9. Return complete interview result
#     # ---------------------------------------------------------
#     return {
#         "interview_id": interview.id,
#         "status": interview.status,

#         "total_questions": total_questions,
#         "answered_questions": answered_questions,

#         # Official score
#         "percentage": overall_score,
#         "overall_score": overall_score,
#         "performance_label": performance_label,

#         # Final AI feedback
#         "feedback": final_feedback,

#         # Question-by-question history
#         "answers": answers,
#     }
    

# def parse_final_feedback(feedback):
#     """
#     Safely convert final AI feedback into a Python dictionary.
#     """

#     if feedback is None:
#         return {}

#     # Already a dictionary
#     if isinstance(feedback, dict):
#         return feedback

#     # AI feedback stored as a string
#     if isinstance(feedback, str):

#         feedback = feedback.strip()

#         # Remove ```json ... ``` if AI returned markdown
#         if feedback.startswith("```json"):
#             feedback = feedback[7:]

#         elif feedback.startswith("```"):
#             feedback = feedback[3:]

#         if feedback.endswith("```"):
#             feedback = feedback[:-3]

#         feedback = feedback.strip()

#         try:
#             parsed = json.loads(feedback)

#             if isinstance(parsed, dict):
#                 return parsed

#         except (json.JSONDecodeError, TypeError, ValueError):
#             print("Failed to parse final feedback JSON")

#     return {}





#..........................................new....................................
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.interview import Interview
from schemas.interview import InterviewCreate, InterviewResponse, AnswerSubmit
from security.dependencies import get_current_user
from models.user import User
from datetime import datetime, timezone
from models.interview_question import InterviewQuestion
from models.interview_answer import InterviewAnswer
from AI.interview_engine import (
    evaluate_answer,
    generate_first_question,
    generate_next_question,
    generate_final_feedback,
)

router = APIRouter(prefix="/interviews", tags=["Interviews"])


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
    answer: AnswerSubmit,
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
    # Complete question-by-question report.
    # ---------------------------------------------------------
    report_answers = [
        {
            "id": answer.id,
            "question_id": question.id,
            "question_number": question.question_number,
            "question_text": question.question_text,
            "answer_text": answer.answer_text,
            "score": float(answer.score or 0),
            "feedback": answer.ai_feedback or "No feedback available.",
        }
        for answer, question in answer_rows
    ]

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
        "answers": report_answers,
    }

