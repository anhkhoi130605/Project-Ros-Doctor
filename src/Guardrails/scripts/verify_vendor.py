"""Verify the retained NeMo source snapshot without importing its runtime."""

import ast
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fingerprint(target):
    paths = (
        sorted(
            (
                path
                for path in target.rglob("*")
                if path.is_file()
                and "__pycache__" not in path.parts
                and path.suffix not in (".pyc", ".pyo")
            ),
            key=lambda path: path.relative_to(ROOT).as_posix(),
        )
        if target.is_dir()
        else [target]
    )
    records = [
        path.relative_to(ROOT).as_posix() + ":" + hashlib.sha256(path.read_bytes()).hexdigest()
        for path in paths
    ]
    digest = hashlib.sha256("\n".join(records).encode("utf-8")).hexdigest()
    return {"files": len(paths), "sha256": digest}


def verify():
    manifest = json.loads((ROOT / "VENDOR_MANIFEST.json").read_text(encoding="utf-8"))
    errors = []
    for name, expected in manifest["preserved"].items():
        target = ROOT / name
        if not target.exists():
            errors.append(f"Missing preserved group: {name}")
        elif fingerprint(target) != expected:
            errors.append(f"Preserved group changed: {name}")

    for name in manifest["required_resources"]:
        if not (ROOT / name).is_file():
            errors.append(f"Missing test resource: {name}")

    python_files = list((ROOT / "nemoguardrails").rglob("*.py"))
    python_files.extend((ROOT / "scripts").rglob("*.py"))
    checked_docs = set()
    for path in sorted(python_files):
        try:
            tree = ast.parse(path.read_bytes(), filename=str(path))
        except (SyntaxError, ValueError) as error:
            errors.append(f"Invalid Python: {path.relative_to(ROOT)}: {error}")
            continue
        if path.name != "rail.py":
            continue
        for node in ast.walk(tree):
            if (
                isinstance(node, ast.keyword)
                and node.arg == "docs_url"
                and isinstance(node.value, ast.Constant)
                and isinstance(node.value.value, str)
            ):
                url = node.value.value
                if url.startswith(("http://", "https://")):
                    continue
                checked_docs.add(url)
                if not (ROOT / url).is_file():
                    errors.append(f"Missing catalog documentation: {url}")

    if errors:
        raise SystemExit("\n".join(errors))
    print(
        json.dumps(
            {
                "status": "passed",
                "preserved_groups": len(manifest["preserved"]),
                "runtime_files": manifest["preserved"]["nemoguardrails/"]["files"],
                "test_files": manifest["preserved"]["tests/"]["files"],
                "python_files_parsed": len(python_files),
                "catalog_doc_paths_checked": len(checked_docs),
                "runtime_tests_executed": False,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    verify()
