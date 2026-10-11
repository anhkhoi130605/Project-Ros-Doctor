"""Bounded, overlapping source spans with explicit boundary quality."""

from __future__ import annotations

import logging
import re
from bisect import bisect_right
from collections.abc import Callable
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TextSpan:
    start: int
    end: int
    boundary: str


def split_spans(text: str, size: int, overlap: int, length: Callable[[str], int], prefix: str = "") -> list[TextSpan]:
    if (
        isinstance(size, bool)
        or not isinstance(size, int)
        or isinstance(overlap, bool)
        or not isinstance(overlap, int)
        or size <= 0
        or overlap < 0
        or overlap >= size
    ):
        raise ValueError("Require positive size and 0 <= overlap < size")
    if length(prefix) >= size:
        raise ValueError("Prefix consumes the entire chunk budget")
    if not text:
        return []
    # Boundary detection: prioritize table end/rows, paragraphs, sentences, lines, and words.
    table_row_ends = [
        m.end() for m in re.finditer(r"(?:^[ \t]*\|.+?\|[ \t]*(?:\r?\n|$))", text, flags=re.MULTILINE)
    ]
    boundaries = [
        ("table_row", table_row_ends),
        ("paragraph", [m.end() for m in re.finditer(r"(?:\r?\n)[ \t]*(?:\r?\n)", text)]),
        ("sentence", [m.end() for m in re.finditer(r"[.!?。！？][ \t]+", text)]),
        ("line", [m.end() for m in re.finditer(r"\r?\n", text)]),
        ("word", [m.end() for m in re.finditer(r"\s+", text)]),
    ]
    spans: list[TextSpan] = []
    start = previous_end = 0
    while start < len(text):
        # Bound tokenizer work to a window around this chunk instead of repeatedly
        # encoding the entire remaining document (quadratic on long sources).
        probe = min(len(text), start + size)
        fit = start
        while length(prefix + text[start:probe]) <= size:
            fit = probe
            if probe == len(text):
                break
            probe = min(len(text), start + 2 * (probe - start))
        if fit == len(text):
            spans.append(TextSpan(start, fit, "end"))
            break
        # Search character offsets, measuring the actual prefixed representation.
        # Token counts need not be monotonic: this finds a checked fitting span,
        # not necessarily the mathematically longest possible token prefix.
        low, high = fit + 1, probe
        while low <= high:
            middle = (low + high) // 2
            if length(prefix + text[start:middle]) <= size:
                fit, low = middle, middle + 1
            else:
                high = middle - 1
        # A non-monotonic tokenizer can hide a fitting boundary from binary search,
        # even beyond the first failing probe. Only the rare no-progress path scans
        # remaining character boundaries before declaring this text unsplittable.
        if fit <= max(start, previous_end):
            attempts = 0
            for candidate in range(max(start, previous_end) + 1, len(text) + 1):
                attempts += 1
                if length(prefix + text[start:candidate]) <= size:
                    fit = candidate
                    break
            logger.info("Budget fallback checked %d boundaries; progress=%s", attempts, fit > max(start, previous_end))
        if fit <= previous_end and start < previous_end:
            start = previous_end  # Never let overlap prevent forward progress.
            continue
        if fit == start:
            raise ValueError("chunk_size is too small to hold a Unicode character with the section prefix")
        end, kind = fit, "unicode"
        # Avoid tiny fragments merely to follow an early paragraph boundary.
        minimum = max(previous_end + 1, start + max(1, (fit - start) // 2))
        for name, positions in boundaries:
            index = bisect_right(positions, fit) - 1
            while index >= 0 and positions[index] >= minimum:
                candidate = positions[index]
                if length(prefix + text[start:candidate]) <= size:
                    end, kind = candidate, name
                    break
                index -= 1
            if kind != "unicode":
                break
        spans.append(TextSpan(start, end, kind))
        if not overlap:
            start = previous_end = end
            continue
        # Keep a suffix within the requested budget, without decoding token bytes.
        low, high, next_start = start + 1, end, end
        while low <= high:
            middle = (low + high) // 2
            if length(text[middle:end]) <= overlap:
                next_start, high = middle, middle - 1
            else:
                low = middle + 1
        start, previous_end = next_start, end
    return spans
