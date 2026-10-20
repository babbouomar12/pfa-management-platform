from uuid import UUID, uuid4
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.engine import Engine
from .policy import all_members_confirmed, capacity_reached


class AssignmentError(Exception):
    def __init__(self, message: str, status_code: int = 409):
        super().__init__(message)
        self.status_code = status_code


def confirm_assignment(engine: Engine, application_id: UUID) -> dict:
    try:
        with engine.begin() as conn:
            # Initial lookup; the quota row serializes assignments for teacher/campaign.
            preliminary = conn.execute(text("SELECT teacher_id, campaign_id FROM applications WHERE id=:id"), {"id": application_id}).mappings().first()
            if preliminary is None:
                raise AssignmentError("Candidature introuvable.", 404)
            quota = conn.execute(text("""SELECT max_pfa FROM teacher_capacities
                WHERE teacher_id=:teacher AND campaign_id=:campaign FOR UPDATE"""),
                {"teacher": preliminary["teacher_id"], "campaign": preliminary["campaign_id"]}).mappings().first()
            if quota is None:
                raise AssignmentError("Aucune capacité définie pour cet enseignant et cette campagne.")
            application = conn.execute(text("""SELECT * FROM applications WHERE id=:id FOR UPDATE"""), {"id": application_id}).mappings().first()
            if application is None:
                raise AssignmentError("Candidature introuvable.", 404)
            if (application["teacher_id"] != preliminary["teacher_id"] or
                    application["campaign_id"] != preliminary["campaign_id"]):
                raise AssignmentError("Candidature modifiée pendant la confirmation.")
            if application["status"] != "FAVORABLE":
                raise AssignmentError("Seule une candidature favorable peut être affectée.")
            group = conn.execute(text("""SELECT campaign_id FROM pfa_groups WHERE id=:id"""), {"id": application["group_id"]}).mappings().first()
            if group is None or group["campaign_id"] != application["campaign_id"]:
                raise AssignmentError("Groupe incompatible avec la campagne.")
            members = conn.execute(text("""SELECT student_id, confirmed_at FROM group_members WHERE group_id=:id ORDER BY student_id"""),
                                   {"id": application["group_id"]}).mappings().all()
            if not all_members_confirmed(members):
                raise AssignmentError("Tous les membres doivent confirmer leur participation.")
            member_ids = [m["student_id"] for m in members]
            # Stable lock order prevents concurrent teachers assigning the same student.
            for student_id in member_ids:
                locked = conn.execute(text("""SELECT id FROM students WHERE id=:id FOR UPDATE"""), {"id": student_id}).first()
                if locked is None:
                    raise AssignmentError("Étudiant introuvable dans le groupe.")
            if application["subject_id"] is not None:
                subject = conn.execute(text("""SELECT * FROM subjects WHERE id=:id"""), {"id": application["subject_id"]}).mappings().first()
                if (subject is None or not subject["is_available"] or
                        subject["teacher_id"] != application["teacher_id"] or
                        subject["campaign_id"] != application["campaign_id"]):
                    raise AssignmentError("Le sujet demandé est indisponible ou incohérent.")
                if conn.execute(text("""SELECT id FROM assignments WHERE subject_id=:id"""), {"id": application["subject_id"]}).first():
                    raise AssignmentError("Ce sujet a déjà été attribué.")
            count = conn.execute(text("""SELECT count(*) FROM assignments WHERE teacher_id=:teacher AND campaign_id=:campaign"""),
                                 {"teacher": application["teacher_id"], "campaign": application["campaign_id"]}).scalar_one()
            if capacity_reached(count, quota["max_pfa"]):
                raise AssignmentError("Capacité d’encadrement atteinte.")
            for student_id in member_ids:
                exists = conn.execute(text("""SELECT 1 FROM assignment_members WHERE campaign_id=:campaign AND student_id=:student"""),
                                      {"campaign": application["campaign_id"], "student": student_id}).first()
                if exists:
                    raise AssignmentError("Au moins un étudiant est déjà affecté à un PFA.")
            assignment_id = uuid4()
            conn.execute(text("""INSERT INTO assignments (id,application_id,campaign_id,teacher_id,group_id,subject_id)
                VALUES (:id,:application,:campaign,:teacher,:group,:subject)"""), {
                "id":assignment_id, "application":application_id,"campaign":application["campaign_id"],
                "teacher":application["teacher_id"],"group":application["group_id"],"subject":application["subject_id"]})
            for student_id in member_ids:
                conn.execute(text("""INSERT INTO assignment_members (assignment_id, student_id, campaign_id)
                    VALUES (:assignment,:student,:campaign)"""), {"assignment":assignment_id,"student":student_id,"campaign":application["campaign_id"]})
            conn.execute(text("""UPDATE applications SET status='AFFECTEE' WHERE id=:id"""), {"id":application_id})
            return {"assignmentId": str(assignment_id), "applicationId": str(application_id),
                    "campaignId": str(application["campaign_id"]), "teacherId": str(application["teacher_id"]),
                    "memberIds": [str(x) for x in member_ids], "status": "AFFECTEE"}
    except IntegrityError as exc:
        if getattr(exc.orig, "sqlstate", None) == "23505":
            raise AssignmentError("Conflit d’unicité : étudiant, sujet ou candidature déjà affecté.") from exc
        raise
    except OperationalError as exc:
        if getattr(exc.orig, "sqlstate", None) in {"40P01", "40001"}:
            raise AssignmentError("Conflit transactionnel, veuillez réessayer.") from exc
        raise
