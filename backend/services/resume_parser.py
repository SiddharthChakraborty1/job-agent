import io
import logging
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber

logger = logging.getLogger(__name__)


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from a PDF or TXT file.

    Raises:
        ValueError: for unsupported file extension or empty extracted text.
    """
    suffix = Path(filename).suffix.lower()

    if suffix == ".pdf":
        text = _extract_pdf(file_bytes)
    elif suffix == ".txt":
        text = file_bytes.decode("utf-8", errors="replace")
    else:
        raise ValueError(f"Unsupported file type: '{suffix}'. Only .pdf and .txt are accepted.")

    stripped = text.strip()
    if not stripped:
        raise ValueError("empty")
    return stripped


def _extract_pdf(file_bytes: bytes) -> str:
    """Try pdfplumber first; fall back to PyMuPDF if no text extracted."""
    text = _try_pdfplumber(file_bytes)
    if text.strip():
        return text
    logger.warning("pdfplumber returned no text; falling back to PyMuPDF.")
    return _try_pymupdf(file_bytes)


def _try_pdfplumber(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages)


def _try_pymupdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages)
