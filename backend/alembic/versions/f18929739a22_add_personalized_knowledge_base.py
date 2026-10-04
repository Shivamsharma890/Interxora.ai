"""add personalized knowledge base

Revision ID: f18929739a22
Revises: b30c3773ec9a
Create Date: 2026-09-19 19:17:55.542063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'f18929739a22'
down_revision: Union[str, Sequence[str], None] = 'b30c3773ec9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=40), nullable=False),
        sa.Column("source_name", sa.String(length=255), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "user_id",
            "source_type",
            "content_hash",
            name="uq_knowledge_document_user_source_hash",
        ),
    )

    op.create_index(
        "ix_knowledge_documents_user_id",
        "knowledge_documents",
        ["user_id"],
    )

    op.create_index(
        "ix_knowledge_documents_source_type",
        "knowledge_documents",
        ["source_type"],
    )

    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(768), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["knowledge_documents.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "document_id",
            "chunk_index",
            name="uq_knowledge_chunk_document_index",
        ),
    )

    op.create_index(
        "ix_knowledge_chunks_document_id",
        "knowledge_chunks",
        ["document_id"],
    )

    op.create_index(
        "ix_knowledge_chunks_user_id",
        "knowledge_chunks",
        ["user_id"],
    )

    op.create_index(
        "ix_knowledge_chunks_embedding_hnsw",
        "knowledge_chunks",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={
            "embedding": "vector_cosine_ops"
        },
    )

def downgrade():
    op.drop_index(
        "ix_knowledge_chunks_embedding_hnsw",
        table_name="knowledge_chunks",
    )

    op.drop_index(
        "ix_knowledge_chunks_user_id",
        table_name="knowledge_chunks",
    )

    op.drop_index(
        "ix_knowledge_chunks_document_id",
        table_name="knowledge_chunks",
    )

    op.drop_table("knowledge_chunks")

    op.drop_index(
        "ix_knowledge_documents_source_type",
        table_name="knowledge_documents",
    )

    op.drop_index(
        "ix_knowledge_documents_user_id",
        table_name="knowledge_documents",
    )

    op.drop_table("knowledge_documents")