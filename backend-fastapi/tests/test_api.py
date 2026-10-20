from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_uuid_validation():
    assert client.post("/api/assignments/confirm", json={"applicationId": "bad-id"}).status_code == 422
