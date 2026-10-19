# Plateforme PFA — Diagrammes de conception

## Contenu

Sept diagrammes, chacun documenté en **PlantUML** (`plantuml/`) et accompagné d'un aperçu (`apercus/`).
Les éditions graphiques sont fournies au format **Excalidraw** (`excalidraw/`) lorsque disponibles.
Les sources PlantUML et les fichiers Excalidraw sont deux représentations cohérentes du modèle, mais peuvent différer dans le niveau de détail et la disposition des éléments.

| N° | Diagramme | Objet |
|---|---|---|
| 00 | Cas d'utilisation | Trois acteurs et six UC |
| 01 | Composants UC06 | Contrôleur, service, repository, base relationnelle |
| 02 | Parcours de candidature | Sujets enseignants et propositions étudiantes |
| 03 | Classes métier | Entités, attributs, associations et multiplicités |
| 04 | Modèle conceptuel des données | Relations et clés du domaine |
| 05 | Séquence UC06 | Confirmation, contrôles, transaction, succès et rejet |
| 06 | Activité UC06 | Décisions métier et sorties alternatives |

## Décisions de conception validées

- Les sujets peuvent provenir des enseignants ou des étudiants.
- Les PFA sont individuels ou collectifs. Au niveau du modèle, un étudiant seul est un **groupe de taille 1**.
- Un étudiant peut déposer plusieurs candidatures, mais ne peut avoir qu'une affectation définitive par campagne.
- Tous les membres d'un groupe sont confirmés avant la soumission ; une affectation collective concerne le groupe entier.
- Le quota d'un enseignant est le **nombre de PFA affectés**, indépendamment du nombre d'étudiants.
- Les campagnes définissent les dates et la taille maximale d'un groupe.

## Hypothèses et décisions à confirmer

- La politique permettant ou non l'attribution d'un sujet publié à plusieurs groupes reste à fixer.
- Les modifications de groupe après soumission devront être encadrées (figer la composition, ou invalider la candidature).
- Une décision favorable ne vaut pas affectation : UC06 confirme de manière atomique avec contrôle des quotas et de l'unicité des affectations.
- La stratégie envisagée pour les accès concurrents est la transaction, le verrouillage ordonné des enregistrements et l'unicité de `(campagne_id, etudiant_id)` ; **cela reste une proposition architecturale, non une fonctionnalité validée par test**.
- Dans le modèle MCD, `AFFECTATION_MEMBRE` a une clé composée `(campagne_id, etudiant_id)` ; ces colonnes ne sont **pas chacune uniques séparément**.

## Correspondance avec le TP

- **Partie 1 / Élaboration :** cas d'utilisation et conception architecturale de l'UC06.
- **Partie 2 / Construction et Transition :** diagrammes de classes et de séquence PlantUML (préparés en anticipation).
- Le sujet impose également une architecture exécutable, un test CI, des tests métier et une revue croisée suivant la phase. **Ce dossier ne prétend pas satisfaire ces exigences non réalisées.**

## Dépôt GitHub — import conseillé

Le dossier `Diagrammes` est prévu pour être copié dans `docs/uml/` du dépôt `pfa-management-platform`.
Il peut coexister avec les deux fichiers déjà versionnés (`diagramme-cas-utilisation.puml` et `uc06-diagramme-composants.puml`).
Éviter les doublons de version : garder une version canonique pour chaque source après intégration.

Sur la branche consacrée à la documentation de l'UC06 :

```powershell
git switch feature/uc06-affectation
git add docs/uml/Diagrammes/
git commit -m "docs(uc06): complete UML sequence and activity diagrams"
git push origin feature/uc06-affectation
```

Si une Pull Request précédente a déjà été fusionnée, synchroniser au préalable la branche de travail depuis `main` pour éviter les divergences.

## Visualisation

- `.puml` : extension PlantUML dans VS Code ou autre moteur PlantUML.
- `.excalidraw` : ouvrir les fichiers dans https://excalidraw.com.
- `.png` : insérables directement dans le rapport académique.

**État de validation :** syntaxe et cohérence structurelle des sources contrôlées localement ; rendu PlantUML par le moteur officiel **non exécuté** dans cet environnement.
