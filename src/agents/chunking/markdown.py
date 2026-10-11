"""Lossless ATX heading segmentation: metadata is parsed, source text is never rewritten."""

from __future__ import annotations

import re
from dataclasses import dataclass

HEADING = re.compile(r"^ {0,3}(#{1,6})(?:[ \t]+(.*)|[ \t]*)$")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
LIST_ITEM = re.compile(r"^( {0,3})(?:[-+*]|\d{1,9}[.)])[ \t]+")
HTML_BLOCK_TAG = re.compile(
    r"^ {0,3}</?(?:address|article|aside|base|blockquote|body|caption|center|col|colgroup|dd|details|"
    r"dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|head|header|hr|html|iframe|"
    r"legend|li|link|main|menu|nav|ol|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|"
    r"title|tr|track|ul)(?:\s|/?>|$)",
    re.IGNORECASE,
)


def _html_end(body: str) -> re.Pattern | str | None:
    """Common raw HTML blocks; empty string means terminated by a blank line."""
    raw = re.match(r"^ {0,3}<(script|pre|style|textarea)(?:\s|>|$)", body, re.IGNORECASE)
    if raw:
        return re.compile(rf"</{raw[1]}\s*>", re.IGNORECASE)
    for opening, closing in (("<!--", "-->"), ("<?", "?>"), ("<![CDATA[", "]]>")):
        if body.lstrip(" ").startswith(opening):
            return re.compile(re.escape(closing))
    if re.match(r"^ {0,3}<![A-Z]", body):
        return re.compile(">")
    if HTML_BLOCK_TAG.match(body):
        return ""
    return None


@dataclass(frozen=True)
class MarkdownSection:
    start: int
    end: int
    headings: dict[str, str]


def markdown_sections(text: str, headers: list[tuple[str, str]]) -> list[MarkdownSection]:
    """Recognize ATX headings outside fenced/indented code; preserve every character.

    This is a source scanner, not a full CommonMark AST. Setext headings and
    headings nested in blockquotes/lists remain ordinary text.
    """
    names = dict(headers)
    for marker, name in headers:
        if not re.fullmatch(r"#{1,6}", marker) or not isinstance(name, str) or not name:
            raise ValueError("headers_to_split_on requires ATX markers # through ###### and non-empty names")
    if len(names) != len(headers) or len(set(names.values())) != len(headers):
        raise ValueError("Header markers and metadata names must be unique")
    result: list[MarkdownSection] = []
    active: dict[int, tuple[str, str]] = {}
    start = offset = 0
    fence_char = ""
    fence_size = 0
    html_end = None
    list_indent = None
    for line in text.splitlines(keepends=True):
        body = line.rstrip("\r\n")
        if html_end is not None:
            if (html_end == "" and not body.strip()) or (html_end != "" and html_end.search(body)):
                html_end = None
            offset += len(line)
            continue
        if not fence_char:
            item = LIST_ITEM.match(body)
            indent = len(body) - len(body.lstrip(" "))
            if item:
                list_indent = item.end()
            elif body.strip() and list_indent is not None and indent < list_indent:
                list_indent = None
            if item or (list_indent is not None and (not body.strip() or indent >= list_indent)):
                offset += len(line)
                continue
            html_end = _html_end(body)
            if html_end is not None:
                if (html_end == "" and not body.strip()) or (html_end != "" and html_end.search(body)):
                    html_end = None
                offset += len(line)
                continue
        fence = FENCE.match(body)
        if fence_char:
            if fence and fence[1][0] == fence_char and len(fence[1]) >= fence_size and not fence[2].strip():
                fence_char = ""
        elif fence and not (fence[1][0] == "`" and "`" in fence[2]):
            fence_char, fence_size = fence[1][0], len(fence[1])
        else:
            heading = HEADING.match(body)
            if heading:
                level = len(heading[1])
                if heading[1] in names or any(parent >= level for parent in active):
                    if offset > start:
                        result.append(MarkdownSection(start, offset, dict(active.values())))
                    active = {depth: value for depth, value in active.items() if depth < level}
                    if heading[1] in names:
                        title = re.sub(r"[ \t]+#+[ \t]*$", "", heading[2] or "").strip()
                        active[level] = (names[heading[1]], title)
                    start = offset
        offset += len(line)
    if offset > start:
        result.append(MarkdownSection(start, offset, dict(active.values())))
    return result
