import json

import pytest

from src.config import Settings, load_shared_mongo_settings


def config_file(tmp_path, content):
    path = tmp_path / "appsettings.json"
    path.write_text(json.dumps(content), encoding="utf-8")
    return str(path)


def test_shared_mongo_settings_load_exact_database(tmp_path, monkeypatch):
    monkeypatch.delenv("MONGO_DATABASE_NAME", raising=False)
    path = config_file(
        tmp_path,
        {
            "MongoDbSettings": {
                "ConnectionString": "mongodb://example.invalid:27017",
                "DatabaseName": "existing_database",
            }
        },
    )
    settings = Settings(_env_file=None, mongo_connection_string="", mongo_settings_file=path)
    resolved = load_shared_mongo_settings(settings)
    assert resolved.mongo_connection_string == "mongodb://example.invalid:27017"
    assert resolved.mongo_database_name == "existing_database"
    assert settings.mongo_connection_string == ""


def test_explicit_uri_does_not_read_file(tmp_path):
    settings = Settings(
        _env_file=None,
        mongo_connection_string="mongodb://explicit.invalid:27017",
        mongo_database_name="explicit_db",
        mongo_settings_file=str(tmp_path / "missing.json"),
    )
    assert load_shared_mongo_settings(settings) is settings


def test_explicit_database_takes_precedence(tmp_path):
    path = config_file(
        tmp_path,
        {
            "MongoDbSettings": {
                "ConnectionString": "mongodb://example.invalid:27017",
                "DatabaseName": "file_database",
            }
        },
    )
    settings = Settings(
        _env_file=None, mongo_connection_string="", mongo_settings_file=path, mongo_database_name="explicit_database"
    )
    assert load_shared_mongo_settings(settings).mongo_database_name == "explicit_database"


@pytest.mark.parametrize(
    "section",
    [
        None,
        {},
        {"ConnectionString": "private-secret-invalid"},
        {"ConnectionString": "mongodb://example.invalid", "DatabaseName": ""},
    ],
)
def test_invalid_shared_file_has_safe_error(tmp_path, section):
    path = config_file(tmp_path, {"MongoDbSettings": section})
    settings = Settings(_env_file=None, mongo_connection_string="", mongo_settings_file=path)
    with pytest.raises(ValueError, match="MONGO_SETTINGS_FILE") as error:
        load_shared_mongo_settings(settings)
    assert "private-secret-invalid" not in str(error.value)


def test_file_is_opt_in():
    settings = Settings(_env_file=None, mongo_connection_string="", mongo_settings_file=None)
    assert load_shared_mongo_settings(settings) is settings
