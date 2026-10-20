"""UC06 PostgreSQL integration + concurrency scenarios.

Runs only with RUN_PFA_DB_TESTS=1. Uses disposable pfa_test_db only.
All tables are truncated between scenarios; NEVER point DATABASE_URL at production.
"""
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_PFA_DB_TESTS") != "1", reason="Set RUN_PFA_DB_TESTS=1 with an isolated PostgreSQL test database"
)


def uid():
    return str(uuid4())


@pytest.fixture
def db():
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        pytest.fail("DATABASE_URL must point to a dedicated test database")
    parsed = make_url(url)
    if not parsed.drivername.startswith("postgresql") or parsed.database != "pfa_test_db":
        pytest.fail("Safety check: these destructive tests require database named pfa_test_db")
    engine = create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        actual = conn.execute(text("SELECT current_database() ")).scalar_one()
        assert actual == "pfa_test_db"
        conn.execute(text("TRUNCATE TABLE assignment_members, assignments, applications, group_members, subjects, pfa_groups, teacher_capacities, students, teachers, campaigns RESTART IDENTITY CASCADE"))
    yield engine
    engine.dispose()


def seed(db, *, teacher=None, campaign=None, students=2, max_pfa=2, confirmed=True, status="FAVORABLE", subject=True, group_members=None):
    """Create one independent application and group in the disposable DB."""
    teacher = teacher or uid()
    campaign = campaign or uid()
    group = uid()
    application = uid()
    subj = uid() if subject else None
    student_ids = group_members or [uid() for _ in range(students)]
    with db.begin() as c:
        c.execute(text("INSERT INTO campaigns(id,title) VALUES (:id,'Campagne de test') ON CONFLICT DO NOTHING"), {"id": campaign})
        c.execute(text("INSERT INTO teachers(id,name) VALUES (:id,'Enseignant test') ON CONFLICT DO NOTHING"), {"id": teacher})
        c.execute(text("INSERT INTO teacher_capacities(teacher_id,campaign_id,max_pfa) VALUES (:teacher,:campaign,:max) ON CONFLICT DO NOTHING"), {"teacher": teacher,"campaign": campaign,"max": max_pfa})
        c.execute(text("INSERT INTO pfa_groups(id,campaign_id,name) VALUES (:id,:campaign,'Groupe test')"), {"id": group,"campaign": campaign})
        for sid in student_ids:
            c.execute(text("INSERT INTO students(id,name) VALUES (:id,'Étudiant test') ON CONFLICT DO NOTHING"), {"id": sid})
            c.execute(text("INSERT INTO group_members(group_id,student_id,confirmed_at) VALUES (:group,:sid, CASE WHEN :confirmed THEN now() ELSE NULL END)"), {"group": group,"sid": sid,"confirmed": confirmed})
        if subj:
            c.execute(text("INSERT INTO subjects(id,campaign_id,teacher_id,title,is_available) VALUES (:id,:campaign,:teacher,'Sujet test',true)"), {"id": subj,"campaign": campaign,"teacher": teacher})
        c.execute(text("""INSERT INTO applications(id,campaign_id,teacher_id,group_id,subject_id,project_title,status)
                          VALUES (:id,:campaign,:teacher,:group,:subject,'Projet test',:status)"""),
                  {"id": application,"campaign": campaign,"teacher": teacher,"group": group,"subject": subj,"status": status})
    return {"application": application,"campaign": campaign,"teacher": teacher,"group": group,"students": student_ids,"subject": subj}


def confirm(application):
    with TestClient(app) as client:
        return client.post("/api/assignments/confirm", json={"applicationId": application})


def scalar(db, sql, **params):
    with db.connect() as c:
        return c.execute(text(sql), params).scalar_one()


def test_affectation_nominale_atomique(db):
    a = seed(db, students=2)
    response = confirm(a["application"])
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "AFFECTEE"
    assert set(data["memberIds"]) == set(a["students"])
    assert scalar(db, "SELECT count(*) FROM assignments") == 1
    assert scalar(db, "SELECT count(*) FROM assignment_members") == 2
    assert scalar(db, "SELECT status FROM applications WHERE id=:id", id=a["application"]) == "AFFECTEE"


def test_reconfirmation_refusee_sans_doublon(db):
    a = seed(db)
    assert confirm(a["application"]).status_code == 201
    assert confirm(a["application"]).status_code == 409
    assert scalar(db, "SELECT count(*) FROM assignments") == 1
    assert scalar(db, "SELECT count(*) FROM assignment_members") == 2


def test_membre_non_confirme_aucune_ecriture(db):
    a = seed(db, confirmed=False)
    assert confirm(a["application"]).status_code == 409
    assert scalar(db, "SELECT count(*) FROM assignments") == 0
    assert scalar(db, "SELECT count(*) FROM assignment_members") == 0
    assert scalar(db, "SELECT status FROM applications WHERE id=:id", id=a["application"]) == "FAVORABLE"


def test_candidature_non_favorable_aucune_ecriture(db):
    a = seed(db, status="EN_ATTENTE")
    assert confirm(a["application"]).status_code == 409
    assert scalar(db, "SELECT count(*) FROM assignments") == 0
    assert scalar(db, "SELECT status FROM applications WHERE id=:id", id=a["application"]) == "EN_ATTENTE"


def test_capacite_atteinte(db):
    first = seed(db, max_pfa=1)
    second = seed(db, teacher=first["teacher"], campaign=first["campaign"], max_pfa=1)
    assert confirm(first["application"]).status_code == 201
    assert confirm(second["application"]).status_code == 409
    assert scalar(db, "SELECT count(*) FROM assignments") == 1


def test_double_affectation_deux_enseignants(db):
    first = seed(db, students=1)
    second = seed(db, campaign=first["campaign"], group_members=first["students"])
    assert confirm(first["application"]).status_code == 201
    assert confirm(second["application"]).status_code == 409
    assert scalar(db, "SELECT count(*) FROM assignments") == 1
    assert scalar(db, "SELECT count(*) FROM assignment_members") == 1


def parallel_confirm(applications):
    barrier = Barrier(len(applications))
    def worker(app_id):
        barrier.wait(timeout=10)
        return confirm(app_id).status_code
    with ThreadPoolExecutor(max_workers=len(applications)) as pool:
        futures = [pool.submit(worker, app_id) for app_id in applications]
        return [f.result(timeout=20) for f in futures]


def test_concurrence_derniere_place(db):
    first = seed(db, students=1, max_pfa=1)
    second = seed(db, teacher=first["teacher"], campaign=first["campaign"], students=1, max_pfa=1)
    codes = parallel_confirm([first["application"], second["application"]])
    assert sorted(codes) == [201, 409]
    assert scalar(db, "SELECT count(*) FROM assignments") == 1
    assert scalar(db, "SELECT count(*) FROM assignment_members") == 1


def test_concurrence_meme_etudiant_deux_enseignants(db):
    first = seed(db, students=1)
    second = seed(db, campaign=first["campaign"], group_members=first["students"])
    codes = parallel_confirm([first["application"], second["application"]])
    assert sorted(codes) == [201, 409]
    assert scalar(db, "SELECT count(*) FROM assignments") == 1
    assert scalar(db, "SELECT count(*) FROM assignment_members") == 1
