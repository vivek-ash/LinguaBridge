"""
SQLAlchemy ORM models for translation-related tables:
TranslationHistory, GlossaryEntry.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TranslationHistory(Base):
    """Stores past translation requests for user history."""

    __tablename__ = "translation_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    target_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_lang: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    target_lang: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    detected_lang: Mapped[str | None] = mapped_column(String(10), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<TranslationHistory(id={self.id}, "
            f"src='{self.source_lang}', tgt='{self.target_lang}')>"
        )


class GlossaryEntry(Base):
    """User-defined glossary entries for customising translations."""

    __tablename__ = "glossary_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_term: Mapped[str] = mapped_column(String(500), nullable=False)
    target_term: Mapped[str] = mapped_column(String(500), nullable=False)
    source_lang: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    target_lang: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<GlossaryEntry(id={self.id}, "
            f"'{self.source_term}' -> '{self.target_term}')>"
        )
