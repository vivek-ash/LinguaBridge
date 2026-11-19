"""
SQLAlchemy ORM model for usage analytics / logging.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UsageLog(Base):
    """Logs every translation-related action for analytics."""

    __tablename__ = "usage_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_lang: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    target_lang: Mapped[str] = mapped_column(String(10), nullable=False)
    char_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<UsageLog(id={self.id}, action='{self.action_type}', "
            f"src='{self.source_lang}', tgt='{self.target_lang}')>"
        )
