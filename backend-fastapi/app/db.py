import os
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


def get_engine() -> Engine:
    url = os.getenv("DATABASE_URL", "postgresql+psycopg://pfa:pfa@localhost:5433/pfa_db")
    return create_engine(url, pool_pre_ping=True)
