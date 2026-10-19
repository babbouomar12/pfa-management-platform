# Modèle conceptuel de la plateforme PFA — v0.3

## Domaine couvert

Deux parcours (sujet enseignant ; proposition étudiante) convergent vers une candidature et une affectation.
Un projet individuel est représenté par un `Groupe` à **un membre**. Cette factorisation est une **hypothèse de modélisation proposée**, non une règle imposée par l’énoncé.

### Entités

- `CampagnePFA` : calendrier et taille maximale de groupe.
- `Enseignant` et `CapaciteEncadrement` : quota par couple enseignant/campagne, en **nombre de PFA**.
- `Etudiant`, `Groupe`, `MembreGroupe` : appartenance et confirmation des membres (groupes de 1 à N).
- `ProjetPFA` : origine `ENSEIGNANT` ou `ETUDIANT`, avec **exactement un auteur** du bon type.
- `Candidature` : demande émise par un groupe envers un enseignant pour un projet ; la décision favorable ne crée pas automatiquement une affectation.
- `Affectation` et `AffectationMembre` : attribution définitive et visibilité de chaque membre.

### Cardinalités structurantes

| Relation | Multiplicité / règle |
|---|---|
| Campagne — Groupe | Une campagne accueille 0..N groupes, un groupe appartient à 1 campagne |
| Groupe — MembreGroupe | Un groupe soumis comporte 1..N membres, un membre appartient à 1 groupe |
| Étudiant — MembreGroupe | Un étudiant peut apparaître dans plusieurs groupes candidats |
| Groupe — Candidature | 1 groupe peut déposer 0..N candidatures |
| ProjetPFA — Candidature | Un projet peut être visé par 0..N candidatures (limites complémentaires ouvertes) |
| Enseignant — Candidature | Une candidature est adressée à 1 enseignant |
| Candidature — Affectation | Au plus une affectation par candidature |
| Affectation — AffectationMembre | Une affectation concerne tous les membres du groupe |
| Enseignant/Campagne — CapaciteEncadrement | Un quota par couple enseignant/campagne |

### Contraintes et arbitrages

1. `UNIQUE(campagne_id, etudiant_id)` dans `AffectationMembre` : au plus une affectation définitive par étudiant et campagne.
2. `UNIQUE(campagne_id, enseignant_id)` dans `CapaciteEncadrement` : un seul quota par enseignant/campagne.
3. `UNIQUE(candidature_id)` dans `Affectation` : une seule affectation issue de la candidature.
4. Une affectation est créée atomiquement avec une affectation-membre par étudiant du groupe.
5. Quota calculé comme le **nombre de PFA affectés** et non le nombre d’étudiants.
6. Si `ProjetPFA.origine == ETUDIANT`, le groupe auteur est aussi le groupe candidat ; sinon le projet est authored par un enseignant.
7. Reste à arbitrer : une ou plusieurs affectations par sujet d’enseignant ; contrôle de l’évolution d’un groupe après candidature ; statut final des candidatures concurrentes.

### Livraison et portée

Ces artefacts contiennent des modèles **conceptuels proposés** (PlantUML + Excalidraw) et des images pour le rapport. Ils ne constituent ni un schéma SQL exécuté ni une preuve de tests ou d’intégration continue.

Pour Git : placer les deux `.puml` sous `docs/uml/` sur `feature/uc06-affectation` ; conserver les `.excalidraw` dans `docs/excalidraw/` si souhaité.
