# Local ROS Doctor vendor subset: upstream docs and benchmark targets removed.
.PHONY: help install test test-parallel test-serial test-coverage replay-cassettes verify-vendor pre-commit
.DEFAULT_GOAL := help

TEST ?=
ARGS ?=
WORKERS ?= auto
DIST ?= worksteal
PYTEST ?= uv run --locked pytest
UNIT_TEST_ENV ?= env -u OPENAI_API_KEY -u NVIDIA_API_KEY -u LIVE_TEST -u LIVE_TEST_MODE -u TEST_LIVE_MODE
FILES ?= README.md ROS_DOCTOR_GUIDE.md VENDOR_MANIFEST.json scripts/verify_vendor.py

install:
	uv sync --locked --group dev

test:
	$(UNIT_TEST_ENV) $(PYTEST) -n $(WORKERS) --dist $(DIST) $(ARGS) $(TEST)

test-parallel: test

test-serial:
	$(UNIT_TEST_ENV) $(PYTEST) $(ARGS) $(TEST)

test-coverage:
	$(UNIT_TEST_ENV) $(PYTEST) -n $(WORKERS) --dist $(DIST) --cov=nemoguardrails --cov-report=xml:coverage.xml $(ARGS) $(TEST)

replay-cassettes:
	$(UNIT_TEST_ENV) $(PYTEST) tests/recorded --block-network $(ARGS)

verify-vendor:
	uv run --locked --no-sync python scripts/verify_vendor.py

pre-commit:
	uv run --locked pre-commit run --config .pre-commit-config.yaml --files $(FILES)

help:
	@printf '%s\n' \
		'make install                         Install locked NeMo development dependencies' \
		'make verify-vendor                   Check the retained source snapshot offline' \
		'make test [TEST=path] [WORKERS=1]     Run upstream tests with live keys unset' \
		'make test-serial [TEST=path]          Run focused tests without xdist' \
		'make test-coverage                   Run package coverage' \
		'make replay-cassettes                Replay recorded tests without network' \
		'make pre-commit [FILES="path ..."]    Check explicitly selected local files' \
		'See ROS_DOCTOR_GUIDE.md for retained modules and integration status.'
