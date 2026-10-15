import pytest

from src.safety.verdict import parse_verdict


@pytest.mark.parametrize("text,expected", [
    ('{"verdict":"SAFE"}', [True]),
    (' { "verdict": "UNSAFE" }\n', [False]),
])
def test_strict_verdict(text, expected):
    assert parse_verdict(text) == expected


@pytest.mark.parametrize("text", [
    "", "SAFE", "Safe, because this is harmless.", "UNSAFE", "uncertain",
    '```json\n{"verdict":"SAFE"}\n```', '{"verdict":"SAFE"',
    '{"verdict":"UNSAFE","verdict":"SAFE"}',
    '{"verdict":"SAFE","explanation":"actually unsafe"}',
    '{"verdict":true}', '{"verdict":"safe"}', '{"verdict":"MAYBE"}',
    '{"verdict":null}', '{"verdict":[]}', '{}', '[]', 'null',
    '{"verdict":"SAFE"} followed by UNSAFE', "x" * 257,
])
def test_malformed_or_ambiguous_verdicts_never_pass(text):
    with pytest.raises(ValueError):
        parse_verdict(text)
