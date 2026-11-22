# UC06 — Preuves et limites de validation du TP1

**Vérification effectuée le 22 novembre 2026.** Cette note remplace le protocole déclaratif initial. Elle distingue les résultats réellement consultés, les contrôles locaux et les validations encore manquantes.

## 1. Résultats GitHub Actions vérifiés

| Version | Commit du run | Résultat lu dans les journaux | Preuve |
|---|---|---|---|
| FastAPI / SQLAlchemy / PostgreSQL 16 | `daa557f5a9afd63eea51bf89e02dd443ae5c0663` | `13 passed, 1 warning in 1.46s` ; les 13 scénarios sont affichés `PASSED` | [FastAPI CI — run 39421821410](https://github.com/babbouomar12/pfa-management-platform/actions/runs/39421821410) |
| NestJS / TypeORM / PostgreSQL | `d54cb2cf860b2a2198086a7105f8021127de8d3b` | Compilation réussie ; 2 tests unitaires et 7 tests d’intégration réussis | [UC06 — run 45065292045](https://github.com/babbouomar12/pfa-management-platform/actions/runs/45065292045) |

Ces preuves correspondent à leurs commits respectifs ; elles ne sont pas des mesures de performance ni une validation de fonctionnalités non couvertes. Les changements du présent complément sont documentaires et ne modifient pas le comportement de l’API.

Le workflow Python initialise le schéma sur une base **`pfa_test_db`**, active `RUN_PFA_DB_TESTS=1` et exécute `python -m pytest -v -rs`. Les tests PostgreSQL ne sont donc pas simplement ignorés dans le run cité.

## 2. Scénarios Python effectivement réussis

| Famille | Scénarios | Nombre |
|---|---|---:|
| HTTP | Santé du service ; UUID invalide | 2 |
| Intégration | Candidature inexistante | 1 |
| Règles pures | Capacité ; confirmation des membres, groupe vide inclus | 2 |
| Transactions et règles métier | Affectation nominale atomique ; reconfirmation ; membre non confirmé ; candidature non favorable ; capacité atteinte ; étudiant déjà affecté chez un autre enseignant | 6 |
| Concurrence | Dernière place pour deux candidatures ; même étudiant auprès de deux enseignants | 2 |
| **Total** | | **13** |

Pour les deux tests concurrents, les assertions vérifient une réponse `201`, une réponse `409` et une seule affectation persistée. Le test nominal vérifie une affectation, deux membres et le statut `AFFECTEE`.

## 3. Contrôle local de cette révision

Commande exécutée depuis `backend-fastapi/` :

```powershell
python -m pytest tests/test_policy.py -q
```

Résultat observé : **2 passed in 0.43s**. Cette exécution locale ne couvre que les règles pures. Docker Desktop n’était pas démarré et le pilote `psycopg` n’était pas installé dans l’interpréteur local ; la suite PostgreSQL complète n’a pas été relancée sur cette machine. Les preuves d’intégration et de concurrence proviennent des journaux CI ci-dessus.

Les deux nouveaux diagrammes PlantUML et le Y Graphviz ont été rendus et inspectés. Les 89 liens locaux des six documents concernés ont été contrôlés sans lien manquant, ainsi que les ancres internes et la vision en cinq lignes. Les rendus SVG versionnés accompagnent les nouvelles sources PlantUML ; `git diff --check` ne signale pas d’erreur d’espacement.

## 4. Anomalie du jalon historique

Le tag **`v0.1-elaboration` cible `4aad1cda215c217a06453c8e6503d715b0dfcc3c`**, qui ne contient pas le backend ni la CI. Son annotation annonçant neuf tests ne suffit pas à valider ce commit. Le milestone [02 - Elaboration](https://github.com/babbouomar12/pfa-management-platform/milestone/2) est fermé, alors que le [ticket UC06](https://github.com/babbouomar12/pfa-management-platform/issues/1) reste ouvert.

Contrôle reproductible depuis la racine :

```powershell
git show --no-patch v0.1-elaboration
git ls-tree -r --name-only v0.1-elaboration
```

Une référence corrective `v0.1.1-elaboration` sur l’état documenté et testé permet de conserver l’historique. Elle doit être distinguée du nom exact demandé par le TP. Le tag historique ne doit être déplacé qu’à la suite d’une décision explicite de l’équipe ; il n’est pas réécrit par cette correction documentaire.

## 5. Limites et clôture

- L’authentification et l’autorisation de l’enseignant ne sont pas implémentées.
- La période de campagne, la taille maximale et les modifications concurrentes de composition du groupe ne sont pas prises en charge complètement.
- Les tests existants ne couvrent pas toutes les branches d’erreur ni une panne injectée après une première insertion ; aucune couverture exhaustive n’est revendiquée.
- Les requêtes SQL restent dans le service Python ; `app.db` construit l’Engine. Aucun repository ou ORM à classes Python absent du code n’est revendiqué.
- Les autres UC sont suivis dans le [tableau GitHub](https://github.com/users/babbouomar12/projects/1/views/1), mais ne constituent pas encore une plateforme complète.
- **La revue croisée par une autre équipe n’a pas été effectuée.** La [grille du rapport TP1](TP1_PROCESSUS_UNIFIE_2TUP.md#7-revue-croisée-et-conditions-de-clôture) doit être renseignée avec l’équipe, le commit, les observations et les corrections réelles.

La chaîne de traçabilité complète et le plan des phases sont décrits dans le [rapport UP/2TUP](TP1_PROCESSUS_UNIFIE_2TUP.md), avec la [fiche détaillée d’UC06](UC06_AFFECTATION.md).
