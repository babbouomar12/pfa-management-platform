# Plateforme PFA — Prototype d'Élaboration UC06

**TP1 — Processus Unifié et Approches Agiles · INSAT**

Ce dépôt est une **tranche verticale exécutable de l'UC06 « Valider une affectation »**, et non la plateforme PFA complète. Il montre un parcours de bout en bout `HTTP Controller → Service métier → TypeORM → PostgreSQL` et traite le risque de concurrence identifié pendant la priorisation.

## 1. Architecture

```text
POST /api/assignments/confirm
             │
             ▼
AssignmentsController (DTO, validation)
             │
             ▼
AssignmentsService (transaction + règles métier)
             │
             ▼
TypeORM EntityManager / repositories
             │
             ▼
PostgreSQL (lignes verrouillées + UNIQUE + rollback)
```

**Politique métier :** `max_pfa` compte les **PFA** (un projet de groupe = une place), et non les étudiants. La contrainte de non-double affectation est définie **par campagne**. Les projets proposés par l'étudiant utilisent un `subject_id` nul ; ceux issus d'un catalogue peuvent renseigner `subject_id`.

## 2. Prérequis

- Node.js 20+ (Node.js 22 recommandé)
- npm
- Docker et Docker Compose (ou PostgreSQL 16 installé localement)

## 3. Démarrage (PowerShell ou terminal)

```bash
# À la racine du dossier extrait
cp .env.example .env
# Sous PowerShell : Copy-Item .env.example .env

docker compose up -d db
npm install
npm run dev
```

La base `pfa_db` est initialisée au **premier démarrage** du volume Docker par les fichiers `database/01_schema.sql` et `database/02_seed_demo.sql`. Attendre que la DB soit saine (`docker compose ps`) avant de démarrer l'API.

La route HTTP est alors disponible sur `http://localhost:3000/api/assignments/confirm`.

## 4. Test manuel avec les données de démonstration

Sur un terminal, après démarrage du serveur :

```bash
curl -i -X POST http://localhost:3000/api/assignments/confirm \
  -H 'Content-Type: application/json' \
  -d '{"applicationId":"66666666-6666-4666-8666-666666666666"}'
```

**PowerShell (Windows) :**

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/assignments/confirm `
  -ContentType 'application/json' `
  -Body '{"applicationId":"66666666-6666-4666-8666-666666666666"}'
```

- Premier appel : **HTTP 201** avec `status: "AFFECTEE"`, `assignmentId`, `memberIds`.
- Deuxième appel sur la même candidature : **HTTP 409**, car elle est déjà affectée.
- Un UUID incorrect : **HTTP 400** ; une candidature absente : **HTTP 404**.

Pour réinitialiser totalement la démonstration (efface le volume local) :

```bash
docker compose down -v
docker compose up -d db
```

## 5. Tests

```bash
npm test              # Règles pures, sans PostgreSQL
npm run test:e2e      # HTTP + transactions avec PostgreSQL
npm run test:all      # Tous les tests
npm run build         # Vérifie compilation TypeScript
```

**Attention :** les tests e2e font `TRUNCATE ... CASCADE` : ils doivent tourner uniquement sur la base locale de démonstration ou sur une base de test dédiée. Ne jamais pointer `DATABASE_URL` sur une base réelle ou partagée.

Tests e2e couverts : affectation de groupe complète ; deux candidatures concurrentes pour la dernière place ; même étudiant convoité par deux enseignants ; candidature non favorable ; groupe non confirmé ; répétition de confirmation ; validation de DTO.

Le workflow `.github/workflows/uc06-ci.yml` démarre PostgreSQL dans GitHub Actions, compile, lance les tests unitaires puis les tests e2e. **Un statut CI vert doit être observé sur GitHub** avant d'affirmer la validation du jalon d'architecture.

## 6. Arborescence

```text
src/
  assignments/
    dto/confirm-assignment.dto.ts
    assignment-policy.ts
    assignment-policy.spec.ts
    assignments.controller.ts
    assignments.service.ts
  database/entities/*.entity.ts
  app.module.ts
  main.ts
database/
  01_schema.sql
  02_seed_demo.sql
test/assignments.e2e-spec.ts
docs/
  DECISIONS_TECHNIQUES.md
  uml/uc06-sequence.puml
  uml/uc06-classes.puml
.github/workflows/uc06-ci.yml
```

## 7. Intégration dans le dépôt de l'équipe

Si votre dépôt GitHub existe déjà, **ne remplacez pas son contenu** : créer la branche `feature/uc06-affectation`, copier ces fichiers en conservant les travaux existants, puis faire une Pull Request vers `main`. Si le dépôt possède déjà un `package.json`, fusionner les dépendances et les scripts au lieu de l'écraser. Enregistrer l'Issue UC06 associée à cette branche.

```bash
git switch main
git pull
git switch -c feature/uc06-affectation
# Copier le prototype, vérifier npm install / build / test

git add .
git commit -m "feat(uc06): transactional PFA assignment vertical slice"
git push -u origin feature/uc06-affectation
```

Le tag `v0.1-elaboration` doit être créé **après** tests et validation de la Pull Request, lorsque la branche `main` contient l'architecture validée. Ne pas clore le milestone d'Élaboration avant que la CI soit verte.

## 8. Limitations assumées et travaux futurs

L'API est un **prototype pédagogique** : elle ne dispose ni d'authentification ni de contrôle d'accès. Il faut donc la garder locale. L'application ne contient ni interface graphique, ni flux complet UC01–UC05, ni limitation de taille des groupes. Les contraintes DB sont complémentaires des verrous applicatifs. La configuration locale utilise des identifiants de démonstration et ne doit pas être déployée en production.

Les justifications sont détaillées dans `docs/DECISIONS_TECHNIQUES.md`. Les diagrammes PlantUML sont dans `docs/uml/`.
