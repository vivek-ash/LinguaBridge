"""
Pydantic schemas for language information.
"""

from pydantic import BaseModel, Field


class LanguageInfo(BaseModel):
    """Public representation of a supported language."""
    code: str = Field(..., description="ISO 639-1 code")
    name: str = Field(..., description="English name")
    native_name: str = Field(..., description="Name in native script")
    flag: str = Field(..., description="Emoji flag")
    rtl: bool = Field(False, description="Right-to-left script")
    nllb_code: str = Field(..., description="NLLB/FLORES-200 language code")


class LanguageListResponse(BaseModel):
    """Response for GET /api/languages."""
    languages: list[LanguageInfo]
    total: int
