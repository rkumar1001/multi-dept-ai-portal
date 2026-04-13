"""File upload API — /api/v1/upload"""

import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from app.middleware.auth_middleware import CurrentUser, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/upload", tags=["upload"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {
    ".txt", ".csv", ".json", ".xml",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".md", ".log", ".yaml", ".yml",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    content_type: str


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Upload a file attachment for use in chat."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB.",
        )

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = UPLOAD_DIR / safe_filename

    file_path.write_bytes(content)

    logger.info(f"File uploaded: {file.filename} ({len(content)} bytes) by user {current_user.id}")

    return UploadResponse(
        file_id=file_id,
        filename=file.filename,
        size=len(content),
        content_type=file.content_type or "application/octet-stream",
    )


def read_upload_as_text(file_id: str) -> str | None:
    """Read an uploaded file's content as text (for passing to AI).
    Returns None if the file is binary (image/pdf) or not found.
    """
    # Find the file by ID prefix
    for f in UPLOAD_DIR.iterdir():
        if f.stem == file_id:
            ext = f.suffix.lower()
            # Only read text-based files
            if ext in {".txt", ".csv", ".json", ".xml", ".md", ".log", ".yaml", ".yml"}:
                try:
                    text = f.read_text(encoding="utf-8", errors="replace")
                    # Truncate very large files
                    if len(text) > 15000:
                        text = text[:15000] + "\n\n... [truncated — file too large to include fully]"
                    return text
                except Exception:
                    return None
            elif ext in {".pdf", ".doc", ".docx", ".xls", ".xlsx"}:
                return f"[Binary file: {f.name} — content extraction not yet supported]"
            else:
                return f"[Image file: {f.name} — visual analysis not yet supported]"
    return None
