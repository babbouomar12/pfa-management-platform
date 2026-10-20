# UC06 — Protocole de vérification (TP1)

## Traçabilité
- UC : **UC06 — Valider une affectation d’un PFA**
- Branche : `feature/uc06-affectation`
- Architecture : `POST /api/assignments/confirm` → `AssignmentsController` → `AssignmentsService` → repositories TypeORM → PostgreSQL
- Règle RM06 : la capacité d’encadrement représente un **nombre de PFA**, quel que soit le nombre d’étudiants par groupe.
- Un projet individuel correspond à un groupe d’un seul étudiant.

## Scénarios automatisés inclus
1. Validation d’un groupe complet avec écriture atomique.
2. Deux validations simultanées pour une seule place (attendu : une seule réussite).
3. Double affectation concurrente du même étudiant auprès de deux enseignants.
4. Rejet des candidatures non favorables.
5. Rejet si un membre du groupe n’a pas confirmé.
6. Rejet d’une deuxième confirmation identique.
7. Rejet d’un identifiant de candidature mal formé.

## Preuves exigées avant clôture
- Capture de la réponse HTTP pour un scénario nominal.
- Journal `npm run build` et `npm run test:all` sans erreur.
- Capture de GitHub Actions avec job réussi sur la branche UC06.
- Revue croisée par une autre équipe, avec remarques consignées (Partie 2).
- Fusion de la PR et tag `v0.1-elaboration` au commit validé (Partie 1).

## Limitations
- L’endpoint n’est pas authentifié : environnement de démonstration exclusivement.
- Les données administratives et les candidatures sont initialisées par SQL, pas par les autres UC.
- Les tests nécessitent PostgreSQL 16 et les dépendances npm installées ; non encore exécutés dans l’environnement de production du livrable.
- En cas de deadlock PostgreSQL, la transaction est annulée et la requête retourne 409 ; un mécanisme de rejeu pourrait être ajouté ultérieurement.
