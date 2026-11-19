"""
Glossary CRUD router – manage custom term translations.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, desc, func

from app.database import async_session
from app.models.translation import GlossaryEntry

logger = logging.getLogger(__name__)
router = APIRouter()


class GlossaryCreate(BaseModel):
    source_term: str = Field(..., min_length=1, max_length=500)
    target_term: str = Field(..., min_length=1, max_length=500)
    source_lang: str
    target_lang: str


class GlossaryResponse(BaseModel):
    id: int
    source_term: str
    target_term: str
    source_lang: str
    target_lang: str
    created_at: str


@router.get("/glossary")
async def list_glossary(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    source_lang: Optional[str] = None,
    target_lang: Optional[str] = None,
):
    """List glossary entries."""
    async with async_session() as session:
        q = select(GlossaryEntry).order_by(desc(GlossaryEntry.created_at))

        if source_lang:
            q = q.where(GlossaryEntry.source_lang == source_lang)
        if target_lang:
            q = q.where(GlossaryEntry.target_lang == target_lang)

        count_q = select(func.count()).select_from(q.subquery())
        total = (await session.execute(count_q)).scalar() or 0

        q = q.offset((page - 1) * limit).limit(limit)
        result = await session.execute(q)
        items = result.scalars().all()

        return {
            "items": [
                GlossaryResponse(
                    id=item.id,
                    source_term=item.source_term,
                    target_term=item.target_term,
                    source_lang=item.source_lang,
                    target_lang=item.target_lang,
                    created_at=item.created_at.isoformat() if item.created_at else "",
                )
                for item in items
            ],
            "total": total,
            "page": page,
            "limit": limit,
        }


@router.post("/glossary")
async def add_glossary_entry(data: GlossaryCreate):
    """Add a glossary entry."""
    async with async_session() as session:
        entry = GlossaryEntry(
            source_term=data.source_term,
            target_term=data.target_term,
            source_lang=data.source_lang,
            target_lang=data.target_lang,
        )
        session.add(entry)
        await session.commit()
        await session.refresh(entry)
        return {"id": entry.id, "status": "created"}


@router.delete("/glossary/{entry_id}")
async def delete_glossary_entry(entry_id: int):
    """Delete a glossary entry."""
    async with async_session() as session:
        result = await session.execute(
            select(GlossaryEntry).where(GlossaryEntry.id == entry_id)
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(404, "Glossary entry not found")
        await session.delete(entry)
        await session.commit()
        return {"status": "deleted"}
