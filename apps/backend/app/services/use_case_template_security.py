from __future__ import annotations

import hashlib
import os
import re
import shutil
import stat
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath


class UseCaseTemplateSecurityError(RuntimeError):
    pass


DEFAULT_MAX_UPLOAD_BYTES = int(os.getenv("USE_CASE_TEMPLATE_MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))
DEFAULT_MAX_EXTRACTED_BYTES = int(
    os.getenv("USE_CASE_TEMPLATE_MAX_EXTRACTED_BYTES", str(150 * 1024 * 1024))
)
DEFAULT_MAX_FILE_COUNT = int(os.getenv("USE_CASE_TEMPLATE_MAX_FILE_COUNT", "500"))

FORBIDDEN_SEGMENTS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".env",
}
FORBIDDEN_PATH_PATTERNS = (
    "dbt/target",
    "dbt\\target",
)
FORBIDDEN_FILENAME_TOKENS = {"secret", "secrets", "credential", "credentials"}
FORBIDDEN_SUFFIXES = {".pem", ".key", ".p12", ".pfx"}
ALLOWED_SCRIPT_LOCATIONS = {
    ("validation", ".sh"),
    ("validation", ".py"),
    ("demo-data/generator", ".py"),
}
SAFE_TEXT_SUFFIXES = {
    ".yaml",
    ".yml",
    ".json",
    ".md",
    ".txt",
    ".sql",
    ".csv",
    ".tsv",
    ".py",
    ".sh",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".html",
    ".css",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".ico",
    ".pdf",
}


@dataclass
class ExtractionResult:
    root_folder: str
    file_count: int
    extracted_bytes: int
    sha256: str
    files: list[str]


def _normalize_zip_path(name: str) -> PurePosixPath:
    normalized = name.replace("\\", "/")
    if normalized.startswith("/") or re.match(r"^[A-Za-z]:", normalized):
        raise UseCaseTemplateSecurityError(f"Absolute archive path is not allowed: {name}")

    path = PurePosixPath(normalized)
    if ".." in path.parts:
        raise UseCaseTemplateSecurityError(f"Path traversal is not allowed: {name}")
    return path


def _is_symlink(info: zipfile.ZipInfo) -> bool:
    mode = (info.external_attr >> 16) & 0xFFFF
    return stat.S_ISLNK(mode)


def _assert_safe_path(path: PurePosixPath) -> None:
    lower_parts = [part.lower() for part in path.parts]
    for part in lower_parts:
        if part.startswith(".") and part not in {".well-known"}:
            raise UseCaseTemplateSecurityError(f"Hidden files or folders are not allowed: {path}")
        if part in FORBIDDEN_SEGMENTS:
            raise UseCaseTemplateSecurityError(f"Forbidden file or folder detected: {path}")
        if part in FORBIDDEN_FILENAME_TOKENS:
            raise UseCaseTemplateSecurityError(f"Forbidden credential-like asset detected: {path}")

    normalized = "/".join(lower_parts)
    for pattern in FORBIDDEN_PATH_PATTERNS:
        if pattern in normalized:
            raise UseCaseTemplateSecurityError(f"Forbidden build artifact detected: {path}")

    suffix = path.suffix.lower()
    if suffix in FORBIDDEN_SUFFIXES:
        raise UseCaseTemplateSecurityError(f"Private key or certificate material is not allowed: {path}")

    if suffix in {".sh", ".py"}:
        relative_parent = "/".join(lower_parts[:-1])
        if (relative_parent, suffix) not in ALLOWED_SCRIPT_LOCATIONS:
            raise UseCaseTemplateSecurityError(
                f"Executable script is only allowed in validation/ or demo-data/generator/: {path}"
            )
    elif suffix and suffix not in SAFE_TEXT_SUFFIXES:
        raise UseCaseTemplateSecurityError(f"Unexpected executable or binary asset detected: {path}")


def safe_extract_package_zip(
    zip_path: Path,
    destination: Path,
    *,
    max_upload_bytes: int = DEFAULT_MAX_UPLOAD_BYTES,
    max_extracted_bytes: int = DEFAULT_MAX_EXTRACTED_BYTES,
    max_file_count: int = DEFAULT_MAX_FILE_COUNT,
) -> ExtractionResult:
    if not zip_path.is_file():
        raise UseCaseTemplateSecurityError(f"ZIP file not found: {zip_path}")

    file_size = zip_path.stat().st_size
    if file_size > max_upload_bytes:
        raise UseCaseTemplateSecurityError(
            f"ZIP exceeds max upload size ({file_size} > {max_upload_bytes} bytes)"
        )

    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)

    digest = hashlib.sha256()
    with zip_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    archive_sha = digest.hexdigest()

    with zipfile.ZipFile(zip_path) as archive:
        infos = [info for info in archive.infolist() if not info.is_dir()]
        if not infos:
            raise UseCaseTemplateSecurityError("ZIP archive is empty")
        if len(infos) > max_file_count:
            raise UseCaseTemplateSecurityError(
                f"ZIP contains too many files ({len(infos)} > {max_file_count})"
            )

        extracted_bytes = 0
        root_folders: set[str] = set()
        safe_members: list[tuple[zipfile.ZipInfo, PurePosixPath]] = []
        extracted_files: list[str] = []

        for info in infos:
            if _is_symlink(info):
                raise UseCaseTemplateSecurityError(f"Symlinks are not allowed in package archives: {info.filename}")

            zip_path_posix = _normalize_zip_path(info.filename)
            if len(zip_path_posix.parts) < 2:
                raise UseCaseTemplateSecurityError(
                    "ZIP must contain a single top-level root folder with package files beneath it"
                )

            root_folders.add(zip_path_posix.parts[0])
            relative_path = PurePosixPath(*zip_path_posix.parts[1:])
            _assert_safe_path(relative_path)
            extracted_bytes += info.file_size
            if extracted_bytes > max_extracted_bytes:
                raise UseCaseTemplateSecurityError(
                    f"ZIP exceeds max extracted size ({extracted_bytes} > {max_extracted_bytes} bytes)"
                )

            safe_members.append((info, relative_path))
            extracted_files.append(relative_path.as_posix())

        if len(root_folders) != 1:
            raise UseCaseTemplateSecurityError(
                f"ZIP must contain exactly one root folder; found {len(root_folders)}"
            )

        for info, relative_path in safe_members:
            target_path = destination / relative_path.as_posix()
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info) as source, target_path.open("wb") as target:
                shutil.copyfileobj(source, target)

    return ExtractionResult(
        root_folder=next(iter(root_folders)),
        file_count=len(infos),
        extracted_bytes=extracted_bytes,
        sha256=archive_sha,
        files=sorted(extracted_files),
    )
