# Fiche UC06 — Valider l’affectation d’un PFA

**Ticket :** [#1](https://github.com/babbouomar12/pfa-management-platform/issues/1). **Acteur principal :** Enseignant. **Branche métier :** `feature/uc06-affectation`. **Périmètre décrit :** prototype FastAPI issu de la migration du même UC NestJS.

## Objectif et déclencheur

En tant qu’enseignant, je souhaite confirmer l’affectation d’un étudiant ou d’un groupe à un PFA afin de réserver une capacité d’encadrement sans double affectation.

L’enseignant choisit une candidature favorable. Dans le prototype, ce choix est représenté par un appel `POST /api/assignments/confirm` contenant `applicationId`. Aucun écran métier complet n’est livré.

## Préconditions

- Une candidature, un enseignant et une campagne existent ; une capacité est définie pour ce couple enseignant/campagne.
- La candidature est `FAVORABLE` et le groupe appartient à la même campagne.
- Le groupe comporte au moins un membre ; tous les membres ont confirmé leur participation.
- Si un sujet enseignant est référencé, il appartient au même enseignant et à la même campagne, est disponible et n’est pas déjà attribué.
- Le quota et l’absence d’affectation des étudiants sont revérifiés pendant la transaction, car ils peuvent changer entre l’affichage et la confirmation.

**Préconditions du produit non garanties par le prototype :** enseignant authentifié et autorisé, campagne ouverte à la date courante, taille maximale du groupe. La composition des groupes est supposée stable pendant la confirmation. Ces limites ne sont pas présentées comme des contrôles implémentés.

## Scénario nominal

1. Le client transmet l’UUID de la candidature ; FastAPI valide la forme du corps JSON.
2. Le service ouvre une transaction SQLAlchemy et lit l’enseignant et la campagne de la candidature.
3. Il verrouille la capacité enseignant/campagne, puis relit et verrouille la candidature.
4. Il vérifie le statut favorable, la cohérence de campagne et la confirmation de tous les membres.
5. Il verrouille les étudiants par ordre d’identifiant, puis contrôle le sujet éventuel, le quota disponible et l’absence d’affectation de chaque étudiant dans la campagne.
6. Il crée une affectation et une ligne `assignment_members` pour chaque membre du groupe, puis passe la candidature à `AFFECTEE`.
7. La transaction est validée ; l’API renvoie `201` avec les identifiants de l’affectation, de la candidature, de la campagne, de l’enseignant et des membres.

## Postconditions et cas alternatifs

En succès, une seule place PFA est consommée quelle que soit la taille du groupe ; tous les membres sont affectés. En cas d’exception dans la transaction, les écritures de cette confirmation sont annulées.

| Cas | Réponse du prototype FastAPI | Effet attendu |
|---|---|---|
| Corps invalide ou UUID mal formé | `422` | Le service de confirmation n’est pas appelé |
| Candidature introuvable | `404` | Aucune affectation créée |
| Capacité absente ou atteinte | `409` | Aucune place supplémentaire consommée |
| Candidature non favorable ou déjà affectée | `409` | Pas de seconde affectation |
| Groupe absent, campagne incohérente, groupe vide ou membre non confirmé | `409` | Aucune affectation partielle |
| Sujet indisponible, incohérent ou déjà attribué | `409` | Aucune nouvelle affectation du sujet |
| Étudiant déjà affecté dans la campagne | `409` | Pas de double affectation |
| Deux demandes concurrentes incompatibles | Une `201`, une `409` dans les scénarios testés | Une seule affectation persistée |
| Violation d’unicité SQL, deadlock ou conflit de sérialisation reconnu | `409` | Rollback ; une nouvelle tentative peut être proposée |

Les autres erreurs techniques inattendues ne sont pas toutes converties en `409` ; elles ne doivent pas être décrites comme des conflits métier. La version NestJS renvoie `400`, et non `422`, pour son DTO invalide.

## Critères d’acceptation et tests dérivés

Les noms ci-dessous correspondent aux tests réellement versionnés. Leur réussite CI est détaillée dans la [note de validation](NOTE_VALIDATION_UC06.md).

| Critère | Exemple vérifiable | Test |
|---|---|---|
| CA01 — Nominal atomique | Un groupe de deux membres produit une affectation, deux liens membres et `AFFECTEE` | `test_affectation_nominale_atomique` |
| CA02 — Quota | Après consommation de l’unique place, une seconde candidature est refusée | `test_capacity`, `test_capacite_atteinte` |
| CA03 — Confirmation du groupe | Un membre non confirmé entraîne un rejet sans affectation | `test_members`, `test_membre_non_confirme_aucune_ecriture` |
| CA04 — Statut préalable | Une candidature `EN_ATTENTE` reste inchangée après rejet | `test_candidature_non_favorable_aucune_ecriture` |
| CA05 — Reconfirmation | Le deuxième appel sur la même candidature ne crée aucun doublon | `test_reconfirmation_refusee_sans_doublon` |
| CA06 — Unicité étudiant/campagne | Un second enseignant ne peut affecter un étudiant déjà affecté | `test_double_affectation_deux_enseignants` |
| CA07 — Dernière place concurrente | Deux demandes pour une seule place donnent `[201, 409]` et une affectation | `test_concurrence_derniere_place` |
| CA08 — Étudiant concurrent | Deux enseignants visant le même étudiant donnent `[201, 409]` et une affectation | `test_concurrence_meme_etudiant_deux_enseignants` |
| CA09 — Contrat d’entrée | UUID invalide refusé ; UUID valide mais absent retourne `404` | `test_uuid_validation`, `test_missing_application` |

Les tests de rejet métier existants se déclenchent avant les écritures ; ils ne constituent pas un test dédié de panne injectée au milieu des insertions. La transaction fournit le mécanisme de rollback, mais une telle injection serait une extension de couverture utile. De même, toutes les variantes « sujet incohérent » et « capacité absente » ne disposent pas encore d’un test dédié.

## Conception et sources

- [Classes et modules FastAPI](uml/construction/uc06_fastapi_classes.puml) et [séquence FastAPI](uml/construction/uc06_fastapi_sequence.puml).
- Entrée HTTP : [`app/main.py`](../backend-fastapi/app/main.py).
- Service transactionnel : [`app/service.py`](../backend-fastapi/app/service.py).
- Règles pures : [`app/policy.py`](../backend-fastapi/app/policy.py).
- Connexion SQLAlchemy : [`app/db.py`](../backend-fastapi/app/db.py) ; SQL explicite dans le service et contraintes dans [`01_schema.sql`](../backend-fastapi/database/01_schema.sql).
- Tests : [`test_policy.py`](../backend-fastapi/tests/test_policy.py), [`test_api.py`](../backend-fastapi/tests/test_api.py), [`test_integration.py`](../backend-fastapi/tests/test_integration.py) et [`test_uc06_transactions.py`](../backend-fastapi/tests/test_uc06_transactions.py).

La version Python utilise SQLAlchemy Core et des fonctions ; elle ne contient pas les classes d’entités TypeORM de NestJS ni un repository Python distinct. Les diagrammes doivent préserver cette distinction.
