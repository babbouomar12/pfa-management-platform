from contextlib import asynccontextmanager
from uuid import UUID
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
from .db import get_engine
from .service import confirm_assignment, AssignmentError


class ConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    applicationId: UUID


app = FastAPI(title="PFA Management — UC06", version="0.2.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/assignments/confirm", status_code=201)
def confirm(payload: ConfirmRequest):
    try:
        return confirm_assignment(get_engine(), payload.applicationId)
    except AssignmentError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
