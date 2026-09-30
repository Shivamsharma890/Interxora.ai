# # # from __future__ import annotations
# # # from typing import Iterable, Optional
# # # from sqlalchemy.orm import Session
# # # from google.genai import types
# # # from AI.client import client
# # # from models.knowledge import (KnowledgeChunk, KnowledgeDocument, EMBEDDING_DIMENSION)


# # # EMBEDDING_MODEL = "gemini-embedding-001"


# # # def _clean_text(value: str) -> str:
# # #     return " ".join((value or "").split()).strip()


# # # def chunk_text(
# # #     text: str,
# # #     chunk_size: int = 1200,
# # #     overlap: int = 180,
# # # ) -> list[str]:
# # #     """
# # #     Split source text into deterministic overlapping chunks.
# # #     """

# # #     text = (text or "").replace("\x00", " ").strip()

# # #     if not text:
# # #         return []

# # #     if overlap >= chunk_size:
# # #         raise ValueError(
# # #             "overlap must be smaller than chunk_size"
# # #         )

# # #     chunks = []

# # #     start = 0
# # #     length = len(text)

# # #     while start < length:
# # #         end = min(
# # #             start + chunk_size,
# # #             length,
# # #         )

# # #         chunk = text[start:end].strip()

# # #         if chunk:
# # #             chunks.append(chunk)

# # #         if end >= length:
# # #             break

# # #         start = end - overlap

# # #     return chunks


# # # def embed_texts(
# # #     texts: Iterable[str],
# # #     task_type: str,
# # # ) -> list[list[float]]:
# # #     """
# # #     Generate Gemini embeddings for multiple texts.
# # #     """

# # #     values = [
# # #         str(item).strip()
# # #         for item in texts
# # #         if str(item).strip()
# # #     ]

# # #     if not values:
# # #         return []

# # #     config = types.EmbedContentConfig(
# # #         task_type=task_type,
# # #         output_dimensionality=EMBEDDING_DIMENSION,
# # #     )

# # #     response = client.models.embed_content(
# # #         model=EMBEDDING_MODEL,
# # #         contents=values,
# # #         config=config,
# # #     )

# # #     embeddings = [
# # #         list(item.values or [])
# # #         for item in response.embeddings
# # #     ]

# # #     if len(embeddings) != len(values):
# # #         raise RuntimeError(
# # #             "Embedding service returned an unexpected number of vectors"
# # #         )

# # #     for vector in embeddings:
# # #         if len(vector) != EMBEDDING_DIMENSION:
# # #             raise RuntimeError(
# # #                 f"Expected {EMBEDDING_DIMENSION}-dimensional embedding, "
# # #                 f"got {len(vector)}"
# # #             )

# # #     return embeddings


# # # def embed_query(query: str) -> list[float]:
# # #     embeddings = embed_texts(
# # #         [query],
# # #         "RETRIEVAL_QUERY",
# # #     )

# # #     return embeddings[0] if embeddings else []


# # # def index_document(
# # #     db: Session,
# # #     *,
# # #     document,
# # #     content: str,
# # # ) -> int:
# # #     """
# # #     Chunk the document, generate embeddings,
# # #     and store chunks in PostgreSQL + pgvector.
# # #     """

# # #     chunks = chunk_text(content)

# # #     if not chunks:
# # #         raise ValueError(
# # #             "The document does not contain usable text"
# # #         )

# # #     embeddings = embed_texts(
# # #         chunks,
# # #         "RETRIEVAL_DOCUMENT",
# # #     )

# # #     for index, (chunk, embedding) in enumerate(
# # #         zip(chunks, embeddings)
# # #     ):
# # #         db.add(
# # #             KnowledgeChunk(
# # #                 document_id=document.id,
# # #                 user_id=document.user_id,
# # #                 chunk_index=index,
# # #                 content=chunk,
# # #                 embedding=embedding,
# # #             )
# # #         )

# # #     return len(chunks)


# # # def retrieve_context(
# # #     db: Session,
# # #     *,
# # #     user_id: int,
# # #     query: str,
# # #     top_k: int = 6,
# # #     source_types: Optional[list[str]] = None,
# # # ) -> list[dict]:
# # #     """
# # #     Retrieve semantically relevant knowledge
# # #     using pgvector cosine similarity.
# # #     """

# # #     query = _clean_text(query)

# # #     if not query:
# # #         return []

# # #     query_embedding = embed_query(query)

# # #     if not query_embedding:
# # #         return []

# # #     distance = (
# # #         KnowledgeChunk.embedding
# # #         .cosine_distance(query_embedding)
# # #         .label("distance")
# # #     )

# # #     query_builder = (
# # #         db.query(
# # #             KnowledgeChunk,
# # #             distance,
# # #         )
# # #         .filter(
# # #             KnowledgeChunk.user_id == user_id
# # #         )
# # #     )

# # #     if source_types:
# # #         query_builder = (
# # #             query_builder
# # #             .join(
# # #                 KnowledgeDocument,
# # #                 KnowledgeDocument.id
# # #                 == KnowledgeChunk.document_id,
# # #             )
# # #             .filter(
# # #                 KnowledgeDocument.source_type.in_(
# # #                     source_types
# # #                 )
# # #             )
# # #         )

# # #     rows = (
# # #         query_builder
# # #         .order_by(distance)
# # #         .limit(
# # #             max(
# # #                 1,
# # #                 min(top_k, 12),
# # #             )
# # #         )
# # #         .all()
# # #     )

# # #     document_ids = [
# # #         chunk.document_id
# # #         for chunk, _ in rows
# # #     ]

# # #     documents = {}

# # #     if document_ids:
# # #         documents = {
# # #             item.id: item
# # #             for item in (
# # #                 db.query(KnowledgeDocument)
# # #                 .filter(
# # #                     KnowledgeDocument.user_id == user_id,
# # #                     KnowledgeDocument.id.in_(
# # #                         document_ids
# # #                     ),
# # #                 )
# # #                 .all()
# # #             )
# # #         }

# # #     results = []

# # #     for chunk, distance_value in rows:
# # #         document = documents.get(
# # #             chunk.document_id
# # #         )

# # #         if not document:
# # #             continue

# # #         results.append(
# # #             {
# # #                 "content": chunk.content,
# # #                 "source_type": document.source_type,
# # #                 "source_name": document.source_name,
# # #                 "similarity": round(
# # #                     max(
# # #                         0.0,
# # #                         1.0
# # #                         - float(
# # #                             distance_value or 1.0
# # #                         ),
# # #                     ),
# # #                     4,
# # #                 ),
# # #             }
# # #         )

# # #     return results


# # # def build_rag_context(
# # #     db: Session,
# # #     *,
# # #     user_id: Optional[int],
# # #     query: str,
# # #     top_k: int = 6,
# # # ) -> str:
# # #     """
# # #     Build a compact context block that can be
# # #     passed to Gemini.
# # #     """

# # #     if not user_id:
# # #         return ""

# # #     matches = retrieve_context(
# # #         db,
# # #         user_id=user_id,
# # #         query=query,
# # #         top_k=top_k,
# # #     )

# # #     if not matches:
# # #         return ""

# # #     blocks = []

# # #     for index, item in enumerate(
# # #         matches,
# # #         1,
# # #     ):
# # #         blocks.append(
# # #             f"[{index}] "
# # #             f"{item['source_type']} — "
# # #             f"{item['source_name']}\n"
# # #             f"{item['content']}"
# # #         )

# # #     return "\n\n---\n\n".join(blocks)


# # #...............................new.................................
# # from __future__ import annotations

# # import re
# # from typing import Optional

# # from fastapi import UploadFile
# # from sqlalchemy import text
# # from sqlalchemy.orm import Session

# # from AI.client import client


# # # ============================================================
# # # CONFIGURATION
# # # ============================================================

# # EMBEDDING_MODEL = "gemini-embedding-001"
# # EMBEDDING_DIMENSIONS = 768

# # MAX_FILE_BYTES = 8 * 1024 * 1024

# # DEFAULT_TOP_K = 6
# # MAX_TOP_K = 12

# # # Source-specific retrieval quotas.
# # # Resume and JD are the most important sources for
# # # personalized interview generation.
# # RESUME_TOP_K = 3
# # JOB_DESCRIPTION_TOP_K = 2
# # PREFERENCES_TOP_K = 1
# # PERFORMANCE_TOP_K = 1


# # # ============================================================
# # # RAG DATABASE SCHEMA
# # # ============================================================

# # def ensure_rag_schema(
# #     db: Session,
# #     *,
# #     commit: bool = False,
# # ) -> None:
# #     """
# #     Create the pgvector-backed candidate knowledge store
# #     if it does not already exist.
# #     """

# #     db.execute(
# #         text(
# #             "CREATE EXTENSION IF NOT EXISTS vector"
# #         )
# #     )

# #     db.execute(
# #         text(
# #             f"""
# #             CREATE TABLE IF NOT EXISTS candidate_knowledge (
# #                 id BIGSERIAL PRIMARY KEY,

# #                 user_id INTEGER NOT NULL
# #                     REFERENCES users(id)
# #                     ON DELETE CASCADE,

# #                 interview_id INTEGER NULL
# #                     REFERENCES interviews(id)
# #                     ON DELETE CASCADE,

# #                 source_type VARCHAR(50) NOT NULL,

# #                 source_name VARCHAR(255),

# #                 content TEXT NOT NULL,

# #                 embedding vector({EMBEDDING_DIMENSIONS})
# #                     NOT NULL,

# #                 created_at TIMESTAMPTZ NOT NULL
# #                     DEFAULT NOW()
# #             )
# #             """
# #         )
# #     )

# #     db.execute(
# #         text(
# #             """
# #             CREATE INDEX IF NOT EXISTS
# #             candidate_knowledge_user_idx
# #             ON candidate_knowledge (user_id)
# #             """
# #         )
# #     )

# #     db.execute(
# #         text(
# #             """
# #             CREATE INDEX IF NOT EXISTS
# #             candidate_knowledge_embedding_hnsw_idx
# #             ON candidate_knowledge
# #             USING hnsw (embedding vector_cosine_ops)
# #             """
# #         )
# #     )

# #     if commit:
# #         db.commit()


# # # ============================================================
# # # TEXT CLEANING
# # # ============================================================

# # def _clean_text(value: str) -> str:
# #     """
# #     Normalize uploaded and retrieved text.
# #     """

# #     if not value:
# #         return ""

# #     value = value.replace(
# #         "\x00",
# #         " ",
# #     )

# #     value = re.sub(
# #         r"\r\n?",
# #         "\n",
# #         value,
# #     )

# #     value = re.sub(
# #         r"[ \t]+",
# #         " ",
# #         value,
# #     )

# #     value = re.sub(
# #         r"\n{3,}",
# #         "\n\n",
# #         value,
# #     )

# #     return value.strip()


# # # ============================================================
# # # TEXT CHUNKING
# # # ============================================================

# # def chunk_text(
# #     text_value: str,
# #     chunk_size: int = 1100,
# #     overlap: int = 160,
# # ) -> list[str]:
# #     """
# #     Split long documents into retrieval-friendly chunks.

# #     The chunker attempts to preserve paragraph boundaries
# #     while also splitting very large paragraphs.
# #     """

# #     text_value = _clean_text(
# #         text_value
# #     )

# #     if not text_value:
# #         return []

# #     if chunk_size <= 0:
# #         raise ValueError(
# #             "chunk_size must be greater than zero."
# #         )

# #     if overlap < 0:
# #         raise ValueError(
# #             "overlap cannot be negative."
# #         )

# #     if overlap >= chunk_size:
# #         raise ValueError(
# #             "overlap must be smaller than chunk_size."
# #         )

# #     paragraphs = [
# #         paragraph.strip()
# #         for paragraph in text_value.split("\n\n")
# #         if paragraph.strip()
# #     ]

# #     chunks: list[str] = []

# #     current = ""

# #     for paragraph in paragraphs:

# #         # ----------------------------------------------------
# #         # Large paragraph
# #         # ----------------------------------------------------

# #         if len(paragraph) > chunk_size:

# #             words = paragraph.split()

# #             piece = ""

# #             for word in words:

# #                 candidate = (
# #                     f"{piece} {word}"
# #                     if piece
# #                     else word
# #                 )

# #                 if len(candidate) <= chunk_size:
# #                     piece = candidate
# #                     continue

# #                 if piece:
# #                     chunks.append(
# #                         piece.strip()
# #                     )

# #                 tail = (
# #                     piece[-overlap:]
# #                     if piece
# #                     else ""
# #                 )

# #                 piece = (
# #                     f"{tail} {word}"
# #                 ).strip()

# #             if piece:
# #                 chunks.append(
# #                     piece.strip()
# #                 )

# #             continue

# #         # ----------------------------------------------------
# #         # Normal paragraph
# #         # ----------------------------------------------------

# #         candidate = (
# #             f"{current}\n\n{paragraph}".strip()
# #             if current
# #             else paragraph
# #         )

# #         if len(candidate) <= chunk_size:

# #             current = candidate

# #         else:

# #             if current:
# #                 chunks.append(
# #                     current.strip()
# #                 )

# #             tail = (
# #                 current[-overlap:]
# #                 if current
# #                 else ""
# #             )

# #             current = (
# #                 f"{tail}\n\n{paragraph}"
# #             ).strip()

# #     if current:
# #         chunks.append(
# #             current.strip()
# #         )

# #     return [
# #         chunk
# #         for chunk in chunks
# #         if chunk.strip()
# #     ]


# # # ============================================================
# # # GEMINI EMBEDDINGS
# # # ============================================================

# # def _embed(
# #     contents: str | list[str],
# #     task_type: str,
# # ) -> list[list[float]]:
# #     """
# #     Generate Gemini embeddings.

# #     Document chunks use:
# #         RETRIEVAL_DOCUMENT

# # Queries use:
# #         RETRIEVAL_QUERY
# #     """

# #     result = client.models.embed_content(
# #         model=EMBEDDING_MODEL,
# #         contents=contents,
# #         config={
# #             "task_type": task_type,
# #             "output_dimensionality": EMBEDDING_DIMENSIONS,
# #         },
# #     )

# #     embeddings = [
# #         list(item.values or [])
# #         for item in result.embeddings
# #     ]

# #     expected_count = (
# #         len(contents)
# #         if isinstance(contents, list)
# #         else 1
# #     )

# #     if len(embeddings) != expected_count:
# #         raise RuntimeError(
# #             "Gemini returned an unexpected number "
# #             "of embeddings."
# #         )

# #     for embedding in embeddings:

# #         if len(embedding) != EMBEDDING_DIMENSIONS:
# #             raise RuntimeError(
# #                 f"Expected {EMBEDDING_DIMENSIONS}-dimensional "
# #                 f"embedding, got {len(embedding)}."
# #             )

# #     return embeddings


# # def embed_documents(
# #     chunks: list[str],
# # ) -> list[list[float]]:
# #     """
# #     Create embeddings for stored document chunks.
# #     """

# #     if not chunks:
# #         return []

# #     return _embed(
# #         chunks,
# #         "RETRIEVAL_DOCUMENT",
# #     )


# # def embed_query(
# #     query: str,
# # ) -> list[float]:
# #     """
# #     Create an embedding for a semantic search query.
# #     """

# #     query = _clean_text(
# #         query
# #     )

# #     if not query:
# #         return []

# #     embeddings = _embed(
# #         query,
# #         "RETRIEVAL_QUERY",
# #     )

# #     if not embeddings:
# #         return []

# #     return embeddings[0]


# # # ============================================================
# # # VECTOR SERIALIZATION
# # # ============================================================

# # def _vector_literal(
# #     vector: list[float],
# # ) -> str:
# #     """
# #     Convert a Python list into PostgreSQL pgvector syntax.
# #     """

# #     return (
# #         "["
# #         + ",".join(
# #             f"{float(value):.8f}"
# #             for value in vector
# #         )
# #         + "]"
# #     )


# # # ============================================================
# # # DELETE EXISTING SOURCE
# # # ============================================================

# # def _delete_source(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     source_type: str,
# #     interview_id: Optional[int] = None,
# # ) -> None:
# #     """
# #     Delete previously indexed content for a source.

# #     Resume/performance normally use interview_id=NULL.

# #     JD/preferences can be associated with a particular
# #     interview.
# #     """

# #     if interview_id is None:

# #         db.execute(
# #             text(
# #                 """
# #                 DELETE FROM candidate_knowledge
# #                 WHERE user_id = :user_id
# #                   AND source_type = :source_type
# #                   AND interview_id IS NULL
# #                 """
# #             ),
# #             {
# #                 "user_id": user_id,
# #                 "source_type": source_type,
# #             },
# #         )

# #     else:

# #         db.execute(
# #             text(
# #                 """
# #                 DELETE FROM candidate_knowledge
# #                 WHERE user_id = :user_id
# #                   AND source_type = :source_type
# #                   AND interview_id = :interview_id
# #                 """
# #             ),
# #             {
# #                 "user_id": user_id,
# #                 "source_type": source_type,
# #                 "interview_id": interview_id,
# #             },
# #         )


# # # ============================================================
# # # INDEX TEXT INTO RAG
# # # ============================================================

# # def index_text(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     content: str,
# #     source_type: str,
# #     source_name: str,
# #     interview_id: Optional[int] = None,
# #     replace: bool = False,
# # ) -> int:
# #     """
# #     Clean, chunk, embed and store text in candidate_knowledge.
# #     """

# #     content = _clean_text(
# #         content
# #     )

# #     if not content:
# #         return 0

# #     if not user_id:
# #         raise ValueError(
# #             "user_id is required for RAG indexing."
# #         )

# #     source_type = (
# #         source_type or "unknown"
# #     ).strip().lower()

# #     source_name = (
# #         source_name or "unknown"
# #     ).strip()

# #     ensure_rag_schema(
# #         db
# #     )

# #     if replace:

# #         _delete_source(
# #             db,
# #             user_id=user_id,
# #             source_type=source_type,
# #             interview_id=interview_id,
# #         )

# #     chunks = chunk_text(
# #         content
# #     )

# #     if not chunks:
# #         return 0

# #     embeddings = embed_documents(
# #         chunks
# #     )

# #     if len(chunks) != len(embeddings):
# #         raise RuntimeError(
# #             "Number of chunks and embeddings "
# #             "does not match."
# #         )

# #     for chunk, embedding in zip(
# #         chunks,
# #         embeddings,
# #     ):

# #         db.execute(
# #             text(
# #                 """
# #                 INSERT INTO candidate_knowledge
# #                     (
# #                         user_id,
# #                         interview_id,
# #                         source_type,
# #                         source_name,
# #                         content,
# #                         embedding
# #                     )
# #                 VALUES
# #                     (
# #                         :user_id,
# #                         :interview_id,
# #                         :source_type,
# #                         :source_name,
# #                         :content,
# #                         CAST(
# #                             :embedding AS vector
# #                         )
# #                     )
# #                 """
# #             ),
# #             {
# #                 "user_id": user_id,
# #                 "interview_id": interview_id,
# #                 "source_type": source_type,
# #                 "source_name": source_name,
# #                 "content": chunk,
# #                 "embedding": _vector_literal(
# #                     embedding
# #                 ),
# #             },
# #         )

# #     db.commit()

# #     return len(chunks)


# # # ============================================================
# # # FILE TEXT EXTRACTION
# # # ============================================================

# # def extract_upload_text(
# #     file: UploadFile,
# # ) -> str:
# #     """
# #     Extract text from:

# #         PDF
# #         DOCX
# #         TXT
# #         Markdown
# #     """

# #     data = file.file.read(
# #         MAX_FILE_BYTES + 1
# #     )

# #     if len(data) > MAX_FILE_BYTES:
# #         raise ValueError(
# #             "Resume file is too large. "
# #             "Maximum size is 8 MB."
# #         )

# #     filename = (
# #         file.filename or ""
# #     ).lower()

# #     content_type = (
# #         file.content_type or ""
# #     ).lower()

# #     # --------------------------------------------------------
# #     # PDF
# #     # --------------------------------------------------------

# #     if (
# #         filename.endswith(".pdf")
# #         or content_type == "application/pdf"
# #     ):

# #         from io import BytesIO
# #         from pypdf import PdfReader

# #         reader = PdfReader(
# #             BytesIO(data)
# #         )

# #         pages = [
# #             page.extract_text() or ""
# #             for page in reader.pages
# #         ]

# #         return _clean_text(
# #             "\n\n".join(pages)
# #         )

# #     # --------------------------------------------------------
# #     # DOCX
# #     # --------------------------------------------------------

# #     if (
# #         filename.endswith(".docx")
# #         or content_type.endswith(
# #             "wordprocessingml.document"
# #         )
# #     ):

# #         from io import BytesIO
# #         from docx import Document

# #         document = Document(
# #             BytesIO(data)
# #         )

# #         paragraphs = [
# #             paragraph.text
# #             for paragraph in document.paragraphs
# #             if paragraph.text.strip()
# #         ]

# #         return _clean_text(
# #             "\n\n".join(paragraphs)
# #         )

# #     # --------------------------------------------------------
# #     # TXT / Markdown
# #     # --------------------------------------------------------

# #     if (
# #         filename.endswith(
# #             (".txt", ".md")
# #         )
# #         or content_type.startswith("text/")
# #     ):

# #         return _clean_text(
# #             data.decode(
# #                 "utf-8",
# #                 errors="ignore",
# #             )
# #         )

# #     raise ValueError(
# #         "Unsupported resume format. "
# #         "Upload PDF, DOCX, TXT or MD."
# #     )


# # # ============================================================
# # # LOW-LEVEL SOURCE RETRIEVAL
# # # ============================================================

# # def _retrieve_source(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query_embedding: list[float],
# #     source_type: str,
# #     top_k: int,
# #     interview_id: Optional[int] = None,
# #     interview_specific: bool = False,
# # ) -> list[dict]:
# #     """
# #     Retrieve chunks from ONE specific source type.

# #     This is the key change from the old RAG implementation.

# #     Instead of:

# #         resume + JD + preferences
# #                 ↓
# #               top 6

# #     we do:

# #         resume          → own retrieval
# #         job description → own retrieval
# #         preferences     → own retrieval
# #         performance     → own retrieval

# #     This prevents the resume or JD from disappearing from
# #     the context simply because another source has higher
# #     vector similarity.
# #     """

# #     if not query_embedding:
# #         return []

# #     if top_k <= 0:
# #         return []

# #     vector = _vector_literal(
# #         query_embedding
# #     )

# #     # --------------------------------------------------------
# #     # Interview-specific source
# #     # --------------------------------------------------------

# #     if interview_specific:

# #         if interview_id is None:
# #             return []

# #         rows = db.execute(
# #             text(
# #                 """
# #                 SELECT
# #                     id,
# #                     source_type,
# #                     source_name,
# #                     content,
# #                     interview_id,
# #                     1 - (
# #                         embedding
# #                         <=>
# #                         CAST(
# #                             :query_embedding AS vector
# #                         )
# #                     ) AS similarity
# #                 FROM candidate_knowledge
# #                 WHERE user_id = :user_id
# #                   AND source_type = :source_type
# #                   AND interview_id = :interview_id
# #                 ORDER BY
# #                     embedding
# #                     <=>
# #                     CAST(
# #                         :query_embedding AS vector
# #                     )
# #                 LIMIT :top_k
# #                 """
# #             ),
# #             {
# #                 "user_id": user_id,
# #                 "source_type": source_type,
# #                 "interview_id": interview_id,
# #                 "query_embedding": vector,
# #                 "top_k": max(
# #                     1,
# #                     min(
# #                         int(top_k),
# #                         MAX_TOP_K,
# #                     ),
# #                 ),
# #             },
# #         ).mappings().all()

# #     # --------------------------------------------------------
# #     # User-wide source
# #     # --------------------------------------------------------

# #     else:

# #         rows = db.execute(
# #             text(
# #                 """
# #                 SELECT
# #                     id,
# #                     source_type,
# #                     source_name,
# #                     content,
# #                     interview_id,
# #                     1 - (
# #                         embedding
# #                         <=>
# #                         CAST(
# #                             :query_embedding AS vector
# #                         )
# #                     ) AS similarity
# #                 FROM candidate_knowledge
# #                 WHERE user_id = :user_id
# #                   AND source_type = :source_type
# #                   AND interview_id IS NULL
# #                 ORDER BY
# #                     embedding
# #                     <=>
# #                     CAST(
# #                         :query_embedding AS vector
# #                     )
# #                 LIMIT :top_k
# #                 """
# #             ),
# #             {
# #                 "user_id": user_id,
# #                 "source_type": source_type,
# #                 "query_embedding": vector,
# #                 "top_k": max(
# #                     1,
# #                     min(
# #                         int(top_k),
# #                         MAX_TOP_K,
# #                     ),
# #                 ),
# #             },
# #         ).mappings().all()

# #     results: list[dict] = []

# #     for row in rows:

# #         similarity = float(
# #             row["similarity"]
# #             if row["similarity"] is not None
# #             else 0.0
# #         )

# #         results.append(
# #             {
# #                 "id": row["id"],
# #                 "source_type": row[
# #                     "source_type"
# #                 ],
# #                 "source_name": row[
# #                     "source_name"
# #                 ],
# #                 "content": row[
# #                     "content"
# #                 ],
# #                 "interview_id": row[
# #                     "interview_id"
# #                 ],
# #                 "similarity": round(
# #                     similarity,
# #                     4,
# #                 ),
# #             }
# #         )

# #     return results


# # # ============================================================
# # # GENERAL RETRIEVAL API
# # # ============================================================

# # def retrieve_context(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query: str,
# #     top_k: int = DEFAULT_TOP_K,
# #     source_types: Optional[list[str]] = None,
# #     interview_id: Optional[int] = None,
# # ) -> list[dict]:
# #     """
# #     General-purpose semantic retrieval.

# #     This function is kept for compatibility with the rest
# #     of the application.

# #     If source_types is provided, retrieval is restricted
# #     to those source types.

# #     If source_types is not provided, it performs a balanced
# #     retrieval across the important source categories.
# #     """

# #     if not user_id:
# #         return []

# #     query = _clean_text(
# #         query
# #     )

# #     if not query:
# #         return []

# #     ensure_rag_schema(
# #         db
# #     )

# #     query_embedding = embed_query(
# #         query
# #     )

# #     if not query_embedding:
# #         return []

# #     # --------------------------------------------------------
# #     # Explicit source filtering
# #     # --------------------------------------------------------

# #     if source_types:

# #         normalized_sources = [
# #             source.strip().lower()
# #             for source in source_types
# #             if source and source.strip()
# #         ]

# #         if not normalized_sources:
# #             return []

# #         results: list[dict] = []

# #         per_source = max(
# #             1,
# #             int(top_k)
# #             // len(normalized_sources),
# #         )

# #         for source_type in normalized_sources:

# #             interview_specific = (
# #                 source_type
# #                 in {
# #                     "job_description",
# #                     "interview_preferences",
# #                 }
# #             )

# #             matches = _retrieve_source(
# #                 db,
# #                 user_id=user_id,
# #                 query_embedding=query_embedding,
# #                 source_type=source_type,
# #                 top_k=per_source,
# #                 interview_id=interview_id,
# #                 interview_specific=interview_specific,
# #             )

# #             results.extend(
# #                 matches
# #             )

# #         results.sort(
# #             key=lambda item: item[
# #                 "similarity"
# #             ],
# #             reverse=True,
# #         )

# #         return results[
# #             :max(
# #                 1,
# #                 min(
# #                     int(top_k),
# #                     MAX_TOP_K,
# #                 ),
# #             )
# #         ]

# #     # --------------------------------------------------------
# #     # Balanced retrieval
# #     # --------------------------------------------------------

# #     results = []

# #     # Resume
# #     results.extend(
# #         _retrieve_source(
# #             db,
# #             user_id=user_id,
# #             query_embedding=query_embedding,
# #             source_type="resume",
# #             top_k=RESUME_TOP_K,
# #             interview_id=interview_id,
# #             interview_specific=False,
# #         )
# #     )

# #     # Job description
# #     results.extend(
# #         _retrieve_source(
# #             db,
# #             user_id=user_id,
# #             query_embedding=query_embedding,
# #             source_type="job_description",
# #             top_k=JOB_DESCRIPTION_TOP_K,
# #             interview_id=interview_id,
# #             interview_specific=True,
# #         )
# #     )

# #     # Preferences
# #     if interview_id is not None:

# #         results.extend(
# #             _retrieve_source(
# #                 db,
# #                 user_id=user_id,
# #                 query_embedding=query_embedding,
# #                 source_type="interview_preferences",
# #                 top_k=PREFERENCES_TOP_K,
# #                 interview_id=interview_id,
# #                 interview_specific=True,
# #             )
# #         )

# #     # Previous interview performance
# #     results.extend(
# #         _retrieve_source(
# #             db,
# #             user_id=user_id,
# #             query_embedding=query_embedding,
# #             source_type="interview_performance",
# #             top_k=PERFORMANCE_TOP_K,
# #             interview_id=interview_id,
# #             interview_specific=False,
# #         )
# #     )

# #     # Sort strongest matches first while keeping all
# #     # source categories available.
# #     results.sort(
# #         key=lambda item: item[
# #             "similarity"
# #         ],
# #         reverse=True,
# #     )

# #     return results[
# #         :max(
# #             1,
# #             min(
# #                 int(top_k) + 2,
# #                 MAX_TOP_K,
# #             ),
# #         )
# #     ]


# # # ============================================================
# # # SOURCE-SPECIFIC HELPERS
# # # ============================================================

# # def retrieve_resume_context(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query: str,
# #     top_k: int = RESUME_TOP_K,
# # ) -> list[dict]:
# #     """
# #     Retrieve candidate resume information.
# #     """

# #     if not user_id:
# #         return []

# #     query_embedding = embed_query(
# #         query
# #     )

# #     return _retrieve_source(
# #         db,
# #         user_id=user_id,
# #         query_embedding=query_embedding,
# #         source_type="resume",
# #         top_k=top_k,
# #         interview_id=None,
# #         interview_specific=False,
# #     )


# # def retrieve_job_description_context(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query: str,
# #     interview_id: Optional[int] = None,
# #     top_k: int = JOB_DESCRIPTION_TOP_K,
# # ) -> list[dict]:
# #     """
# #     Retrieve the job description for the current interview.

# #     If interview_id is supplied, only that interview's JD
# #     is returned.
# #     """

# #     if not user_id:
# #         return []

# #     if interview_id is None:
# #         return []

# #     query_embedding = embed_query(
# #         query
# #     )

# #     return _retrieve_source(
# #         db,
# #         user_id=user_id,
# #         query_embedding=query_embedding,
# #         source_type="job_description",
# #         top_k=top_k,
# #         interview_id=interview_id,
# #         interview_specific=True,
# #     )


# # def retrieve_preferences_context(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query: str,
# #     interview_id: Optional[int] = None,
# #     top_k: int = PREFERENCES_TOP_K,
# # ) -> list[dict]:
# #     """
# #     Retrieve interview-specific preferences.
# #     """

# #     if not user_id:
# #         return []

# #     if interview_id is None:
# #         return []

# #     query_embedding = embed_query(
# #         query
# #     )

# #     return _retrieve_source(
# #         db,
# #         user_id=user_id,
# #         query_embedding=query_embedding,
# #         source_type="interview_preferences",
# #         top_k=top_k,
# #         interview_id=interview_id,
# #         interview_specific=True,
# #     )


# # def retrieve_performance_context(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query: str,
# #     top_k: int = PERFORMANCE_TOP_K,
# # ) -> list[dict]:
# #     """
# #     Retrieve previous interview performance.
# #     """

# #     if not user_id:
# #         return []

# #     query_embedding = embed_query(
# #         query
# #     )

# #     return _retrieve_source(
# #         db,
# #         user_id=user_id,
# #         query_embedding=query_embedding,
# #         source_type="interview_performance",
# #         top_k=top_k,
# #         interview_id=None,
# #         interview_specific=False,
# #     )


# # # ============================================================
# # # BUILD PERSONALIZED RAG CONTEXT
# # # ============================================================

# # def build_rag_context(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query: str,
# #     top_k: int = DEFAULT_TOP_K,
# #     interview_id: Optional[int] = None,
# # ) -> str:
# #     """
# #     Build structured RAG context for the interview engine.

# #     IMPORTANT:

# #     The old implementation performed one vector search:

# #         resume + JD + preferences + performance
# #                          ↓
# #                       top_k

# #     That could omit the resume or JD.

# #     This implementation retrieves each source independently:

# #         RESUME
# #         JOB DESCRIPTION
# #         PREFERENCES
# #         PERFORMANCE

# #     and then combines them into a structured context.

# #     This is specifically designed for personalized interviews.
# #     """

# #     if not user_id:
# #         return ""

# #     query = _clean_text(
# #         query
# #     )

# #     if not query:
# #         return ""

# #     try:

# #         ensure_rag_schema(
# #             db
# #         )

# #         # ----------------------------------------------------
# #         # One query embedding is generated and reused.
# #         # ----------------------------------------------------

# #         query_embedding = embed_query(
# #             query
# #         )

# #         if not query_embedding:
# #             return ""

# #         # ----------------------------------------------------
# #         # Candidate Resume
# #         # ----------------------------------------------------

# #         resume_matches = _retrieve_source(
# #             db,
# #             user_id=user_id,
# #             query_embedding=query_embedding,
# #             source_type="resume",
# #             top_k=RESUME_TOP_K,
# #             interview_id=None,
# #             interview_specific=False,
# #         )

# #         # ----------------------------------------------------
# #         # Current Job Description
# #         # ----------------------------------------------------

# #         job_matches = []

# #         if interview_id is not None:

# #             job_matches = _retrieve_source(
# #                 db,
# #                 user_id=user_id,
# #                 query_embedding=query_embedding,
# #                 source_type="job_description",
# #                 top_k=JOB_DESCRIPTION_TOP_K,
# #                 interview_id=interview_id,
# #                 interview_specific=True,
# #             )

# #         # ----------------------------------------------------
# #         # Interview Preferences
# #         # ----------------------------------------------------

# #         preference_matches = []

# #         if interview_id is not None:

# #             preference_matches = _retrieve_source(
# #                 db,
# #                 user_id=user_id,
# #                 query_embedding=query_embedding,
# #                 source_type="interview_preferences",
# #                 top_k=PREFERENCES_TOP_K,
# #                 interview_id=interview_id,
# #                 interview_specific=True,
# #             )

# #         # ----------------------------------------------------
# #         # Previous Interview Performance
# #         # ----------------------------------------------------

# #         performance_matches = _retrieve_source(
# #             db,
# #             user_id=user_id,
# #             query_embedding=query_embedding,
# #             source_type="interview_performance",
# #             top_k=PERFORMANCE_TOP_K,
# #             interview_id=None,
# #             interview_specific=False,
# #         )

# #         # ----------------------------------------------------
# #         # Build structured sections.
# #         #
# #         # We intentionally keep source identity visible to
# #         # Gemini so it knows what is resume information and
# #         # what is job-description information.
# #         # ----------------------------------------------------

# #         sections: list[str] = []

# #         # ====================================================
# #         # RESUME
# #         # ====================================================

# #         if resume_matches:

# #             lines = [
# #                 "=== CANDIDATE RESUME ===",
# #                 (
# #                     "Use this section as the source of truth "
# #                     "for the candidate's actual experience, "
# #                     "projects, skills and technologies."
# #                 ),
# #                 "",
# #             ]

# #             for index, item in enumerate(
# #                 resume_matches,
# #                 1,
# #             ):

# #                 lines.append(
# #                     f"[Resume Chunk {index}] "
# #                     f"Source: {item['source_name']} "
# #                     f"| Similarity: "
# #                     f"{item['similarity']}"
# #                 )

# #                 lines.append(
# #                     item["content"]
# #                 )

# #                 lines.append("")

# #             sections.append(
# #                 "\n".join(lines)
# #             )

# #         # ====================================================
# #         # JOB DESCRIPTION
# #         # ====================================================

# #         if job_matches:

# #             lines = [
# #                 "=== CURRENT JOB DESCRIPTION ===",
# #                 (
# #                     "Use this section to understand the "
# #                     "requirements of the specific role."
# #                 ),
# #                 "",
# #             ]

# #             for index, item in enumerate(
# #                 job_matches,
# #                 1,
# #             ):

# #                 lines.append(
# #                     f"[Job Description Chunk {index}] "
# #                     f"Source: {item['source_name']} "
# #                     f"| Similarity: "
# #                     f"{item['similarity']}"
# #                 )

# #                 lines.append(
# #                     item["content"]
# #                 )

# #                 lines.append("")

# #             sections.append(
# #                 "\n".join(lines)
# #             )

# #         # ====================================================
# #         # INTERVIEW PREFERENCES
# #         # ====================================================

# #         if preference_matches:

# #             lines = [
# #                 "=== INTERVIEW PREFERENCES ===",
# #                 "",
# #             ]

# #             for index, item in enumerate(
# #                 preference_matches,
# #                 1,
# #             ):

# #                 lines.append(
# #                     f"[Preference {index}] "
# #                     f"Similarity: "
# #                     f"{item['similarity']}"
# #                 )

# #                 lines.append(
# #                     item["content"]
# #                 )

# #                 lines.append("")

# #             sections.append(
# #                 "\n".join(lines)
# #             )

# #         # ====================================================
# #         # PREVIOUS PERFORMANCE
# #         # ====================================================

# #         if performance_matches:

# #             lines = [
# #                 "=== PREVIOUS INTERVIEW PERFORMANCE ===",
# #                 (
# #                     "Use this only when it is relevant to "
# #                     "adapting the current interview."
# #                 ),
# #                 "",
# #             ]

# #             for index, item in enumerate(
# #                 performance_matches,
# #                 1,
# #             ):

# #                 lines.append(
# #                     f"[Performance Chunk {index}] "
# #                     f"Source: {item['source_name']} "
# #                     f"| Similarity: "
# #                     f"{item['similarity']}"
# #                 )

# #                 lines.append(
# #                     item["content"]
# #                 )

# #                 lines.append("")

# #             sections.append(
# #                 "\n".join(lines)
# #             )

# #         if not sections:
# #             return ""

# #         # ----------------------------------------------------
# #         # Final context
# #         # ----------------------------------------------------

# #         context = (
# #             "\n\n------------------------------\n\n"
# #         ).join(
# #             sections
# #         )

# #         return context.strip()

# #     except Exception as exc:

# #         # ----------------------------------------------------
# #         # RAG should not make the complete interview unusable.
# #         #
# #         # However, print the actual error so that during
# #         # development we can see if retrieval is failing.
# #         # ----------------------------------------------------

# #         print(
# #             f"[RAG ERROR] build_rag_context failed: {exc}"
# #         )

# #         db.rollback()

# #         return ""


# # # ============================================================
# # # DEBUG RAG RETRIEVAL
# # # ============================================================

# # def debug_rag_context(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query: str,
# #     interview_id: Optional[int] = None,
# # ) -> dict:
# #     """
# #     Development helper.

# #     This allows us to inspect exactly what RAG retrieves
# #     before Gemini generates the interview question.
# #     """

# #     if not user_id:
# #         return {
# #             "user_id": user_id,
# #             "interview_id": interview_id,
# #             "query": query,
# #             "resume": [],
# #             "job_description": [],
# #             "preferences": [],
# #             "performance": [],
# #         }

# #     query = _clean_text(
# #         query
# #     )

# #     if not query:
# #         return {
# #             "user_id": user_id,
# #             "interview_id": interview_id,
# #             "query": query,
# #             "resume": [],
# #             "job_description": [],
# #             "preferences": [],
# #             "performance": [],
# #         }

# #     try:

# #         ensure_rag_schema(
# #             db
# #         )

# #         query_embedding = embed_query(
# #             query
# #         )

# #         if not query_embedding:
# #             return {
# #                 "user_id": user_id,
# #                 "interview_id": interview_id,
# #                 "query": query,
# #                 "resume": [],
# #                 "job_description": [],
# #                 "preferences": [],
# #                 "performance": [],
# #             }

# #         resume = _retrieve_source(
# #             db,
# #             user_id=user_id,
# #             query_embedding=query_embedding,
# #             source_type="resume",
# #             top_k=RESUME_TOP_K,
# #             interview_id=None,
# #             interview_specific=False,
# #         )

# #         job_description = []

# #         if interview_id is not None:

# #             job_description = _retrieve_source(
# #                 db,
# #                 user_id=user_id,
# #                 query_embedding=query_embedding,
# #                 source_type="job_description",
# #                 top_k=JOB_DESCRIPTION_TOP_K,
# #                 interview_id=interview_id,
# #                 interview_specific=True,
# #             )

# #         preferences = []

# #         if interview_id is not None:

# #             preferences = _retrieve_source(
# #                 db,
# #                 user_id=user_id,
# #                 query_embedding=query_embedding,
# #                 source_type="interview_preferences",
# #                 top_k=PREFERENCES_TOP_K,
# #                 interview_id=interview_id,
# #                 interview_specific=True,
# #             )

# #         performance = _retrieve_source(
# #             db,
# #             user_id=user_id,
# #             query_embedding=query_embedding,
# #             source_type="interview_performance",
# #             top_k=PERFORMANCE_TOP_K,
# #             interview_id=None,
# #             interview_specific=False,
# #         )

# #         return {
# #             "user_id": user_id,
# #             "interview_id": interview_id,
# #             "query": query,
# #             "resume": resume,
# #             "job_description": job_description,
# #             "preferences": preferences,
# #             "performance": performance,
# #         }

# #     except Exception as exc:

# #         print(
# #             f"[RAG DEBUG ERROR] {exc}"
# #         )

# #         db.rollback()

# #         return {
# #             "user_id": user_id,
# #             "interview_id": interview_id,
# #             "query": query,
# #             "resume": [],
# #             "job_description": [],
# #             "preferences": [],
# #             "performance": [],
# #             "error": str(exc),
# #         }


# # # ============================================================
# # # INDEX PREVIOUS INTERVIEW PERFORMANCE
# # # ============================================================

# # def index_interview_performance(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     role: str,
# #     interview_type: str,
# #     difficulty: str,
# #     questions_and_answers: str,
# #     final_feedback: str,
# # ) -> int:
# #     """
# #     Store completed interview performance in the user's
# #     long-term RAG knowledge.

# #     This information can later be used to adapt future
# #     interviews.
# #     """

# #     content = f"""
# # Previous interview performance

# # Role:
# # {role}

# # Interview type:
# # {interview_type}

# # Difficulty:
# # {difficulty}

# # Question and answer history:
# # {questions_and_answers}

# # Final coaching feedback:
# # {final_feedback}
# # """

# #     return index_text(
# #         db,
# #         user_id=user_id,
# #         content=content,
# #         source_type="interview_performance",
# #         source_name=f"{role} interview performance",
# #         interview_id=None,
# #         replace=False,
# #     )



# #............................................new files code............................
# # from __future__ import annotations
# # from typing import Iterable, Optional
# # from sqlalchemy.orm import Session
# # from google.genai import types
# # from AI.client import client
# # from models.knowledge import (KnowledgeChunk, KnowledgeDocument, EMBEDDING_DIMENSION)


# # EMBEDDING_MODEL = "gemini-embedding-001"


# # def _clean_text(value: str) -> str:
# #     return " ".join((value or "").split()).strip()


# # def chunk_text(
# #     text: str,
# #     chunk_size: int = 1200,
# #     overlap: int = 180,
# # ) -> list[str]:
# #     """
# #     Split source text into deterministic overlapping chunks.
# #     """

# #     text = (text or "").replace("\x00", " ").strip()

# #     if not text:
# #         return []

# #     if overlap >= chunk_size:
# #         raise ValueError(
# #             "overlap must be smaller than chunk_size"
# #         )

# #     chunks = []

# #     start = 0
# #     length = len(text)

# #     while start < length:
# #         end = min(
# #             start + chunk_size,
# #             length,
# #         )

# #         chunk = text[start:end].strip()

# #         if chunk:
# #             chunks.append(chunk)

# #         if end >= length:
# #             break

# #         start = end - overlap

# #     return chunks


# # def embed_texts(
# #     texts: Iterable[str],
# #     task_type: str,
# # ) -> list[list[float]]:
# #     """
# #     Generate Gemini embeddings for multiple texts.
# #     """

# #     values = [
# #         str(item).strip()
# #         for item in texts
# #         if str(item).strip()
# #     ]

# #     if not values:
# #         return []

# #     config = types.EmbedContentConfig(
# #         task_type=task_type,
# #         output_dimensionality=EMBEDDING_DIMENSION,
# #     )

# #     response = client.models.embed_content(
# #         model=EMBEDDING_MODEL,
# #         contents=values,
# #         config=config,
# #     )

# #     embeddings = [
# #         list(item.values or [])
# #         for item in response.embeddings
# #     ]

# #     if len(embeddings) != len(values):
# #         raise RuntimeError(
# #             "Embedding service returned an unexpected number of vectors"
# #         )

# #     for vector in embeddings:
# #         if len(vector) != EMBEDDING_DIMENSION:
# #             raise RuntimeError(
# #                 f"Expected {EMBEDDING_DIMENSION}-dimensional embedding, "
# #                 f"got {len(vector)}"
# #             )

# #     return embeddings


# # def embed_query(query: str) -> list[float]:
# #     embeddings = embed_texts(
# #         [query],
# #         "RETRIEVAL_QUERY",
# #     )

# #     return embeddings[0] if embeddings else []


# # def index_document(
# #     db: Session,
# #     *,
# #     document,
# #     content: str,
# # ) -> int:
# #     """
# #     Chunk the document, generate embeddings,
# #     and store chunks in PostgreSQL + pgvector.
# #     """

# #     chunks = chunk_text(content)

# #     if not chunks:
# #         raise ValueError(
# #             "The document does not contain usable text"
# #         )

# #     embeddings = embed_texts(
# #         chunks,
# #         "RETRIEVAL_DOCUMENT",
# #     )

# #     for index, (chunk, embedding) in enumerate(
# #         zip(chunks, embeddings)
# #     ):
# #         db.add(
# #             KnowledgeChunk(
# #                 document_id=document.id,
# #                 user_id=document.user_id,
# #                 chunk_index=index,
# #                 content=chunk,
# #                 embedding=embedding,
# #             )
# #         )

# #     return len(chunks)


# # def retrieve_context(
# #     db: Session,
# #     *,
# #     user_id: int,
# #     query: str,
# #     top_k: int = 6,
# #     source_types: Optional[list[str]] = None,
# # ) -> list[dict]:
# #     """
# #     Retrieve semantically relevant knowledge
# #     using pgvector cosine similarity.
# #     """

# #     query = _clean_text(query)

# #     if not query:
# #         return []

# #     query_embedding = embed_query(query)

# #     if not query_embedding:
# #         return []

# #     distance = (
# #         KnowledgeChunk.embedding
# #         .cosine_distance(query_embedding)
# #         .label("distance")
# #     )

# #     query_builder = (
# #         db.query(
# #             KnowledgeChunk,
# #             distance,
# #         )
# #         .filter(
# #             KnowledgeChunk.user_id == user_id
# #         )
# #     )

# #     if source_types:
# #         query_builder = (
# #             query_builder
# #             .join(
# #                 KnowledgeDocument,
# #                 KnowledgeDocument.id
# #                 == KnowledgeChunk.document_id,
# #             )
# #             .filter(
# #                 KnowledgeDocument.source_type.in_(
# #                     source_types
# #                 )
# #             )
# #         )

# #     rows = (
# #         query_builder
# #         .order_by(distance)
# #         .limit(
# #             max(
# #                 1,
# #                 min(top_k, 12),
# #             )
# #         )
# #         .all()
# #     )

# #     document_ids = [
# #         chunk.document_id
# #         for chunk, _ in rows
# #     ]

# #     documents = {}

# #     if document_ids:
# #         documents = {
# #             item.id: item
# #             for item in (
# #                 db.query(KnowledgeDocument)
# #                 .filter(
# #                     KnowledgeDocument.user_id == user_id,
# #                     KnowledgeDocument.id.in_(
# #                         document_ids
# #                     ),
# #                 )
# #                 .all()
# #             )
# #         }

# #     results = []

# #     for chunk, distance_value in rows:
# #         document = documents.get(
# #             chunk.document_id
# #         )

# #         if not document:
# #             continue

# #         results.append(
# #             {
# #                 "content": chunk.content,
# #                 "source_type": document.source_type,
# #                 "source_name": document.source_name,
# #                 "similarity": round(
# #                     max(
# #                         0.0,
# #                         1.0
# #                         - float(
# #                             distance_value or 1.0
# #                         ),
# #                     ),
# #                     4,
# #                 ),
# #             }
# #         )

# #     return results


# # def build_rag_context(
# #     db: Session,
# #     *,
# #     user_id: Optional[int],
# #     query: str,
# #     top_k: int = 6,
# # ) -> str:
# #     """
# #     Build a compact context block that can be
# #     passed to Gemini.
# #     """

# #     if not user_id:
# #         return ""

# #     matches = retrieve_context(
# #         db,
# #         user_id=user_id,
# #         query=query,
# #         top_k=top_k,
# #     )

# #     if not matches:
# #         return ""

# #     blocks = []

# #     for index, item in enumerate(
# #         matches,
# #         1,
# #     ):
# #         blocks.append(
# #             f"[{index}] "
# #             f"{item['source_type']} — "
# #             f"{item['source_name']}\n"
# #             f"{item['content']}"
# #         )

# #     return "\n\n---\n\n".join(blocks)


# #...............................new.................................
# from __future__ import annotations

# import re
# from typing import Optional

# from fastapi import UploadFile
# from sqlalchemy import text
# from sqlalchemy.orm import Session

# from AI.client import client


# # ============================================================
# # CONFIGURATION
# # ============================================================

# EMBEDDING_MODEL = "gemini-embedding-001"
# EMBEDDING_DIMENSIONS = 768

# MAX_FILE_BYTES = 8 * 1024 * 1024

# DEFAULT_TOP_K = 6
# MAX_TOP_K = 12

# # Source-specific retrieval quotas.
# # Resume and JD are the most important sources for
# # personalized interview generation.
# RESUME_TOP_K = 3
# JOB_DESCRIPTION_TOP_K = 2
# PREFERENCES_TOP_K = 1
# PERFORMANCE_TOP_K = 1


# # ============================================================
# # RAG DATABASE SCHEMA
# # ============================================================

# def ensure_rag_schema(
#     db: Session,
#     *,
#     commit: bool = False,
# ) -> None:
#     """
#     Create the pgvector-backed candidate knowledge store
#     if it does not already exist.
#     """

#     db.execute(
#         text(
#             "CREATE EXTENSION IF NOT EXISTS vector"
#         )
#     )

#     db.execute(
#         text(
#             f"""
#             CREATE TABLE IF NOT EXISTS candidate_knowledge (
#                 id BIGSERIAL PRIMARY KEY,

#                 user_id INTEGER NOT NULL
#                     REFERENCES users(id)
#                     ON DELETE CASCADE,

#                 interview_id INTEGER NULL
#                     REFERENCES interviews(id)
#                     ON DELETE CASCADE,

#                 source_type VARCHAR(50) NOT NULL,

#                 source_name VARCHAR(255),

#                 content TEXT NOT NULL,

#                 embedding vector({EMBEDDING_DIMENSIONS})
#                     NOT NULL,

#                 created_at TIMESTAMPTZ NOT NULL
#                     DEFAULT NOW()
#             )
#             """
#         )
#     )

#     db.execute(
#         text(
#             """
#             CREATE INDEX IF NOT EXISTS
#             candidate_knowledge_user_idx
#             ON candidate_knowledge (user_id)
#             """
#         )
#     )

#     db.execute(
#         text(
#             """
#             CREATE INDEX IF NOT EXISTS
#             candidate_knowledge_embedding_hnsw_idx
#             ON candidate_knowledge
#             USING hnsw (embedding vector_cosine_ops)
#             """
#         )
#     )

#     if commit:
#         db.commit()


# # ============================================================
# # TEXT CLEANING
# # ============================================================

# def _clean_text(value: str) -> str:
#     """
#     Normalize uploaded and retrieved text.
#     """

#     if not value:
#         return ""

#     value = value.replace(
#         "\x00",
#         " ",
#     )

#     value = re.sub(
#         r"\r\n?",
#         "\n",
#         value,
#     )

#     value = re.sub(
#         r"[ \t]+",
#         " ",
#         value,
#     )

#     value = re.sub(
#         r"\n{3,}",
#         "\n\n",
#         value,
#     )

#     return value.strip()


# # ============================================================
# # TEXT CHUNKING
# # ============================================================

# def chunk_text(
#     text_value: str,
#     chunk_size: int = 1100,
#     overlap: int = 160,
# ) -> list[str]:
#     """
#     Split long documents into retrieval-friendly chunks.

#     The chunker attempts to preserve paragraph boundaries
#     while also splitting very large paragraphs.
#     """

#     text_value = _clean_text(
#         text_value
#     )

#     if not text_value:
#         return []

#     if chunk_size <= 0:
#         raise ValueError(
#             "chunk_size must be greater than zero."
#         )

#     if overlap < 0:
#         raise ValueError(
#             "overlap cannot be negative."
#         )

#     if overlap >= chunk_size:
#         raise ValueError(
#             "overlap must be smaller than chunk_size."
#         )

#     paragraphs = [
#         paragraph.strip()
#         for paragraph in text_value.split("\n\n")
#         if paragraph.strip()
#     ]

#     chunks: list[str] = []

#     current = ""

#     for paragraph in paragraphs:

#         # ----------------------------------------------------
#         # Large paragraph
#         # ----------------------------------------------------

#         if len(paragraph) > chunk_size:

#             words = paragraph.split()

#             piece = ""

#             for word in words:

#                 candidate = (
#                     f"{piece} {word}"
#                     if piece
#                     else word
#                 )

#                 if len(candidate) <= chunk_size:
#                     piece = candidate
#                     continue

#                 if piece:
#                     chunks.append(
#                         piece.strip()
#                     )

#                 tail = (
#                     piece[-overlap:]
#                     if piece
#                     else ""
#                 )

#                 piece = (
#                     f"{tail} {word}"
#                 ).strip()

#             if piece:
#                 chunks.append(
#                     piece.strip()
#                 )

#             continue

#         # ----------------------------------------------------
#         # Normal paragraph
#         # ----------------------------------------------------

#         candidate = (
#             f"{current}\n\n{paragraph}".strip()
#             if current
#             else paragraph
#         )

#         if len(candidate) <= chunk_size:

#             current = candidate

#         else:

#             if current:
#                 chunks.append(
#                     current.strip()
#                 )

#             tail = (
#                 current[-overlap:]
#                 if current
#                 else ""
#             )

#             current = (
#                 f"{tail}\n\n{paragraph}"
#             ).strip()

#     if current:
#         chunks.append(
#             current.strip()
#         )

#     return [
#         chunk
#         for chunk in chunks
#         if chunk.strip()
#     ]


# # ============================================================
# # GEMINI EMBEDDINGS
# # ============================================================

# def _embed(
#     contents: str | list[str],
#     task_type: str,
# ) -> list[list[float]]:
#     """
#     Generate Gemini embeddings.

#     Document chunks use:
#         RETRIEVAL_DOCUMENT

# Queries use:
#         RETRIEVAL_QUERY
#     """

#     result = client.models.embed_content(
#         model=EMBEDDING_MODEL,
#         contents=contents,
#         config={
#             "task_type": task_type,
#             "output_dimensionality": EMBEDDING_DIMENSIONS,
#         },
#     )

#     embeddings = [
#         list(item.values or [])
#         for item in result.embeddings
#     ]

#     expected_count = (
#         len(contents)
#         if isinstance(contents, list)
#         else 1
#     )

#     if len(embeddings) != expected_count:
#         raise RuntimeError(
#             "Gemini returned an unexpected number "
#             "of embeddings."
#         )

#     for embedding in embeddings:

#         if len(embedding) != EMBEDDING_DIMENSIONS:
#             raise RuntimeError(
#                 f"Expected {EMBEDDING_DIMENSIONS}-dimensional "
#                 f"embedding, got {len(embedding)}."
#             )

#     return embeddings


# def embed_documents(
#     chunks: list[str],
# ) -> list[list[float]]:
#     """
#     Create embeddings for stored document chunks.
#     """

#     if not chunks:
#         return []

#     return _embed(
#         chunks,
#         "RETRIEVAL_DOCUMENT",
#     )


# def embed_query(
#     query: str,
# ) -> list[float]:
#     """
#     Create an embedding for a semantic search query.
#     """

#     query = _clean_text(
#         query
#     )

#     if not query:
#         return []

#     embeddings = _embed(
#         query,
#         "RETRIEVAL_QUERY",
#     )

#     if not embeddings:
#         return []

#     return embeddings[0]


# # ============================================================
# # VECTOR SERIALIZATION
# # ============================================================

# def _vector_literal(
#     vector: list[float],
# ) -> str:
#     """
#     Convert a Python list into PostgreSQL pgvector syntax.
#     """

#     return (
#         "["
#         + ",".join(
#             f"{float(value):.8f}"
#             for value in vector
#         )
#         + "]"
#     )


# # ============================================================
# # DELETE EXISTING SOURCE
# # ============================================================

# def _delete_source(
#     db: Session,
#     *,
#     user_id: int,
#     source_type: str,
#     interview_id: Optional[int] = None,
# ) -> None:
#     """
#     Delete previously indexed content for a source.

#     Resume/performance normally use interview_id=NULL.

#     JD/preferences can be associated with a particular
#     interview.
#     """

#     if interview_id is None:

#         db.execute(
#             text(
#                 """
#                 DELETE FROM candidate_knowledge
#                 WHERE user_id = :user_id
#                   AND source_type = :source_type
#                   AND interview_id IS NULL
#                 """
#             ),
#             {
#                 "user_id": user_id,
#                 "source_type": source_type,
#             },
#         )

#     else:

#         db.execute(
#             text(
#                 """
#                 DELETE FROM candidate_knowledge
#                 WHERE user_id = :user_id
#                   AND source_type = :source_type
#                   AND interview_id = :interview_id
#                 """
#             ),
#             {
#                 "user_id": user_id,
#                 "source_type": source_type,
#                 "interview_id": interview_id,
#             },
#         )


# # ============================================================
# # INDEX TEXT INTO RAG
# # ============================================================

# def index_text(
#     db: Session,
#     *,
#     user_id: int,
#     content: str,
#     source_type: str,
#     source_name: str,
#     interview_id: Optional[int] = None,
#     replace: bool = False,
# ) -> int:
#     """
#     Clean, chunk, embed and store text in candidate_knowledge.
#     """

#     content = _clean_text(
#         content
#     )

#     if not content:
#         return 0

#     if not user_id:
#         raise ValueError(
#             "user_id is required for RAG indexing."
#         )

#     source_type = (
#         source_type or "unknown"
#     ).strip().lower()

#     source_name = (
#         source_name or "unknown"
#     ).strip()

#     ensure_rag_schema(
#         db
#     )

#     if replace:

#         _delete_source(
#             db,
#             user_id=user_id,
#             source_type=source_type,
#             interview_id=interview_id,
#         )

#     chunks = chunk_text(
#         content
#     )

#     if not chunks:
#         return 0

#     embeddings = embed_documents(
#         chunks
#     )

#     if len(chunks) != len(embeddings):
#         raise RuntimeError(
#             "Number of chunks and embeddings "
#             "does not match."
#         )

#     for chunk, embedding in zip(
#         chunks,
#         embeddings,
#     ):

#         db.execute(
#             text(
#                 """
#                 INSERT INTO candidate_knowledge
#                     (
#                         user_id,
#                         interview_id,
#                         source_type,
#                         source_name,
#                         content,
#                         embedding
#                     )
#                 VALUES
#                     (
#                         :user_id,
#                         :interview_id,
#                         :source_type,
#                         :source_name,
#                         :content,
#                         CAST(
#                             :embedding AS vector
#                         )
#                     )
#                 """
#             ),
#             {
#                 "user_id": user_id,
#                 "interview_id": interview_id,
#                 "source_type": source_type,
#                 "source_name": source_name,
#                 "content": chunk,
#                 "embedding": _vector_literal(
#                     embedding
#                 ),
#             },
#         )

#     db.commit()

#     return len(chunks)


# # ============================================================
# # FILE TEXT EXTRACTION
# # ============================================================

# def extract_upload_text(
#     file: UploadFile,
# ) -> str:
#     """
#     Extract text from:

#         PDF
#         DOCX
#         TXT
#         Markdown
#     """

#     data = file.file.read(
#         MAX_FILE_BYTES + 1
#     )

#     if len(data) > MAX_FILE_BYTES:
#         raise ValueError(
#             "Resume file is too large. "
#             "Maximum size is 8 MB."
#         )

#     filename = (
#         file.filename or ""
#     ).lower()

#     content_type = (
#         file.content_type or ""
#     ).lower()

#     # --------------------------------------------------------
#     # PDF
#     # --------------------------------------------------------

#     if (
#         filename.endswith(".pdf")
#         or content_type == "application/pdf"
#     ):

#         from io import BytesIO
#         from pypdf import PdfReader

#         reader = PdfReader(
#             BytesIO(data)
#         )

#         pages = [
#             page.extract_text() or ""
#             for page in reader.pages
#         ]

#         return _clean_text(
#             "\n\n".join(pages)
#         )

#     # --------------------------------------------------------
#     # DOCX
#     # --------------------------------------------------------

#     if (
#         filename.endswith(".docx")
#         or content_type.endswith(
#             "wordprocessingml.document"
#         )
#     ):

#         from io import BytesIO
#         from docx import Document

#         document = Document(
#             BytesIO(data)
#         )

#         paragraphs = [
#             paragraph.text
#             for paragraph in document.paragraphs
#             if paragraph.text.strip()
#         ]

#         return _clean_text(
#             "\n\n".join(paragraphs)
#         )

#     # --------------------------------------------------------
#     # TXT / Markdown
#     # --------------------------------------------------------

#     if (
#         filename.endswith(
#             (".txt", ".md")
#         )
#         or content_type.startswith("text/")
#     ):

#         return _clean_text(
#             data.decode(
#                 "utf-8",
#                 errors="ignore",
#             )
#         )

#     raise ValueError(
#         "Unsupported resume format. "
#         "Upload PDF, DOCX, TXT or MD."
#     )


# # ============================================================
# # LOW-LEVEL SOURCE RETRIEVAL
# # ============================================================

# def _retrieve_source(
#     db: Session,
#     *,
#     user_id: int,
#     query_embedding: list[float],
#     source_type: str,
#     top_k: int,
#     interview_id: Optional[int] = None,
#     interview_specific: bool = False,
# ) -> list[dict]:
#     """
#     Retrieve chunks from ONE specific source type.

#     This is the key change from the old RAG implementation.

#     Instead of:

#         resume + JD + preferences
#                 ↓
#               top 6

#     we do:

#         resume          → own retrieval
#         job description → own retrieval
#         preferences     → own retrieval
#         performance     → own retrieval

#     This prevents the resume or JD from disappearing from
#     the context simply because another source has higher
#     vector similarity.
#     """

#     if not query_embedding:
#         return []

#     if top_k <= 0:
#         return []

#     vector = _vector_literal(
#         query_embedding
#     )

#     # --------------------------------------------------------
#     # Interview-specific source
#     # --------------------------------------------------------

#     if interview_specific:

#         if interview_id is None:
#             return []

#         rows = db.execute(
#             text(
#                 """
#                 SELECT
#                     id,
#                     source_type,
#                     source_name,
#                     content,
#                     interview_id,
#                     1 - (
#                         embedding
#                         <=>
#                         CAST(
#                             :query_embedding AS vector
#                         )
#                     ) AS similarity
#                 FROM candidate_knowledge
#                 WHERE user_id = :user_id
#                   AND source_type = :source_type
#                   AND interview_id = :interview_id
#                 ORDER BY
#                     embedding
#                     <=>
#                     CAST(
#                         :query_embedding AS vector
#                     )
#                 LIMIT :top_k
#                 """
#             ),
#             {
#                 "user_id": user_id,
#                 "source_type": source_type,
#                 "interview_id": interview_id,
#                 "query_embedding": vector,
#                 "top_k": max(
#                     1,
#                     min(
#                         int(top_k),
#                         MAX_TOP_K,
#                     ),
#                 ),
#             },
#         ).mappings().all()

#     # --------------------------------------------------------
#     # User-wide source
#     # --------------------------------------------------------

#     else:

#         rows = db.execute(
#             text(
#                 """
#                 SELECT
#                     id,
#                     source_type,
#                     source_name,
#                     content,
#                     interview_id,
#                     1 - (
#                         embedding
#                         <=>
#                         CAST(
#                             :query_embedding AS vector
#                         )
#                     ) AS similarity
#                 FROM candidate_knowledge
#                 WHERE user_id = :user_id
#                   AND source_type = :source_type
#                   AND interview_id IS NULL
#                 ORDER BY
#                     embedding
#                     <=>
#                     CAST(
#                         :query_embedding AS vector
#                     )
#                 LIMIT :top_k
#                 """
#             ),
#             {
#                 "user_id": user_id,
#                 "source_type": source_type,
#                 "query_embedding": vector,
#                 "top_k": max(
#                     1,
#                     min(
#                         int(top_k),
#                         MAX_TOP_K,
#                     ),
#                 ),
#             },
#         ).mappings().all()

#     results: list[dict] = []

#     for row in rows:

#         similarity = float(
#             row["similarity"]
#             if row["similarity"] is not None
#             else 0.0
#         )

#         results.append(
#             {
#                 "id": row["id"],
#                 "source_type": row[
#                     "source_type"
#                 ],
#                 "source_name": row[
#                     "source_name"
#                 ],
#                 "content": row[
#                     "content"
#                 ],
#                 "interview_id": row[
#                     "interview_id"
#                 ],
#                 "similarity": round(
#                     similarity,
#                     4,
#                 ),
#             }
#         )

#     return results


# # ============================================================
# # GENERAL RETRIEVAL API
# # ============================================================

# def retrieve_context(
#     db: Session,
#     *,
#     user_id: int,
#     query: str,
#     top_k: int = DEFAULT_TOP_K,
#     source_types: Optional[list[str]] = None,
#     interview_id: Optional[int] = None,
# ) -> list[dict]:
#     """
#     General-purpose semantic retrieval.

#     This function is kept for compatibility with the rest
#     of the application.

#     If source_types is provided, retrieval is restricted
#     to those source types.

#     If source_types is not provided, it performs a balanced
#     retrieval across the important source categories.
#     """

#     if not user_id:
#         return []

#     query = _clean_text(
#         query
#     )

#     if not query:
#         return []

#     ensure_rag_schema(
#         db
#     )

#     query_embedding = embed_query(
#         query
#     )

#     if not query_embedding:
#         return []

#     # --------------------------------------------------------
#     # Explicit source filtering
#     # --------------------------------------------------------

#     if source_types:

#         normalized_sources = [
#             source.strip().lower()
#             for source in source_types
#             if source and source.strip()
#         ]

#         if not normalized_sources:
#             return []

#         results: list[dict] = []

#         per_source = max(
#             1,
#             int(top_k)
#             // len(normalized_sources),
#         )

#         for source_type in normalized_sources:

#             # Resume data is interview-specific when a current
#             # interview is available. This prevents a previous
#             # interview's resume from leaking into the current one.
#             interview_specific = (
#                 source_type
#                 in {
#                     "resume",
#                     "job_description",
#                     "interview_preferences",
#                 }
#             )

#             matches = _retrieve_source(
#                 db,
#                 user_id=user_id,
#                 query_embedding=query_embedding,
#                 source_type=source_type,
#                 top_k=per_source,
#                 interview_id=interview_id,
#                 interview_specific=interview_specific,
#             )

#             results.extend(
#                 matches
#             )

#         results.sort(
#             key=lambda item: item[
#                 "similarity"
#             ],
#             reverse=True,
#         )

#         return results[
#             :max(
#                 1,
#                 min(
#                     int(top_k),
#                     MAX_TOP_K,
#                 ),
#             )
#         ]

#     # --------------------------------------------------------
#     # Balanced retrieval
#     # --------------------------------------------------------

#     results = []

#     # Resume
#     results.extend(
#         _retrieve_source(
#             db,
#             user_id=user_id,
#             query_embedding=query_embedding,
#             source_type="resume",
#             top_k=RESUME_TOP_K,
#             interview_id=interview_id,
#             interview_specific=False,
#         )
#     )

#     # Job description
#     results.extend(
#         _retrieve_source(
#             db,
#             user_id=user_id,
#             query_embedding=query_embedding,
#             source_type="job_description",
#             top_k=JOB_DESCRIPTION_TOP_K,
#             interview_id=interview_id,
#             interview_specific=True,
#         )
#     )

#     # Preferences
#     if interview_id is not None:

#         results.extend(
#             _retrieve_source(
#                 db,
#                 user_id=user_id,
#                 query_embedding=query_embedding,
#                 source_type="interview_preferences",
#                 top_k=PREFERENCES_TOP_K,
#                 interview_id=interview_id,
#                 interview_specific=True,
#             )
#         )

#     # Previous interview performance
#     results.extend(
#         _retrieve_source(
#             db,
#             user_id=user_id,
#             query_embedding=query_embedding,
#             source_type="interview_performance",
#             top_k=PERFORMANCE_TOP_K,
#             interview_id=interview_id,
#             interview_specific=False,
#         )
#     )

#     # Sort strongest matches first while keeping all
#     # source categories available.
#     results.sort(
#         key=lambda item: item[
#             "similarity"
#         ],
#         reverse=True,
#     )

#     return results[
#         :max(
#             1,
#             min(
#                 int(top_k) + 2,
#                 MAX_TOP_K,
#             ),
#         )
#     ]


# # ============================================================
# # SOURCE-SPECIFIC HELPERS
# # ============================================================

# def retrieve_resume_context(
#     db: Session,
#     *,
#     user_id: int,
#     query: str,
#     interview_id: Optional[int] = None,
#     top_k: int = RESUME_TOP_K,
# ) -> list[dict]:
#     """
#     Retrieve candidate resume information.
#     """

#     if not user_id:
#         return []

#     query_embedding = embed_query(
#         query
#     )

#     return _retrieve_source(
#         db,
#         user_id=user_id,
#         query_embedding=query_embedding,
#         source_type="resume",
#         top_k=top_k,
#         interview_id=interview_id,
#         interview_specific=interview_id is not None,
#     )


# def retrieve_job_description_context(
#     db: Session,
#     *,
#     user_id: int,
#     query: str,
#     interview_id: Optional[int] = None,
#     top_k: int = JOB_DESCRIPTION_TOP_K,
# ) -> list[dict]:
#     """
#     Retrieve the job description for the current interview.

#     If interview_id is supplied, only that interview's JD
#     is returned.
#     """

#     if not user_id:
#         return []

#     if interview_id is None:
#         return []

#     query_embedding = embed_query(
#         query
#     )

#     return _retrieve_source(
#         db,
#         user_id=user_id,
#         query_embedding=query_embedding,
#         source_type="job_description",
#         top_k=top_k,
#         interview_id=interview_id,
#         interview_specific=True,
#     )


# def retrieve_preferences_context(
#     db: Session,
#     *,
#     user_id: int,
#     query: str,
#     interview_id: Optional[int] = None,
#     top_k: int = PREFERENCES_TOP_K,
# ) -> list[dict]:
#     """
#     Retrieve interview-specific preferences.
#     """

#     if not user_id:
#         return []

#     if interview_id is None:
#         return []

#     query_embedding = embed_query(
#         query
#     )

#     return _retrieve_source(
#         db,
#         user_id=user_id,
#         query_embedding=query_embedding,
#         source_type="interview_preferences",
#         top_k=top_k,
#         interview_id=interview_id,
#         interview_specific=True,
#     )


# def retrieve_performance_context(
#     db: Session,
#     *,
#     user_id: int,
#     query: str,
#     top_k: int = PERFORMANCE_TOP_K,
# ) -> list[dict]:
#     """
#     Retrieve previous interview performance.
#     """

#     if not user_id:
#         return []

#     query_embedding = embed_query(
#         query
#     )

#     return _retrieve_source(
#         db,
#         user_id=user_id,
#         query_embedding=query_embedding,
#         source_type="interview_performance",
#         top_k=top_k,
#         interview_id=None,
#         interview_specific=False,
#     )


# # ============================================================
# # BUILD PERSONALIZED RAG CONTEXT
# # ============================================================

# def build_rag_context(
#     db: Session,
#     *,
#     user_id: int,
#     query: str,
#     top_k: int = DEFAULT_TOP_K,
#     interview_id: Optional[int] = None,
# ) -> str:
#     """
#     Build structured RAG context for the interview engine.

#     IMPORTANT:

#     The old implementation performed one vector search:

#         resume + JD + preferences + performance
#                          ↓
#                       top_k

#     That could omit the resume or JD.

#     This implementation retrieves each source independently:

#         RESUME
#         JOB DESCRIPTION
#         PREFERENCES
#         PERFORMANCE

#     and then combines them into a structured context.

#     This is specifically designed for personalized interviews.
#     """

#     if not user_id:
#         return ""

#     query = _clean_text(
#         query
#     )

#     if not query:
#         return ""

#     try:

#         ensure_rag_schema(
#             db
#         )

#         # ----------------------------------------------------
#         # One query embedding is generated and reused.
#         # ----------------------------------------------------

#         query_embedding = embed_query(
#             query
#         )

#         if not query_embedding:
#             return ""

#         # ----------------------------------------------------
#         # Candidate Resume
#         # ----------------------------------------------------

#         resume_matches = _retrieve_source(
#             db,
#             user_id=user_id,
#             query_embedding=query_embedding,
#             source_type="resume",
#             top_k=RESUME_TOP_K,
#             interview_id=interview_id,
#             interview_specific=interview_id is not None,
#         )

#         # ----------------------------------------------------
#         # Current Job Description
#         # ----------------------------------------------------

#         job_matches = []

#         if interview_id is not None:

#             job_matches = _retrieve_source(
#                 db,
#                 user_id=user_id,
#                 query_embedding=query_embedding,
#                 source_type="job_description",
#                 top_k=JOB_DESCRIPTION_TOP_K,
#                 interview_id=interview_id,
#                 interview_specific=True,
#             )

#         # ----------------------------------------------------
#         # Interview Preferences
#         # ----------------------------------------------------

#         preference_matches = []

#         if interview_id is not None:

#             preference_matches = _retrieve_source(
#                 db,
#                 user_id=user_id,
#                 query_embedding=query_embedding,
#                 source_type="interview_preferences",
#                 top_k=PREFERENCES_TOP_K,
#                 interview_id=interview_id,
#                 interview_specific=True,
#             )

#         # ----------------------------------------------------
#         # Previous Interview Performance
#         # ----------------------------------------------------

#         performance_matches = _retrieve_source(
#             db,
#             user_id=user_id,
#             query_embedding=query_embedding,
#             source_type="interview_performance",
#             top_k=PERFORMANCE_TOP_K,
#             interview_id=None,
#             interview_specific=False,
#         )

#         # ----------------------------------------------------
#         # Build structured sections.
#         #
#         # We intentionally keep source identity visible to
#         # Gemini so it knows what is resume information and
#         # what is job-description information.
#         # ----------------------------------------------------

#         sections: list[str] = []

#         # ====================================================
#         # RESUME
#         # ====================================================

#         if resume_matches:

#             lines = [
#                 "=== CANDIDATE RESUME ===",
#                 (
#                     "Use this section as the source of truth "
#                     "for the candidate's actual experience, "
#                     "projects, skills and technologies."
#                 ),
#                 "",
#             ]

#             for index, item in enumerate(
#                 resume_matches,
#                 1,
#             ):

#                 lines.append(
#                     f"[Resume Chunk {index}] "
#                     f"Source: {item['source_name']} "
#                     f"| Similarity: "
#                     f"{item['similarity']}"
#                 )

#                 lines.append(
#                     item["content"]
#                 )

#                 lines.append("")

#             sections.append(
#                 "\n".join(lines)
#             )

#         # ====================================================
#         # JOB DESCRIPTION
#         # ====================================================

#         if job_matches:

#             lines = [
#                 "=== CURRENT JOB DESCRIPTION ===",
#                 (
#                     "Use this section to understand the "
#                     "requirements of the specific role."
#                 ),
#                 "",
#             ]

#             for index, item in enumerate(
#                 job_matches,
#                 1,
#             ):

#                 lines.append(
#                     f"[Job Description Chunk {index}] "
#                     f"Source: {item['source_name']} "
#                     f"| Similarity: "
#                     f"{item['similarity']}"
#                 )

#                 lines.append(
#                     item["content"]
#                 )

#                 lines.append("")

#             sections.append(
#                 "\n".join(lines)
#             )

#         # ====================================================
#         # INTERVIEW PREFERENCES
#         # ====================================================

#         if preference_matches:

#             lines = [
#                 "=== INTERVIEW PREFERENCES ===",
#                 "",
#             ]

#             for index, item in enumerate(
#                 preference_matches,
#                 1,
#             ):

#                 lines.append(
#                     f"[Preference {index}] "
#                     f"Similarity: "
#                     f"{item['similarity']}"
#                 )

#                 lines.append(
#                     item["content"]
#                 )

#                 lines.append("")

#             sections.append(
#                 "\n".join(lines)
#             )

#         # ====================================================
#         # PREVIOUS PERFORMANCE
#         # ====================================================

#         if performance_matches:

#             lines = [
#                 "=== PREVIOUS INTERVIEW PERFORMANCE ===",
#                 (
#                     "Use this only when it is relevant to "
#                     "adapting the current interview."
#                 ),
#                 "",
#             ]

#             for index, item in enumerate(
#                 performance_matches,
#                 1,
#             ):

#                 lines.append(
#                     f"[Performance Chunk {index}] "
#                     f"Source: {item['source_name']} "
#                     f"| Similarity: "
#                     f"{item['similarity']}"
#                 )

#                 lines.append(
#                     item["content"]
#                 )

#                 lines.append("")

#             sections.append(
#                 "\n".join(lines)
#             )

#         if not sections:
#             return ""

#         # ----------------------------------------------------
#         # Final context
#         # ----------------------------------------------------

#         context = (
#             "\n\n------------------------------\n\n"
#         ).join(
#             sections
#         )

#         return context.strip()

#     except Exception as exc:

#         # ----------------------------------------------------
#         # RAG should not make the complete interview unusable.
#         #
#         # However, print the actual error so that during
#         # development we can see if retrieval is failing.
#         # ----------------------------------------------------

#         print(
#             f"[RAG ERROR] build_rag_context failed: {exc}"
#         )

#         db.rollback()

#         return ""


# # ============================================================
# # DEBUG RAG RETRIEVAL
# # ============================================================

# def debug_rag_context(
#     db: Session,
#     *,
#     user_id: int,
#     query: str,
#     interview_id: Optional[int] = None,
# ) -> dict:
#     """
#     Development helper.

#     This allows us to inspect exactly what RAG retrieves
#     before Gemini generates the interview question.
#     """

#     if not user_id:
#         return {
#             "user_id": user_id,
#             "interview_id": interview_id,
#             "query": query,
#             "resume": [],
#             "job_description": [],
#             "preferences": [],
#             "performance": [],
#         }

#     query = _clean_text(
#         query
#     )

#     if not query:
#         return {
#             "user_id": user_id,
#             "interview_id": interview_id,
#             "query": query,
#             "resume": [],
#             "job_description": [],
#             "preferences": [],
#             "performance": [],
#         }

#     try:

#         ensure_rag_schema(
#             db
#         )

#         query_embedding = embed_query(
#             query
#         )

#         if not query_embedding:
#             return {
#                 "user_id": user_id,
#                 "interview_id": interview_id,
#                 "query": query,
#                 "resume": [],
#                 "job_description": [],
#                 "preferences": [],
#                 "performance": [],
#             }

#         resume = _retrieve_source(
#             db,
#             user_id=user_id,
#             query_embedding=query_embedding,
#             source_type="resume",
#             top_k=RESUME_TOP_K,
#             interview_id=interview_id,
#             interview_specific=interview_id is not None,
#         )

#         job_description = []

#         if interview_id is not None:

#             job_description = _retrieve_source(
#                 db,
#                 user_id=user_id,
#                 query_embedding=query_embedding,
#                 source_type="job_description",
#                 top_k=JOB_DESCRIPTION_TOP_K,
#                 interview_id=interview_id,
#                 interview_specific=True,
#             )

#         preferences = []

#         if interview_id is not None:

#             preferences = _retrieve_source(
#                 db,
#                 user_id=user_id,
#                 query_embedding=query_embedding,
#                 source_type="interview_preferences",
#                 top_k=PREFERENCES_TOP_K,
#                 interview_id=interview_id,
#                 interview_specific=True,
#             )

#         performance = _retrieve_source(
#             db,
#             user_id=user_id,
#             query_embedding=query_embedding,
#             source_type="interview_performance",
#             top_k=PERFORMANCE_TOP_K,
#             interview_id=None,
#             interview_specific=False,
#         )

#         return {
#             "user_id": user_id,
#             "interview_id": interview_id,
#             "query": query,
#             "resume": resume,
#             "job_description": job_description,
#             "preferences": preferences,
#             "performance": performance,
#         }

#     except Exception as exc:

#         print(
#             f"[RAG DEBUG ERROR] {exc}"
#         )

#         db.rollback()

#         return {
#             "user_id": user_id,
#             "interview_id": interview_id,
#             "query": query,
#             "resume": [],
#             "job_description": [],
#             "preferences": [],
#             "performance": [],
#             "error": str(exc),
#         }


# # ============================================================
# # INDEX PREVIOUS INTERVIEW PERFORMANCE
# # ============================================================

# def index_interview_performance(
#     db: Session,
#     *,
#     user_id: int,
#     role: str,
#     interview_type: str,
#     difficulty: str,
#     questions_and_answers: str,
#     final_feedback: str,
# ) -> int:
#     """
#     Store completed interview performance in the user's
#     long-term RAG knowledge.

#     This information can later be used to adapt future
#     interviews.
#     """

#     content = f"""
# Previous interview performance

# Role:
# {role}

# Interview type:
# {interview_type}

# Difficulty:
# {difficulty}

# Question and answer history:
# {questions_and_answers}

# Final coaching feedback:
# {final_feedback}
# """

#     return index_text(
#         db,
#         user_id=user_id,
#         content=content,
#         source_type="interview_performance",
#         source_name=f"{role} interview performance",
#         interview_id=None,
#         replace=False,
#     )



#.....................new3.............................
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