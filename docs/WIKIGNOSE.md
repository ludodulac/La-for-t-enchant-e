# Wikignose dans La Forêt Enchantée

Wikignose est désormais une application de **La Forêt Enchantée** et son implémentation active doit vivre dans ce dépôt.

L’ancien dépôt `ludodulac/Wikignose` reste une archive historique et une source de référence pour les décisions antérieures, mais les évolutions futures doivent être faites ici afin de partager la même interface, le même déploiement et le même projet Supabase.

## Mission

Wikignose est un moteur de recherche documentaire pour une bibliothèque de PDF indexés.

Il sépare strictement deux étapes :

1. **Indexation assistée par IA** : analyse approfondie d’un nouveau PDF, structure, chapitres, thèmes, synonymes, pages, maîtres et courants.
2. **Consultation locale sans IA** : la recherche publique interroge uniquement l’index déjà produit dans `data/wikignose-index.js`.

Une recherche ordinaire ne doit pas dépendre d’un service d’IA distant.

## Deux couches de recherche

### Pertinence thématique

Recherche sémantique dans :

- titres de documents et sections ;
- résumés ;
- thèmes explicites ou implicitement justifiés ;
- synonymes / aliases ;
- maîtres et courants ;
- importance relative de la section.

L’arrivée de nouveaux documents peut justifier une réévaluation comparative de cette pertinence.

### Occurrences

Recherche documentaire et mécanique d’un mot ou groupe de mots réellement présent dans un index lexical ou du texte indexé.

L’ajout d’un nouveau PDF ne doit pas provoquer le recalcul inutile de l’index d’occurrences des anciens documents.

## Répertoire des thèmes

Le Répertoire des thèmes est toujours dérivé de l’ensemble des champs `themes` de l’index. Il ne doit jamais devenir une liste manuelle parallèle.

Il reste fermé par défaut sur l’écran principal et s’ouvre uniquement à la demande.

## Données actuelles migrées

Le premier portage depuis le dépôt historique contient deux ouvrages et leur structure thématique :

- `L’École Essénienne — Origine, mission et but` ;
- `L’Appel de la Lumière`.

Les noms historiques des PDF sont conservés dans `legacyFile`. Les fichiers PDF eux-mêmes n’étaient pas présents dans le dépôt GitHub Wikignose au moment de la fusion, donc aucun faux lien de téléchargement n’est affiché. Lorsqu’un PDF est remis dans le stockage privé commun, son URL doit être rattachée au document sans supprimer sa référence historique.

## Administration commune

Wikignose est intégré au même `admin.html` que les histoires, le blog et les catégories.

Le module Admin prépare :

- un ou plusieurs PDF ;
- titre, cours / volume, école, courant et maîtres / auteurs facultatifs ;
- stockage privé dans le bucket `wikignose-pdfs` ;
- création d’une entrée dans `wikignose_pending_documents`.

Les champs facultatifs sont des indications prioritaires mais ne remplacent pas la vérification réelle du document lors de l’indexation.

## Sécurité

- aucun secret ou clé `service_role` dans le frontend ;
- le bucket PDF reste privé ;
- les opérations Admin doivent être protégées par l’authentification et les politiques RLS du projet Supabase commun ;
- les PDF originaux ne doivent jamais être modifiés par une extraction : toute extraction future crée une nouvelle copie.

## Workflow d’un nouveau PDF

1. Vérifier qu’il n’est pas déjà indexé (nom et SHA-256 si disponible).
2. Le déposer dans le stockage privé depuis l’Admin.
3. Identifier ses métadonnées fiables.
4. Délimiter chapitres et pages.
5. Construire son index d’occurrences sans recalculer inutilement les anciens.
6. Produire thèmes, aliases, résumés et importance.
7. Ajouter le document dans `data/wikignose-index.js` sans supprimer les anciens.
8. Réévaluer la pertinence thématique globale si le nouvel ouvrage modifie le classement.
9. Vérifier le Répertoire des thèmes, les filtres, exclusions et deux modes de recherche.
10. Relier l’URL privée / signée du PDF au document lorsque le parcours de consultation le permet.

## Source historique

La première version a été portée depuis `ludodulac/Wikignose` le 4 septembre 2026. Les principes ci-dessus reprennent les contrats documentés dans ses anciens `AGENTS.md`, `docs/INDEXATION.md` et `docs/ADMIN_INDEXATION.md`, adaptés à l’architecture commune de La Forêt Enchantée.
