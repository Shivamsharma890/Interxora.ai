from __future__ import annotations
import re
from typing import Optional
from fastapi import UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session
from AI.client import client

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768
MAX_FILE_BYTES = 8 * 1024 * 1024
DEFAULT_TOP_K = 6
MAX_TOP_K = 12
RESUME_TOP_K = 3
JOB_DESCRIPTION_TOP_K = 2
PREFERENCES_TOP_K = 1
PERFORMANCE_TOP_K = 1


def ensure_rag_schema(db: Session, *, commit: bool = False) -> None:
    db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    db.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS candidate_knowledge (
                id BIGSERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                interview_id INTEGER NULL REFERENCES interviews(id) ON DELETE CASCADE,
                source_type VARCHAR(50) NOT NULL,
                source_name VARCHAR(255),
                content TEXT NOT NULL,
                embedding vector({EMBEDDING_DIMENSIONS}) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )

    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS candidate_knowledge_user_idx
            ON candidate_knowledge (user_id)
            """
        )
    )

    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS candidate_knowledge_embedding_hnsw_idx
            ON candidate_knowledge USING hnsw (embedding vector_cosine_ops)
            """
        )
    )

    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS candidate_knowledge_interview_source_idx
            ON candidate_knowledge (user_id, interview_id, source_type)
            """
        )
    )

    if commit:
        db.commit()


def _clean_text(value: str) -> str:
    value = value.replace("\x00", " ")
    value = re.sub(r"\r\n?", "\n", value)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def chunk_text(
    text_value: str,
    chunk_size: int = 1100,
    overlap: int = 160,
) -> list[str]:
    text_value = _clean_text(text_value)

    if not text_value:
        return []

    paragraphs = [
        paragraph.strip()
        for paragraph in text_value.split("\n\n")
        if paragraph.strip()
    ]

    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if len(paragraph) > chunk_size:
            words = paragraph.split()
            piece = ""

            for word in words:
                if len(piece) + len(word) + 1 <= chunk_size:
                    piece = f"{piece} {word}".strip()
                else:
                    if piece:
                        chunks.append(piece)

                    tail = piece[-overlap:] if piece else ""
                    piece = f"{tail} {word}".strip()

            if piece:
                chunks.append(piece)

            continue

        candidate = (
            f"{current}\n\n{paragraph}".strip()
            if current
            else paragraph
        )

        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)

            tail = current[-overlap:] if current else ""
            current = f"{tail}\n\n{paragraph}".strip()

    if current:
        chunks.append(current)

    return chunks


def _embed(
    contents: str | list[str],
    task_type: str,
) -> list[list[float]]:
    from google.genai import types

    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=contents,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )

    return [list(item.values) for item in result.embeddings]


def embed_documents(chunks: list[str]) -> list[list[float]]:
    if not chunks:
        return []

    return _embed(
        chunks,
        "RETRIEVAL_DOCUMENT",
    )


def embed_query(query: str) -> list[float]:
    return _embed(
        query,
        "RETRIEVAL_QUERY",
    )[0]


def _vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(
        f"{float(value):.8f}"
        for value in vector
    ) + "]"


def _delete_source(
    db: Session,
    *,
    user_id: int,
    source_type: str,
    interview_id: Optional[int] = None,
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


def index_text(
    db: Session,
    *,
    user_id: int,
    content: str,
    source_type: str,
    source_name: str,
    interview_id: Optional[int] = None,
    replace: bool = False,
) -> int:
    content = _clean_text(content)

    if not content:
        return 0

    ensure_rag_schema(db)

    if replace:
        _delete_source(
            db,
            user_id=user_id,
            source_type=source_type,
            interview_id=interview_id,
        )

    chunks = chunk_text(content)
    embeddings = embed_documents(chunks)

    for chunk, embedding in zip(chunks, embeddings):
        db.execute(
            text(
                """
                INSERT INTO candidate_knowledge
                    (
                        user_id,
                        interview_id,
                        source_type,
                        source_name,
                        content,
                        embedding
                    )
                VALUES
                    (
                        :user_id,
                        :interview_id,
                        :source_type,
                        :source_name,
                        :content,
                        CAST(:embedding AS vector)
                    )
                """
            ),
            {
                "user_id": user_id,
                "interview_id": interview_id,
                "source_type": source_type,
                "source_name": source_name,
                "content": chunk,
                "embedding": _vector_literal(embedding),
            },
        )

    db.commit()

    return len(chunks)


def extract_upload_text(file: UploadFile) -> str:
    data = file.file.read(
        MAX_FILE_BYTES + 1
    )

    if len(data) > MAX_FILE_BYTES:
        raise ValueError(
            "Resume file is too large. Maximum size is 8 MB."
        )

    filename = (
        file.filename or ""
    ).lower()

    content_type = (
        file.content_type or ""
    ).lower()

    if (
        filename.endswith(".pdf")
        or content_type == "application/pdf"
    ):
        from io import BytesIO
        from pypdf import PdfReader

        reader = PdfReader(
            BytesIO(data)
        )

        pages = [
            page.extract_text() or ""
            for page in reader.pages
        ]

        return _clean_text(
            "\n\n".join(pages)
        )

    if (
        filename.endswith(".docx")
        or content_type.endswith(
            "wordprocessingml.document"
        )
    ):
        from io import BytesIO
        from docx import Document

        document = Document(
            BytesIO(data)
        )

        paragraphs = [
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return _clean_text(
            "\n\n".join(paragraphs)
        )

    if (
        filename.endswith((".txt", ".md"))
        or content_type.startswith("text/")
    ):
        return _clean_text(
            data.decode(
                "utf-8",
                errors="ignore",
            )
        )

    raise ValueError(
        "Unsupported resume format. Upload PDF, DOCX, TXT or MD."
    )


def _retrieve_source(
    db: Session,
    *,
    user_id: int,
    query_embedding: list[float],
    source_type: str,
    top_k: int,
    interview_id: Optional[int],
    interview_specific: bool,
) -> list[dict]:
    vector = _vector_literal(
        query_embedding
    )

    if interview_specific:
        if interview_id is None:
            return []

        condition = """
            AND interview_id = :interview_id
        """
    else:
        condition = """
            AND interview_id IS NULL
        """

    rows = db.execute(
        text(
            f"""
            SELECT
                id,
                source_type,
                source_name,
                content,
                1 - (
                    embedding <=> CAST(
                        :query_embedding AS vector
                    )
                ) AS similarity
            FROM candidate_knowledge
            WHERE user_id = :user_id
              AND source_type = :source_type
              {condition}
            ORDER BY
                embedding <=> CAST(
                    :query_embedding AS vector
                )
            LIMIT :top_k
            """
        ),
        {
            "user_id": user_id,
            "source_type": source_type,
            "interview_id": interview_id,
            "query_embedding": vector,
            "top_k": max(
                1,
                min(
                    int(top_k),
                    MAX_TOP_K,
                ),
            ),
        },
    ).mappings().all()

    useful = [
        row
        for row in rows
        if float(
            row["similarity"] or 0
        ) >= 0.30
    ]

    if not useful:
        useful = rows[:top_k]

    return [dict(row) for row in useful]


def build_rag_context(
    db: Session,
    *,
    user_id: int,
    query: str,
    top_k: int = DEFAULT_TOP_K,
    interview_id: Optional[int] = None,
) -> str:
    if interview_id is None:
        return ""

    try:
        ensure_rag_schema(db)

        query_embedding = embed_query(
            query
        )

        resume_matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="resume",
            top_k=RESUME_TOP_K,
            interview_id=interview_id,
            interview_specific=True,
        )

        job_description_matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="job_description",
            top_k=JOB_DESCRIPTION_TOP_K,
            interview_id=interview_id,
            interview_specific=True,
        )

        preference_matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="interview_preferences",
            top_k=PREFERENCES_TOP_K,
            interview_id=interview_id,
            interview_specific=True,
        )

        performance_matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="interview_performance",
            top_k=PERFORMANCE_TOP_K,
            interview_id=None,
            interview_specific=False,
        )

        sections: list[str] = []

        if resume_matches:
            sections.append(
                "=== CURRENT INTERVIEW RESUME ===\n"
                + "\n\n".join(
                    row["content"]
                    for row in resume_matches
                )
            )

        if job_description_matches:
            sections.append(
                "=== CURRENT INTERVIEW JOB DESCRIPTION ===\n"
                + "\n\n".join(
                    row["content"]
                    for row in job_description_matches
                )
            )

        if preference_matches:
            sections.append(
                "=== CURRENT INTERVIEW PREFERENCES ===\n"
                + "\n\n".join(
                    row["content"]
                    for row in preference_matches
                )
            )

        if performance_matches:
            sections.append(
                "=== PREVIOUS INTERVIEW PERFORMANCE ===\n"
                + "\n\n".join(
                    row["content"]
                    for row in performance_matches
                )
            )

        return "\n\n---\n\n".join(
            sections
        )

    except Exception:
        db.rollback()
        return ""


def retrieve_resume_context(
    db: Session,
    *,
    user_id: int,
    query: str,
    interview_id: Optional[int] = None,
    top_k: int = RESUME_TOP_K,
) -> str:
    if interview_id is None:
        return ""

    try:
        ensure_rag_schema(db)

        query_embedding = embed_query(
            query
        )

        matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="resume",
            top_k=top_k,
            interview_id=interview_id,
            interview_specific=True,
        )

        return "\n\n".join(
            row["content"]
            for row in matches
        )

    except Exception:
        db.rollback()
        return ""


def debug_rag_context(
    db: Session,
    *,
    user_id: int,
    query: str,
    interview_id: Optional[int] = None,
    top_k: int = DEFAULT_TOP_K,
) -> dict:
    if interview_id is None:
        return {
            "interview_id": None,
            "context": "",
            "sources": [],
        }

    try:
        ensure_rag_schema(db)

        query_embedding = embed_query(
            query
        )

        resume_matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="resume",
            top_k=RESUME_TOP_K,
            interview_id=interview_id,
            interview_specific=True,
        )

        job_description_matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="job_description",
            top_k=JOB_DESCRIPTION_TOP_K,
            interview_id=interview_id,
            interview_specific=True,
        )

        preference_matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="interview_preferences",
            top_k=PREFERENCES_TOP_K,
            interview_id=interview_id,
            interview_specific=True,
        )

        performance_matches = _retrieve_source(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            source_type="interview_performance",
            top_k=PERFORMANCE_TOP_K,
            interview_id=None,
            interview_specific=False,
        )

        matches = (
            resume_matches
            + job_description_matches
            + preference_matches
            + performance_matches
        )

        context_sections: list[str] = []

        if resume_matches:
            context_sections.append(
                "=== CURRENT INTERVIEW RESUME ===\n"
                + "\n\n".join(
                    row["content"]
                    for row in resume_matches
                )
            )

        if job_description_matches:
            context_sections.append(
                "=== CURRENT INTERVIEW JOB DESCRIPTION ===\n"
                + "\n\n".join(
                    row["content"]
                    for row in job_description_matches
                )
            )

        if preference_matches:
            context_sections.append(
                "=== CURRENT INTERVIEW PREFERENCES ===\n"
                + "\n\n".join(
                    row["content"]
                    for row in preference_matches
                )
            )

        if performance_matches:
            context_sections.append(
                "=== PREVIOUS INTERVIEW PERFORMANCE ===\n"
                + "\n\n".join(
                    row["content"]
                    for row in performance_matches
                )
            )

        context = "\n\n---\n\n".join(
            context_sections
        )

        return {
            "interview_id": interview_id,
            "context": context,
            "sources": [
                {
                    "id": row["id"],
                    "source_type": row["source_type"],
                    "source_name": row["source_name"],
                    "similarity": float(
                        row["similarity"] or 0
                    ),
                    "content": row["content"],
                }
                for row in matches
            ],
        }

    except Exception as exc:
        db.rollback()

        return {
            "interview_id": interview_id,
            "context": "",
            "sources": [],
            "error": str(exc),
        }


def index_interview_performance(
    db: Session,
    *,
    user_id: int,
    role: str,
    interview_type: str,
    difficulty: str,
    questions_and_answers: str,
    final_feedback: str,
) -> int:
    content = f"""
Previous interview performance

Role: {role}

Interview type: {interview_type}

Difficulty: {difficulty}

Question and answer history:

{questions_and_answers}

Final coaching feedback:

{final_feedback}
"""

    return index_text(
        db,
        user_id=user_id,
        content=content,
        source_type="interview_performance",
        source_name=f"{role} interview performance",
        interview_id=None,
        replace=False,
    )