"""
Document parsing, translation, and export service.
Supports PDF, DOCX, and TXT files with page-by-page extraction,
automatic language detection, and multi-format export.
"""

from __future__ import annotations

import io
import logging
import re
from pathlib import Path
from typing import Optional, Any

from app.services.translation import translate_text
from app.services.detection import detect_language

logger = logging.getLogger(__name__)


def parse_document(content: bytes, ext: str) -> list[str]:
    """Legacy helper returning flat paragraphs."""
    parsed = parse_document_structured(content, ext)
    return parsed.get("all_paragraphs", [])


def parse_document_structured(content: bytes, ext: str) -> dict[str, Any]:
    """Parse document bytes into structured pages and paragraphs."""
    ext = ext.lower()
    if ext == ".pdf":
        return _parse_pdf_structured(content)
    elif ext in (".docx", ".doc"):
        return _parse_docx_structured(content)
    else:
        return _parse_txt_structured(content)


def detect_document_language(paragraphs: list[str]) -> dict[str, Any]:
    """Detect language of a document from its initial substantive paragraphs."""
    sample_texts = [p.strip() for p in paragraphs if len(p.split()) >= 3][:5]
    if not sample_texts:
        # Fallback to any non-empty paragraph
        sample_texts = [p.strip() for p in paragraphs if p.strip()][:3]

    if not sample_texts:
        return {"language": "en", "confidence": 0.5, "language_name": "English"}

    sample = " ".join(sample_texts)
    try:
        det = detect_language(sample)
        return det
    except Exception as e:
        logger.warning("Document language detection error: %s", e)
        return {"language": "en", "confidence": 0.5, "language_name": "English"}


def translate_document(paragraphs: list[str], source_lang: str, target_lang: str) -> list[dict]:
    """Legacy helper translating flat paragraphs."""
    if source_lang == "auto":
        det = detect_document_language(paragraphs)
        actual_source = det.get("language", "en")
    else:
        actual_source = source_lang

    results = []
    for para in paragraphs:
        if not para.strip():
            continue
        tr = translate_text(para, actual_source, target_lang)
        results.append({
            "original": para,
            "translated": tr["translated_text"],
        })
    return results


def _translate_batch_fast(
    batch: list[str],
    source_lang: str,
    target_lang: str,
) -> list[str]:
    """Translate a small batch of paragraphs efficiently using NLLB greedy decoding."""
    from app.services.translation import nllb_code_for, _roman_hindi_to_deva, _fallback_translate
    from app.ml.model_manager import model_manager

    cleaned_batch = []
    for t in batch:
        if source_lang == "hi" and not re.search(r"[\u0900-\u097f]", t):
            cleaned_batch.append(_roman_hindi_to_deva(t))
        else:
            cleaned_batch.append(t)

    src_nllb = nllb_code_for(source_lang) or "eng_Latn"
    tgt_nllb = nllb_code_for(target_lang) or "hin_Deva"

    model, tokenizer = model_manager.get_nllb()
    if model is None or tokenizer is None:
        return [_fallback_translate(t, source_lang, target_lang)["translated_text"] for t in cleaned_batch]

    try:
        import torch
        tokenizer.src_lang = src_nllb
        inputs = tokenizer(
            cleaned_batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        )
        device = model_manager.device
        if device == "cuda":
            inputs = {k: v.to("cuda") for k, v in inputs.items()}

        tgt_lang_id = tokenizer.convert_tokens_to_ids(tgt_nllb)

        max_words = max(len(t.split()) for t in cleaned_batch) if cleaned_batch else 10
        budget = min(max(max_words * 2 + 24, 48), 256)

        with torch.no_grad():
            generated = model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                num_beams=1,
                max_new_tokens=budget,
            )

        decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)
        return decoded
    except Exception as e:
        logger.warning("Batch translation failed, falling back to sequential: %s", e)
        fallback_res = []
        for t in cleaned_batch:
            res = translate_text(t, source_lang, target_lang)
            fallback_res.append(res["translated_text"])
        return fallback_res


def translate_document_structured(
    structured_doc: dict[str, Any],
    source_lang: str,
    target_lang: str,
) -> dict[str, Any]:
    """Translate structured pages in batches, maintaining page numbers and paragraph mapping."""
    detected_info = None
    if source_lang == "auto":
        detected_info = detect_document_language(structured_doc.get("all_paragraphs", []))
        actual_source = detected_info.get("language", "en")
    else:
        actual_source = source_lang

    translated_pages = []
    all_translated = []

    for page in structured_doc.get("pages", []):
        page_num = page.get("page_number", 1)
        raw_paras = [p.strip() for p in page.get("paragraphs", []) if p.strip()]
        page_items = []

        # Batch 4 paragraphs at a time for optimal CPU throughput
        batch_size = 4
        for i in range(0, len(raw_paras), batch_size):
            chunk = raw_paras[i : i + batch_size]
            translated_chunk = _translate_batch_fast(chunk, actual_source, target_lang)
            for orig, tr in zip(chunk, translated_chunk):
                item = {
                    "original": orig,
                    "translated": tr,
                    "page": page_num,
                }
                page_items.append(item)
                all_translated.append(item)

        translated_pages.append({
            "page_number": page_num,
            "paragraphs": page_items,
        })

    return {
        "source_lang": actual_source,
        "detected_info": detected_info,
        "target_lang": target_lang,
        "total_pages": len(translated_pages),
        "total_paragraphs": len(all_translated),
        "pages": translated_pages,
        "paragraphs": all_translated,
    }


def _clean_page_lines_to_paragraphs(text: str) -> list[str]:
    """Group lines into coherent paragraphs preserving bullet points, headers, and sentences."""
    if not text or not text.strip():
        return []

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    paragraphs = []
    current: list[str] = []

    for line in lines:
        is_bullet = bool(re.match(r"^[•\-\*▪▫–—\d+\.]\s*", line))
        is_header = len(line) < 50 and (line.isupper() or line.endswith(":") or not re.search(r"[\.\,]", line))
        prev_ended = current and bool(re.search(r"[\.\:\!\?।॥]$", current[-1]))
        prev_was_short = current and len(current[-1]) < 35

        if is_bullet or is_header or prev_ended or prev_was_short:
            if current:
                paragraphs.append(" ".join(current))
                current = []
            current.append(line)
        else:
            current.append(line)

    if current:
        paragraphs.append(" ".join(current))

    # Clean and filter
    results = []
    for p in paragraphs:
        p_clean = re.sub(r"\s+", " ", p).strip()
        if p_clean:
            results.append(p_clean)
    return results


def _parse_pdf_structured(content: bytes) -> dict[str, Any]:
    """Extract text from PDF page by page."""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(content))
        total = len(reader.pages)
        pages = []
        all_paras = []

        for idx, page in enumerate(reader.pages):
            raw_text = page.extract_text() or ""
            paras = _clean_page_lines_to_paragraphs(raw_text)
            if not paras and raw_text.strip():
                paras = [raw_text.strip()]

            pages.append({
                "page_number": idx + 1,
                "paragraphs": paras,
                "raw_text": raw_text,
            })
            all_paras.extend(paras)

        if not all_paras:
            all_paras = ["(No readable text found in PDF. The file may contain scanned image pages.)"]
            pages = [{"page_number": 1, "paragraphs": all_paras, "raw_text": ""}]

        return {
            "total_pages": len(pages),
            "pages": pages,
            "all_paragraphs": all_paras,
        }
    except Exception as e:
        logger.error("PDF parsing failed: %s", e)
        fallback_msg = f"(PDF parsing failed: {str(e)})"
        return {
            "total_pages": 1,
            "pages": [{"page_number": 1, "paragraphs": [fallback_msg], "raw_text": ""}],
            "all_paragraphs": [fallback_msg],
        }


def _parse_docx_structured(content: bytes) -> dict[str, Any]:
    """Extract text from DOCX and group into logical pages."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        all_paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

        if not all_paras:
            all_paras = ["(Empty DOCX document)"]

        # Group paragraphs into pages (~6 paragraphs per logical page)
        pages = []
        chunk_size = 6
        for idx in range(0, len(all_paras), chunk_size):
            chunk = all_paras[idx : idx + chunk_size]
            pages.append({
                "page_number": (idx // chunk_size) + 1,
                "paragraphs": chunk,
                "raw_text": "\n\n".join(chunk),
            })

        return {
            "total_pages": len(pages),
            "pages": pages,
            "all_paragraphs": all_paras,
        }
    except Exception as e:
        logger.error("DOCX parsing failed: %s", e)
        fallback_msg = f"(DOCX parsing failed: {str(e)})"
        return {
            "total_pages": 1,
            "pages": [{"page_number": 1, "paragraphs": [fallback_msg], "raw_text": ""}],
            "all_paragraphs": [fallback_msg],
        }


def _parse_txt_structured(content: bytes) -> dict[str, Any]:
    """Extract text from plain text and partition into pages."""
    text = ""
    for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            text = content.decode(enc)
            break
        except Exception:
            continue
    if not text:
        text = content.decode("utf-8", errors="replace")

    # If form-feed \f exists (traditional page break in text), split by it
    if "\f" in text:
        raw_pages = text.split("\f")
        pages = []
        all_paras = []
        for idx, p_text in enumerate(raw_pages):
            paras = [p.strip() for p in p_text.split("\n\n") if p.strip()]
            if not paras and p_text.strip():
                paras = [p_text.strip()]
            pages.append({
                "page_number": idx + 1,
                "paragraphs": paras,
                "raw_text": p_text,
            })
            all_paras.extend(paras)
        return {
            "total_pages": len(pages),
            "pages": pages,
            "all_paragraphs": all_paras or ["(Empty text file)"],
        }

    all_paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not all_paras and text.strip():
        all_paras = [text.strip()]
    if not all_paras:
        all_paras = ["(Empty text file)"]

    pages = []
    chunk_size = 6
    for idx in range(0, len(all_paras), chunk_size):
        chunk = all_paras[idx : idx + chunk_size]
        pages.append({
            "page_number": (idx // chunk_size) + 1,
            "paragraphs": chunk,
            "raw_text": "\n\n".join(chunk),
        })

    return {
        "total_pages": len(pages),
        "pages": pages,
        "all_paragraphs": all_paras,
    }


# ─── EXPORT GENERATORS ────────────────────────────────────────────────────────

def generate_docx_export(
    title: str,
    target_lang: str,
    pages: list[dict],
    source_lang: Optional[str] = None,
) -> bytes:
    """Generate a clean styled Microsoft Word (.docx) document."""
    from docx import Document
    from docx.shared import Pt, Inches, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()

    # Document Header Title
    title_p = doc.add_paragraph()
    title_run = title_p.add_run(title)
    title_run.font.size = Pt(18)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(124, 58, 237) # LinguaBridge Purple
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Subtitle / Metadata
    sub_p = doc.add_paragraph()
    lang_info = f"LinguaBridge Translation • "
    if source_lang:
        lang_info += f"{source_lang.upper()} → "
    lang_info += f"{target_lang.upper()}"
    sub_run = sub_p.add_run(lang_info)
    sub_run.font.size = Pt(10)
    sub_run.font.color.rgb = RGBColor(107, 114, 128)
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph()  # spacing

    for page_idx, page in enumerate(pages):
        page_num = page.get("page_number", page_idx + 1)
        if page_idx > 0:
            doc.add_page_break()

        # Page Heading
        p_hdr = doc.add_paragraph()
        p_hdr_run = p_hdr.add_run(f"Page {page_num}")
        p_hdr_run.font.size = Pt(12)
        p_hdr_run.font.bold = True
        p_hdr_run.font.color.rgb = RGBColor(79, 70, 229)

        paras = page.get("paragraphs", [])
        for p in paras:
            text = p.get("translated", "") if isinstance(p, dict) else str(p)
            if not text.strip():
                continue
            para_obj = doc.add_paragraph()
            para_obj.paragraph_format.line_spacing = 1.2
            para_obj.paragraph_format.space_after = Pt(8)
            run = para_obj.add_run(text)
            run.font.size = Pt(11)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def generate_txt_export(
    title: str,
    target_lang: str,
    pages: list[dict],
    source_lang: Optional[str] = None,
) -> bytes:
    """Generate a clean plain text export."""
    lines = [
        f"==================================================",
        f"  {title}",
        f"  LinguaBridge Translation ({target_lang.upper()})",
        f"==================================================",
        "",
    ]
    for page_idx, page in enumerate(pages):
        page_num = page.get("page_number", page_idx + 1)
        lines.append(f"--- PAGE {page_num} ---")
        lines.append("")
        paras = page.get("paragraphs", [])
        for p in paras:
            text = p.get("translated", "") if isinstance(p, dict) else str(p)
            if text.strip():
                lines.append(text.strip())
                lines.append("")
        lines.append("")

    return "\n".join(lines).encode("utf-8")


def generate_pdf_export(
    title: str,
    target_lang: str,
    pages: list[dict],
    source_lang: Optional[str] = None,
) -> bytes:
    """Generate a formatted PDF export via ReportLab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    import os

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    # Try registering Arial or Nirmala if available
    font_name = "Helvetica"
    font_bold = "Helvetica-Bold"
    font_paths = [
        ("Nirmala", "C:\\Windows\\Fonts\\Nirmala.ttc"),
        ("Arial", "C:\\Windows\\Fonts\\arial.ttf"),
    ]
    for name, p in font_paths:
        if os.path.exists(p):
            try:
                from reportlab.pdfbase import pdfmetrics
                from reportlab.pdfbase.ttfonts import TTFont
                pdfmetrics.registerFont(TTFont(name, p))
                font_name = name
                font_bold = name
                break
            except Exception:
                pass

    margin = 54
    line_height = 16

    for page_idx, page in enumerate(pages):
        page_num = page.get("page_number", page_idx + 1)
        y = height - margin

        # Header
        c.setFont(font_bold, 14)
        c.setFillColorRGB(0.48, 0.23, 0.93)
        c.drawString(margin, y, title[:50])
        y -= 20

        c.setFont(font_name, 9)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(margin, y, f"LinguaBridge Translation • Target: {target_lang.upper()} • Page {page_num}")
        y -= 10

        c.setStrokeColorRGB(0.85, 0.85, 0.85)
        c.line(margin, y, width - margin, y)
        y -= 24

        # Body paragraphs
        c.setFont(font_name, 10)
        c.setFillColorRGB(0.1, 0.1, 0.1)

        paras = page.get("paragraphs", [])
        for p in paras:
            text = p.get("translated", "") if isinstance(p, dict) else str(p)
            if not text.strip():
                continue

            # Word wrap text to fit width
            words = text.split()
            current_line = []
            for word in words:
                test_line = " ".join(current_line + [word])
                if c.stringWidth(test_line, font_name, 10) < (width - 2 * margin):
                    current_line.append(word)
                else:
                    if current_line:
                        c.drawString(margin, y, " ".join(current_line))
                        y -= line_height
                    current_line = [word]
                    if y < margin + 40:
                        break
            if current_line and y >= margin + 40:
                c.drawString(margin, y, " ".join(current_line))
                y -= (line_height + 8)

            if y < margin + 40:
                break

        # Footer
        c.setFont(font_name, 8)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawCentredString(width / 2, margin / 2, f"Page {page_num}")

        c.showPage()

    c.save()
    return buf.getvalue()
