from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from security.dependencies import get_current_user
from AI.rag import extract_upload_text, index_text


router = APIRouter(
    prefix="/knowledge",
    tags=["Knowledge Base"],
)

ALLOWED_SOURCE_TYPES = {
    "resume",
    "job_description",
    "interview_preferences",
    "project",
    "notes",
}

MAX_FILE_BYTES = 8 * 1024 * 1024


class KnowledgeTextPayload(BaseModel):
    source_type: str = Field(default="job_description")
    source_name: str = Field(default="Job Description", max_length=255)
    content: str = Field(min_length=20)
    interview_id: int | None = None


def _validate_source_type(source_type: str) -> str:
    value = (source_type or "").strip().lower()

    if value not in ALLOWED_SOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "source_type must be one of: resume, job_description, "
                "interview_preferences, project, notes"
            ),
        )

    return value


def _clean_content(content: str) -> str:
    return (content or "").replace("\x00", " ").strip()


def _verify_interview_ownership(
    db: Session,
    user_id: int,
    interview_id: int | None,
) -> None:
    if interview_id is None:
        return

    result = db.execute(
        text(
            """
            SELECT id
            FROM interviews
            WHERE id = :interview_id
              AND user_id = :user_id
            LIMIT 1
            """
        ),
        {
            "interview_id": interview_id,
            "user_id": user_id,
        },
    ).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )


def _delete_existing_source(
    db: Session,
    user_id: int,
    source_type: str,
    interview_id: int | None,
) -> None:
    if interview_id is None:
        db.execute(
            text(
                """
                DELETE FROM candidate_knowledge
                WHERE user_id = :user_id
                  AND source_type = :source_type
                  AND interview_id IS NULL
                """
            ),
            {
                "user_id": user_id,
                "source_type": source_type,
            },
        )
    else:
        db.execute(
            text(
                """
                DELETE FROM candidate_knowledge
                WHERE user_id = :user_id
                  AND source_type = :source_type
                  AND interview_id = :interview_id
                """
            ),
            {
                "user_id": user_id,
                "source_type": source_type,
                "interview_id": interview_id,
            },
        )


def _count_indexed_chunks(
    db: Session,
    user_id: int,
    source_type: str,
    interview_id: int | None,
) -> int:
    if interview_id is None:
        result = db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM candidate_knowledge
                WHERE user_id = :user_id
                  AND source_type = :source_type
                  AND interview_id IS NULL
                """
            ),
            {
                "user_id": user_id,
                "source_type": source_type,
            },
        ).scalar()
    else:
        result = db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM candidate_knowledge
                WHERE user_id = :user_id
                  AND source_type = :source_type
                  AND interview_id = :interview_id
                """
            ),
            {
                "user_id": user_id,
                "source_type": source_type,
                "interview_id": interview_id,
            },
        ).scalar()

    return int(result or 0)


def _index_knowledge(
    db: Session,
    user_id: int,
    source_type: str,
    source_name: str,
    content: str,
    interview_id: int | None = None,
) -> int:
    content = _clean_content(content)

    if len(content) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The knowledge source does not contain enough readable text.",
        )

    _verify_interview_ownership(
        db=db,
        user_id=user_id,
        interview_id=interview_id,
    )

    _delete_existing_source(
        db=db,
        user_id=user_id,
        source_type=source_type,
        interview_id=interview_id,
    )
    db.commit()

    try:
        chunk_count = index_text(
            db=db,
            user_id=user_id,
            content=content,
            source_type=source_type,
            source_name=(source_name or "unknown")[:255],
            interview_id=interview_id,
            replace=False,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    actual_count = _count_indexed_chunks(
        db=db,
        user_id=user_id,
        source_type=source_type,
        interview_id=interview_id,
    )

    return actual_count or int(chunk_count or 0)


@router.post("/text")
def save_knowledge_text(
    payload: KnowledgeTextPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source_type = _validate_source_type(payload.source_type)

    if source_type in {"job_description", "interview_preferences"}:
        if payload.interview_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"interview_id is required for {source_type}.",
            )

    try:
        chunk_count = _index_knowledge(
            db=db,
            user_id=current_user.id,
            source_type=source_type,
            source_name=payload.source_name,
            content=payload.content,
            interview_id=payload.interview_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Knowledge indexing failed: {exc}",
        )

    return {
        "source_type": source_type,
        "source_name": payload.source_name,
        "interview_id": payload.interview_id,
        "chunks": chunk_count,
        "indexed": chunk_count > 0,
    }


@router.post("/upload")
async def upload_knowledge(
    file: UploadFile = File(...),
    source_type: str = Form("resume"),
    interview_id: int | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source_type = _validate_source_type(source_type)

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A file is required.",
        )

    if source_type in {"job_description", "interview_preferences"}:
        if interview_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"interview_id is required for {source_type}.",
            )

    _verify_interview_ownership(
        db=db,
        user_id=current_user.id,
        interview_id=interview_id,
    )

    try:
        content = extract_upload_text(file)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to extract text from uploaded file: {exc}",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text was found in the uploaded file.",
        )

    try:
        chunk_count = _index_knowledge(
            db=db,
            user_id=current_user.id,
            source_type=source_type,
            source_name=file.filename,
            content=content,
            interview_id=interview_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Knowledge indexing failed: {exc}",
        )

    return {
        "source_type": source_type,
        "source_name": file.filename,
        "interview_id": interview_id,
        "chunks": chunk_count,
        "indexed": chunk_count > 0,
    }


@router.get("/")
def list_knowledge(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.execute(
        text(
            """
            SELECT
                source_type,
                source_name,
                interview_id,
                COUNT(*) AS chunks,
                MIN(created_at) AS created_at
            FROM candidate_knowledge
            WHERE user_id = :user_id
            GROUP BY source_type, source_name, interview_id
            ORDER BY MIN(created_at) DESC
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()

    return [
        {
            "source_type": row["source_type"],
            "source_name": row["source_name"],
            "interview_id": row["interview_id"],
            "chunks": int(row["chunks"] or 0),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


@router.delete("/{source_type}")
def delete_knowledge(
    source_type: str,
    interview_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source_type = _validate_source_type(source_type)

    _verify_interview_ownership(
        db=db,
        user_id=current_user.id,
        interview_id=interview_id,
    )

    existing = _count_indexed_chunks(
        db=db,
        user_id=current_user.id,
        source_type=source_type,
        interview_id=interview_id,
    )

    if existing == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge source not found",
        )

    _delete_existing_source(
        db=db,
        user_id=current_user.id,
        source_type=source_type,
        interview_id=interview_id,
    )
    db.commit()

    return {
        "message": "Knowledge source deleted",
        "source_type": source_type,
        "interview_id": interview_id,
        "deleted_chunks": existing,
    }
