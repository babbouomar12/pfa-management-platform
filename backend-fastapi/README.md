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
- Les tests E2E concurrentiels doivent encore être portés et validés contre PostgreSQL. La CI Python de ce lot ne revendique **pas** la parité des 9 tests NestJS.
- Ne publiez pas de fichier `.env` ni de base de données.
