"""Deterministic source-membership checks; not a semantic truth verifier."""
import re


def report_citations_supported(output: dict, sources: list, context: str) -> bool:
    report = output.get("report")
    if not isinstance(report, dict):
        return True
    available: dict[str, set[str]] = {}
    for source in sources:
        if isinstance(source, str):
            headings = available.setdefault(source, set())
            block = re.search(r"### Playbook " + re.escape(source) + r":\n(.*?)(?=\n\n### Playbook |\Z)",
                              context, re.DOTALL)
            if block:
                headings.update(m.strip() for m in re.findall(r"^#{1,6}\s+(.+)$", block[1], re.MULTILINE))
        elif isinstance(source, dict):
            name = source.get("source_file") or source.get("source_collection")
            if name:
                headings = available.setdefault(name, set())
                for key in ("section", "title"):
                    value = source.get(key)
                    if isinstance(value, str):
                        headings.update(part.strip() for part in value.split(" > "))
                        headings.add(value.strip())
    for fault in report.get("faults") or []:
        if not isinstance(fault, dict):
            continue
        citation = fault.get("citation")
        if citation is None:
            continue
        if not isinstance(citation, dict):
            return False
        name = citation.get("source_file", "")
        heading = citation.get("heading", "")
        if not name and not heading:
            continue
        if not context.strip() or name not in available:
            return False
        if heading and heading not in available[name]:
            return False
    return True
