"""
Analytics router – usage statistics and dashboard data.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter
from sqlalchemy import select, func, desc

from app.database import async_session
from app.models.analytics import UsageLog
from app.models.translation import TranslationHistory

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/analytics/summary")
async def analytics_summary():
    """Get usage summary stats."""
    async with async_session() as session:
        # Total translations
        total = (await session.execute(
            select(func.count(TranslationHistory.id))
        )).scalar() or 0

        # Total characters
        total_chars = (await session.execute(
            select(func.sum(func.length(TranslationHistory.source_text)))
        )).scalar() or 0

        # Average latency from usage logs
        avg_latency = (await session.execute(
            select(func.avg(UsageLog.latency_ms)).where(UsageLog.latency_ms > 0)
        )).scalar() or 0

        # Unique languages used
        src_langs = (await session.execute(
            select(func.count(func.distinct(TranslationHistory.source_lang)))
        )).scalar() or 0

        tgt_langs = (await session.execute(
            select(func.count(func.distinct(TranslationHistory.target_lang)))
        )).scalar() or 0

        # Favorites count
        favorites = (await session.execute(
            select(func.count(TranslationHistory.id)).where(TranslationHistory.is_favorite == True)
        )).scalar() or 0

        return {
            "total_translations": total,
            "total_characters": total_chars,
            "avg_latency_ms": round(float(avg_latency), 1),
            "languages_used": src_langs + tgt_langs,
            "favorites": favorites,
        }


@router.get("/analytics/languages")
async def top_languages():
    """Get most used languages."""
    async with async_session() as session:
        # Source languages
        src_result = await session.execute(
            select(
                TranslationHistory.source_lang,
                func.count(TranslationHistory.id).label("count"),
            )
            .group_by(TranslationHistory.source_lang)
            .order_by(desc("count"))
            .limit(10)
        )
        source_langs = [{"language": row[0], "count": row[1], "type": "source"} for row in src_result]

        # Target languages
        tgt_result = await session.execute(
            select(
                TranslationHistory.target_lang,
                func.count(TranslationHistory.id).label("count"),
            )
            .group_by(TranslationHistory.target_lang)
            .order_by(desc("count"))
            .limit(10)
        )
        target_langs = [{"language": row[0], "count": row[1], "type": "target"} for row in tgt_result]

        return {"source_languages": source_langs, "target_languages": target_langs}


@router.get("/analytics/daily")
async def daily_usage():
    """Get daily usage for the past 30 days."""
    async with async_session() as session:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        result = await session.execute(
            select(
                func.date(TranslationHistory.created_at).label("date"),
                func.count(TranslationHistory.id).label("count"),
            )
            .where(TranslationHistory.created_at >= thirty_days_ago)
            .group_by(func.date(TranslationHistory.created_at))
            .order_by("date")
        )

        data = [{"date": str(row[0]), "count": row[1]} for row in result]
        return {"daily_usage": data}
