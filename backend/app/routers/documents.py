"""
Document translation router – upload, parse, translate, and export PDF/DOCX/TXT files.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Any
from urllib.parse import quote

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel, Field

from app.services.document import (
    parse_document_structured,
    detect_document_language,
    translate_document_structured,
    generate_docx_export,
    generate_txt_export,
    generate_pdf_export,
)

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB


class DocumentExportRequest(BaseModel):
    filename: str = Field(default="translated_document")
    format: str = Field(default="docx", description="'docx', 'pdf', or 'txt'")
    target_lang: str = Field(default="hi")
    source_lang: Optional[str] = Field(default=None)
    pages: Optional[list[dict[str, Any]]] = Field(default=None)
    paragraphs: Optional[list[Any]] = Field(default=None)


@router.post("/documents/parse")
async def parse_doc(
    file: UploadFile = File(...),
):
    """
    Parse an uploaded document into structured pages and paragraphs.
    Also automatically detects the document language.
    """
    ext = Path(file.filename or "doc.txt").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "Document too large. Maximum size is 15MB.")

    try:
        structured = parse_document_structured(content, ext)
        detection = detect_document_language(structured.get("all_paragraphs", []))

        return {
            "filename": file.filename,
            "format": ext,
            "size_bytes": len(content),
            "total_pages": structured.get("total_pages", 1),
            "total_paragraphs": len(structured.get("all_paragraphs", [])),
            "detected_language": detection,
            "pages": structured.get("pages", []),
        }
    except Exception as e:
        logger.error("Document parsing failed: %s", e)
        raise HTTPException(500, f"Document parsing failed: {str(e)}")


@router.post("/documents/translate")
async def translate_doc(
    file: UploadFile = File(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("hi"),
):
    """
    Upload and translate a document (PDF, DOCX, or TXT).
    Returns structured translated pages, paragraph mappings, and language metadata.
    """
    ext = Path(file.filename or "doc.txt").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "Document too large. Maximum size is 15MB.")

    try:
        structured = parse_document_structured(content, ext)
        translated = translate_document_structured(structured, source_lang, target_lang)

        return {
            "filename": file.filename,
            "format": ext,
            "size_bytes": len(content),
            "source_lang": translated["source_lang"],
            "detected_info": translated.get("detected_info"),
            "target_lang": translated["target_lang"],
            "total_pages": translated["total_pages"],
            "total_paragraphs": translated["total_paragraphs"],
            "pages": translated["pages"],
            "paragraphs": translated["paragraphs"],
        }
    except Exception as e:
        logger.error("Document translation failed: %s", e)
        raise HTTPException(500, f"Document translation failed: {str(e)}")


@router.post("/documents/export")
async def export_doc(payload: DocumentExportRequest):
    """
    Export translated document pages into a downloadable DOCX, PDF, or TXT file.
    """
    fmt = payload.format.lower().strip().lstrip(".")
    pages = payload.pages or []

    # If flat paragraphs provided instead of structured pages, reconstruct 1 page
    if not pages and payload.paragraphs:
        formatted_paras = []
        for p in payload.paragraphs:
            if isinstance(p, dict):
                formatted_paras.append(p)
            else:
                formatted_paras.append({"translated": str(p), "original": ""})
        pages = [{"page_number": 1, "paragraphs": formatted_paras}]

    clean_name = Path(payload.filename).stem or "translated_document"
    out_filename = f"{clean_name}_{payload.target_lang}.{fmt}"
    quoted_name = quote(out_filename)

    try:
        if fmt == "docx":
            file_bytes = generate_docx_export(
                title=clean_name,
                target_lang=payload.target_lang,
                pages=pages,
                source_lang=payload.source_lang,
            )
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif fmt == "pdf":
            file_bytes = generate_pdf_export(
                title=clean_name,
                target_lang=payload.target_lang,
                pages=pages,
                source_lang=payload.source_lang,
            )
            media_type = "application/pdf"
        elif fmt in ("txt", "md"):
            file_bytes = generate_txt_export(
                title=clean_name,
                target_lang=payload.target_lang,
                pages=pages,
                source_lang=payload.source_lang,
            )
            media_type = "text/plain; charset=utf-8"
        else:
            raise HTTPException(400, f"Unsupported export format: {fmt}. Use docx, pdf, or txt.")

        return Response(
            content=file_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"; filename*=UTF-8\'\'{quoted_name}',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as e:
        logger.error("Document export failed: %s", e)
        raise HTTPException(500, f"Export failed: {str(e)}")
