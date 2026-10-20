"""Run against disposable local PostgreSQL seeded via compose.yml.

These tests use demo IDs, so skip by default until seed content is verified.
"""
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

pytestmark = pytest.mark.skipif(os.getenv("RUN_PFA_DB_TESTS") != "1", reason="Requires dedicated PostgreSQL test DB")


def test_missing_application():
    response = TestClient(app).post("/api/assignments/confirm", json={"applicationId": "00000000-0000-0000-0000-000000000000"})
    assert response.status_code == 404
