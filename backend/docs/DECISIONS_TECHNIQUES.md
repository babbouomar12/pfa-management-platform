# Décisions techniques — prototype UC06

## DT-01 : architecture en couches

**Choix :** NestJS (contrôleur HTTP et injection de dépendances), un service métier transactionnel et TypeORM pour la persistance PostgreSQL. Ce découpage répond au parcours de bout en bout demandé dans la Partie 1 du TP.

**Alternatives :** contrôleur contenant directement le SQL (couplage fort), microservices (complexité disproportionnée pour un TP). L'architecture choisie reste un monolithe modulaire.

## DT-02 : capacité mesurée en projets

**Décision métier validée :** un groupe de trois étudiants compte pour **un PFA**, pas pour trois places. `teacher_capacities.max_pfa` est défini pour le couple enseignant/campagne ; le nombre consommé est le nombre d'enregistrements dans `assignments` pour ce couple.

## DT-03 : atomicité et contrôle de la concurrence

**Risque :** deux confirmations concurrentes pour la dernière place peuvent produire une suraffectation ; deux enseignants peuvent accepter simultanément le même étudiant.

**Choix :** transaction PostgreSQL `READ COMMITTED`, verrou pessimiste `FOR UPDATE` sur la capacité par enseignant/campagne, puis sur la candidature et chaque étudiant dans l'ordre de son UUID. Le verrou de quota garantit la sérialisation des confirmations du même enseignant. Le verrou des étudiants protège les validations concurrentes entre enseignants.

**Défense complémentaire :** contrainte `UNIQUE (campaign_id, student_id)` sur `assignment_members`, `UNIQUE (application_id)` et `UNIQUE (subject_id)` sur `assignments`. Toute violation ou exception annule la transaction entière.

**Alternative étudiée :** compter les affectations puis insérer sans verrouillage ; rejetée car susceptible de produire une course. Un niveau SERIALIZABLE avec reprise automatique serait aussi envisageable, mais non nécessaire pour ce prototype contrôlé.

## DT-04 : règle de non-double affectation

**Hypothèse explicitée :** un étudiant ne peut avoir qu'une seule affectation définitive **par campagne PFA**. Cette portée est cohérente avec plusieurs années universitaires distinctes et pourra être discutée si le métier exige une unicité globale.

## DT-05 : modélisation des deux origines possibles

Une candidature issue d'un sujet enseignant porte `subject_id` (un sujet est attribuable une seule fois dans ce prototype). Une proposition étudiante peut porter `subject_id = NULL` et un `project_title` propre. Les écrans de soumission (UC03 et UC04) ne font pas partie de cette tranche verticale.

## DT-06 : périmètre pédagogique / limites

- **Implémenté :** validation UUID, recherche candidature favorable, existence et confirmation du groupe, cohérence de campagne, sujet disponible, quota PFA, unicité étudiant/campagne, persistance atomique, erreurs 400/404/409 et tests automatisés.
- **Non implémenté :** authentification et contrôle des rôles ; l'endpoint de démonstration ne doit **pas** être exposé publiquement. Ajouter ultérieurement JWT/session et l'autorisation de l'enseignant destinataire.
- **Non implémenté :** toute la gestion administrative des campagnes, création des groupes, interface utilisateur, notifications, gestion de la taille maximale du groupe, lifecycle complet des candidatures, workflows de retrait/annulation, revue croisée par une autre équipe.
- **Reproductibilité :** schéma SQL explicite et seed de démonstration ; `synchronize: false` pour éviter les modifications de schéma automatiques.

## DT-07 : validation

Les tests unitaires portent sur les règles pures de capacité et de confirmation du groupe. Les tests d'intégration utilisent **un vrai PostgreSQL**, couvrent le parcours HTTP complet et envoient des requêtes simultanées afin de contrôler les garanties transactionnelles. Ils doivent être exécutés localement et sur GitHub Actions avant de déclarer le jalon LCA validé.
