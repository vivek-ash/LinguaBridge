"""
Translation history CRUD router.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, desc, func, delete

from app.database import async_session
from app.models.translation import TranslationHistory

logger = logging.getLogger(__name__)
router = APIRouter()


class HistoryCreate(BaseModel):
    source_text: str
    target_text: str
    source_lang: str
    target_lang: str
    detected_lang: Optional[str] = None
    confidence: Optional[float] = None


class HistoryResponse(BaseModel):
    id: int
    source_text: str
    target_text: str
    source_lang: str
    target_lang: str
    detected_lang: Optional[str] = None
    confidence: Optional[float] = None
    is_favorite: bool = False
    created_at: str


@router.get("/history")
async def list_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    lang: Optional[str] = None,
    favorites_only: bool = False,
):
    """List translation history, paginated."""
    async with async_session() as session:
        q = select(TranslationHistory).order_by(desc(TranslationHistory.created_at))

        if lang:
            q = q.where(
                (TranslationHistory.source_lang == lang) | (TranslationHistory.target_lang == lang)
            )
        if favorites_only:
            q = q.where(TranslationHistory.is_favorite == True)

        # Count
        count_q = select(func.count()).select_from(q.subquery())
        total = (await session.execute(count_q)).scalar() or 0

        # Paginate
        q = q.offset((page - 1) * limit).limit(limit)
        result = await session.execute(q)
        items = result.scalars().all()

        return {
            "items": [
                HistoryResponse(
                    id=item.id,
                    source_text=item.source_text,
                    target_text=item.target_text,
                    source_lang=item.source_lang,
                    target_lang=item.target_lang,
                    detected_lang=item.detected_lang,
                    confidence=item.confidence,
                    is_favorite=item.is_favorite,
                    created_at=item.created_at.isoformat() if item.created_at else "",
                )
                for item in items
            ],
            "total": total,
            "page": page,
            "limit": limit,
        }


@router.post("/history")
async def save_history(data: HistoryCreate):
    """Save a translation to history."""
    async with async_session() as session:
        entry = TranslationHistory(
            source_text=data.source_text,
            target_text=data.target_text,
            source_lang=data.source_lang,
            target_lang=data.target_lang,
            detected_lang=data.detected_lang,
            confidence=data.confidence,
        )
        session.add(entry)
        await session.commit()
        await session.refresh(entry)
        return {"id": entry.id, "status": "saved"}


@router.delete("/history/{item_id}")
async def delete_history(item_id: int):
    """Delete a history entry."""
    async with async_session() as session:
        result = await session.execute(
            select(TranslationHistory).where(TranslationHistory.id == item_id)
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(404, "History entry not found")
        await session.delete(entry)
        await session.commit()
        return {"status": "deleted"}


@router.post("/history/{item_id}/favorite")
async def toggle_favorite(item_id: int):
    """Toggle favorite status."""
    async with async_session() as session:
        result = await session.execute(
            select(TranslationHistory).where(TranslationHistory.id == item_id)
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(404, "History entry not found")
        entry.is_favorite = not entry.is_favorite
        await session.commit()
        return {"id": entry.id, "is_favorite": entry.is_favorite}


@router.get("/history/favorites")
async def list_favorites(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """List favorite translations."""
    async with async_session() as session:
        q = (
            select(TranslationHistory)
            .where(TranslationHistory.is_favorite == True)
            .order_by(desc(TranslationHistory.created_at))
        )
        count_q = select(func.count()).select_from(q.subquery())
        total = (await session.execute(count_q)).scalar() or 0

        q = q.offset((page - 1) * limit).limit(limit)
        result = await session.execute(q)
        items = result.scalars().all()

        return {
            "items": [
                HistoryResponse(
                    id=item.id,
                    source_text=item.source_text,
                    target_text=item.target_text,
                    source_lang=item.source_lang,
                    target_lang=item.target_lang,
                    detected_lang=item.detected_lang,
                    confidence=item.confidence,
                    is_favorite=item.is_favorite,
                    created_at=item.created_at.isoformat() if item.created_at else "",
                )
                for item in items
            ],
            "total": total,
            "page": page,
            "limit": limit,
        }


@router.delete("/history/clear")
async def clear_history():
    """Clear all translation history."""
    async with async_session() as session:
        await session.execute(delete(TranslationHistory))
        await session.commit()
        return {"status": "cleared"}
