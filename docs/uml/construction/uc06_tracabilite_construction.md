# UC06 — Traçabilité de Construction

**Périmètre contrôlé :** fichiers contenus dans `pfa-management-platform.zip`, comparés aux résultats de tests transmis dans la conversation. La réussite de CI est déclarée par l’utilisateur, et non vérifiée indépendamment depuis GitHub.

| Étape | Preuve / fichier |
|---|---|
| Cas d’utilisation | UC06 — Valider l’affectation d’un PFA |
| Ticket | GitHub Issue #1 (identifiant communiqué dans le projet) |
| Branche | `feature/uc06-affectation` (communiquée dans le projet) |
| Route API | `POST /api/assignments/confirm` — `backend/src/assignments/assignments.controller.ts` |
| Validation de l’entrée | `backend/src/assignments/dto/confirm-assignment.dto.ts` (`@IsUUID('4')`) |
| Couche métier | `backend/src/assignments/assignments.service.ts` |
| Règles pures | `backend/src/assignments/assignment-policy.ts` |
| Accès aux données | `DataSource.transaction('READ COMMITTED')`, repositories TypeORM, entités de `backend/src/database/entities/` |
| Contraintes relationnelles | `backend/database/01_schema.sql`, entités `Assignment` et `AssignmentMember` |
| Tests unitaires | `backend/src/assignments/assignment-policy.spec.ts` — 2 réussis (sortie console fournie) |
| Tests d’intégration | `backend/test/assignments.e2e-spec.ts` — 7 réussis (sortie console fournie) |
| CI | `.github/workflows/uc06-ci.yml` — workflow annoncé réussi par l’utilisateur |
| Diagrammes alignés | `uc06_classes_implementation.puml`, `uc06_sequence_implementation.puml` |

## Points de cohérence détectés

1. L’ancien diagramme de séquence nomme `AffectationController`, `AffectationService`, une route `/affectations/confirmer` et un dépôt métier dédié. Le code expose **`AssignmentsController`**, **`AssignmentsService`**, **`POST /api/assignments/confirm`** et utilise les repositories **TypeORM dans une transaction `DataSource`**.
2. Les fichiers conceptuels portent encore les mentions « sans implémentation » / « aucune implémentation ni aucun test exécuté ». Ces indications sont désormais obsolètes : conserver ces fichiers comme **conception initiale** et utiliser les nouvelles vues pour la **réalisation**.
3. Le diagramme métier `03_diagramme_classes.puml` est une **vue conceptuelle large** de la plateforme, et ne doit pas être confondu avec les classes réellement implémentées dans l’UC06.
4. Le contrôleur de l’UC06 prend `applicationId` dans le corps HTTP et ne reçoit pas explicitement l’identifiant de l’enseignant authentifié. **L’authentification/autorisation de l’auteur de la confirmation n’est pas démontrée par ce code** : limite à déclarer dans le rapport, pas à masquer.
5. Les états de la campagne, les fenêtres temporelles et la taille maximale du groupe ne sont **pas vérifiés dans `AssignmentsService.confirm()`**. Ils restent hors périmètre de cette tranche verticale tant qu’ils ne sont pas implémentés et testés.
6. Les invariants de confirmation d’appartenance au groupe sont vérifiés après chargement des membres, mais le code ne montre pas de verrou spécifique sur les lignes `group_members` : l’hypothèse d’immuabilité du groupe pendant la confirmation doit être explicitée ou renforcée si des modifications concurrentes de groupe sont autorisées.

## Revue croisée — à réaliser par une autre équipe

Équipe évaluatrice : ___________________  Date : ___________________

Vérifier : diagrammes concordants avec les noms de classes/routes ; protection contre deux validations simultanées ; cas d’échec et rollback ; couverture des tests ; accès à la confirmation limité à l’enseignant autorisé ; documentation des limites du prototype.

Observations reçues : ___________________

Corrections réalisées / décision motivée : ___________________

**Statut : revue non effectuée.**
