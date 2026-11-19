"""
Video utility functions – duration validation, metadata extraction.
"""

from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


def _get_ffprobe_path() -> str:
    """Find ffprobe binary – system PATH first, then derive from imageio-ffmpeg."""
    import shutil
    path = shutil.which("ffprobe")
    if path:
        return path
    try:
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        # ffprobe is typically in same dir or we can use ffmpeg with different args
        ffprobe = ffmpeg_path.replace("ffmpeg", "ffprobe")
        if Path(ffprobe).exists():
            return ffprobe
    except ImportError:
        pass
    return "ffprobe"


def get_video_duration(video_path: str) -> float:
    """
    Get video duration in seconds using ffprobe or ffmpeg.
    Returns 0.0 if unavailable.
    """
    import re
    # 1. Try ffprobe if available
    try:
        ffprobe = _get_ffprobe_path()
        cmd = [
            ffprobe,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            str(video_path),
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=30)
        if result.returncode == 0:
            info = json.loads(result.stdout)
            dur = float(info.get("format", {}).get("duration", 0))
            if dur > 0:
                return dur
    except Exception:
        pass

    # 2. Fallback to ffmpeg -i parsing
    try:
        import imageio_ffmpeg
        ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [ffmpeg_bin, "-i", str(video_path)]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        match = re.search(r"Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)", result.stderr)
        if match:
            hours, mins, secs = match.groups()
            return int(hours) * 3600 + int(mins) * 60 + float(secs)
    except Exception as exc:
        logger.warning("ffmpeg duration extraction failed: %s", exc)

    return 0.0


def validate_video_duration(video_path: str, max_seconds: float) -> tuple[bool, float]:
    """
    Validate that video is within the allowed duration.
    Returns (is_valid, actual_duration).
    """
    duration = get_video_duration(video_path)
    if duration <= 0:
        # Cannot determine duration – allow processing
        return True, duration
    return duration <= max_seconds, duration


def get_video_info(video_path: str) -> dict:
    """
    Get comprehensive video metadata using ffprobe.
    """
    info = {
        "duration": 0.0,
        "width": 0,
        "height": 0,
        "fps": 0.0,
        "codec": "",
        "size_bytes": 0,
    }

    try:
        info["size_bytes"] = Path(video_path).stat().st_size
    except OSError:
        pass

    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(video_path),
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=30)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            fmt = data.get("format", {})
            info["duration"] = float(fmt.get("duration", 0))

            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video":
                    info["width"] = int(stream.get("width", 0))
                    info["height"] = int(stream.get("height", 0))
                    info["codec"] = stream.get("codec_name", "")
                    # Parse fps from r_frame_rate like "30/1"
                    fps_str = stream.get("r_frame_rate", "0/1")
                    if "/" in fps_str:
                        num, den = fps_str.split("/")
                        info["fps"] = float(num) / max(float(den), 1)
                    break
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError, ValueError):
        pass

    return info
