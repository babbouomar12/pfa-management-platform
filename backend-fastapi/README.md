# Migration Python — PFA UC06

Première tranche verticale de remplacement de NestJS par FastAPI.

## Démarrage sous PowerShell

```powershell
cd backend-fastapi
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
docker compose up -d db
$env:DATABASE_URL = "postgresql+psycopg://pfa:pfa@localhost:5433/pfa_db"
python -m pytest -q
uvicorn app.main:app --reload --port 8000
```

Swagger : http://127.0.0.1:8000/docs

Le port PostgreSQL hôte est 5433 pour coexister avec l'ancien backend (5432).
Les scripts SQL reproduisent la structure du prototype existant. Les scripts d'initialisation ne tournent que si le volume Docker est neuf.

## Sécurité et vérification

- L'affectation utilise une transaction SQLAlchemy, un verrou sur le quota enseignant/campagne, des verrous sur les étudiants par ordre déterministe, et les contraintes d'unicité SQL.
- Les contrôles d'autorisation de l'enseignant et de période de campagne sont à implémenter avant toute utilisation réelle.
- Les tests transactionnels et concurrents sont portés dans `tests/test_uc06_transactions.py`. Le [run FastAPI sur `daa557f`](https://github.com/babbouomar12/pfa-management-platform/actions/runs/39421821410), dont le journal a été consulté le 22 novembre 2026, affiche **13 tests réussis** avec PostgreSQL 16. Cela valide les scénarios testés, sans revendiquer une équivalence de tous les comportements NestJS/FastAPI (notamment `400` contre `422` pour une entrée invalide).
- Sans `RUN_PFA_DB_TESTS=1`, neuf tests nécessitant PostgreSQL sont ignorés. Les tests transactionnels exigent une base jetable nommée `pfa_test_db` et vident leurs tables ; ne pas utiliser la base de démonstration ni une base contenant des données à conserver. Le [workflow CI](../.github/workflows/fastapi-ci.yml) montre l’initialisation du schéma dans cette base dédiée.
- Ne publiez pas de fichier `.env` ni de base de données.

## Documentation TP1 / 2TUP

- [Fiche UC06 et critères d’acceptation](../docs/UC06_AFFECTATION.md).
- [Rapport UP/2TUP, phases, itérations et traçabilité](../docs/TP1_PROCESSUS_UNIFIE_2TUP.md).
- [Classes et modules FastAPI](../docs/uml/construction/uc06_fastapi_classes.svg) ; [séquence de confirmation](../docs/uml/construction/uc06_fastapi_sequence.svg).
- [Résultats et limites de validation](../docs/NOTE_VALIDATION_UC06.md).
