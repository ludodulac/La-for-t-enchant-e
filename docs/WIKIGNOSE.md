# Wikignose — outil documentaire compagnon

Wikignose est hébergé dans le dépôt de **La Forêt Enchantée** pour mutualiser l’infrastructure, la sécurité, l’administration et le déploiement. En revanche, il ne fait pas partie de l’univers éditorial jeunesse : son interface publique doit rester autonome, sobre et discrète.

L’ancien dépôt `ludodulac/Wikignose` reste une archive historique et une source de référence pour les décisions antérieures. Les évolutions actives sont faites ici afin de partager le même projet Supabase et le même back-office sans maintenir un second système.

## Positionnement produit

- La Forêt Enchantée reste la surface principale et conserve une identité exclusivement orientée médiathèque jeunesse.
- Wikignose est accessible depuis un lien secondaire en bas de la navigation, sous la forme `Outils · Wikignose`.
- Wikignose ne doit pas apparaître comme une rubrique principale de la médiathèque ni concurrencer visuellement le journal ou l’écoute.
- `wikignose.html` possède sa propre identité d’outil documentaire et un simple lien de retour vers La Forêt Enchantée.
- La page est volontairement marquée `noindex, nofollow` : elle est trouvable par navigation directe depuis le site, mais n’a pas vocation à être une porte d’entrée indexée par les moteurs de recherche.

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

La recherche ignore les principaux mots-outils français dans le calcul du score, privilégie les correspondances par mots plutôt que les sous-chaînes trop permissives et ajoute un bonus lorsqu’une expression complète est retrouvée. L’interface affiche des niveaux qualitatifs (`Très pertinent`, `Pertinent`, `À explorer`) plutôt qu’un faux pourcentage de confiance.

L’arrivée de nouveaux documents peut justifier une réévaluation comparative de cette pertinence.

### Occurrences

Ce mode est strictement documentaire : il ne cherche que dans `section.text` et `section.occurrenceTerms`, c’est-à-dire dans du texte ou un index lexical réellement disponible. Les titres, thèmes, aliases et résumés ne servent jamais de substitution à une occurrence réelle.

Le corpus historique actuellement migré contient **2 ouvrages, 17 sections thématiques et 0 section avec index lexical**. Le mode Occurrences peut donc légitimement retourner zéro résultat tant qu’un index lexical n’a pas été produit. L’interface l’indique explicitement au lieu de fabriquer une précision à partir des métadonnées.

L’ajout d’un nouveau PDF ne doit pas provoquer le recalcul inutile de l’index d’occurrences des anciens documents.

## Répertoire des thèmes

Le Répertoire des thèmes est toujours dérivé de l’ensemble des champs `themes` de l’index. Il ne doit jamais devenir une liste manuelle parallèle.

Il reste fermé par défaut sur l’écran principal et s’ouvre uniquement à la demande.

## Données actuelles migrées

Le premier portage depuis le dépôt historique contient deux ouvrages et leur structure thématique :

- `L’École Essénienne — Origine, mission et but` ;
- `L’Appel de la Lumière`.

Ces deux ouvrages représentent 17 sections thématiques. Aucune de ces sections ne possède encore `text` ou `occurrenceTerms`, donc elles alimentent la pertinence thématique mais pas le mode Occurrences.

Les noms historiques des PDF sont conservés dans `legacyFile`. Les fichiers PDF eux-mêmes n’étaient pas présents dans le dépôt GitHub Wikignose au moment de la fusion, donc aucun faux lien de téléchargement n’est affiché. Lorsqu’un PDF est remis dans le stockage privé commun, son URL doit être rattachée au document sans supprimer sa référence historique.

## Administration commune

Wikignose est intégré au même `admin.html` que les histoires, le blog et les catégories. Cette mutualisation est volontaire : elle concerne l’administration et l’infrastructure, pas le positionnement public.

Le module Admin permet :

- d’envoyer un ou plusieurs PDF ;
- d’ajouter titre, cours / volume, école, courant et maîtres / auteurs facultatifs ;
- de stocker les fichiers dans le bucket privé `wikignose-pdfs` ;
- de créer une entrée dans `wikignose_pending_documents` ;
- de calculer une empreinte SHA-256 avant upload afin de refuser le même contenu envoyé sous un autre nom ;
- de retirer un document `pending` ou `error` avec nettoyage du PDF privé ;
- de conserver les documents `indexing`, `indexed` et `archived` dans un registre d’ingestion durable afin que leur SHA-256 continue d’empêcher une réimportation ultérieure.

La table garde son nom historique `wikignose_pending_documents`, mais elle sert désormais de registre d’ingestion et de statuts, pas seulement de file temporaire.

La colonne `sha256` est protégée par un index unique partiel : une seconde insertion du même document est également refusée au niveau PostgreSQL, ce qui couvre les envois concurrents.

Les champs facultatifs sont des indications prioritaires mais ne remplacent pas la vérification réelle du document lors de l’indexation.

Les comptes autorisés sont inscrits dans `public.app_admins`. La fonction `public.is_app_admin()` protège le back-office commun : un compte Supabase authentifié mais absent de `app_admins` ne peut pas écrire dans les contenus ni accéder aux PDF privés Wikignose.

## Sécurité

- aucun secret ou clé `service_role` dans le frontend ;
- le bucket PDF reste privé ;
- les opérations Admin sont protégées par l’authentification et les politiques RLS du projet Supabase commun ;
- les PDF originaux ne doivent jamais être modifiés par une extraction : toute extraction future crée une nouvelle copie ;
- un échec d’insertion après upload déclenche le nettoyage du nouveau PDF ;
- un retrait autorisé du registre supprime d’abord la ligne SQL puis tente le nettoyage Storage, afin de ne jamais conserver une référence vers un fichier déjà supprimé ;
- les documents déjà en indexation, indexés ou archivés ne sont pas supprimables via l’action ordinaire du back-office ;
- les remplacements de médias audio suivent l’ordre upload nouveau → mise à jour SQL → suppression ancien ; en cas d’échec, les nouveaux fichiers sont nettoyés et les fichiers encore référencés restent intacts.

## Workflow d’un nouveau PDF

1. Calculer son SHA-256 et vérifier qu’il n’est pas déjà présent dans le registre.
2. Le déposer dans le stockage privé depuis l’Admin.
3. Identifier ses métadonnées fiables.
4. Délimiter chapitres et pages.
5. Construire son index d’occurrences sans recalculer inutilement les anciens.
6. Produire thèmes, aliases, résumés et importance.
7. Ajouter le document dans `data/wikignose-index.js` sans supprimer les anciens.
8. Réévaluer la pertinence thématique globale si le nouvel ouvrage modifie le classement.
9. Vérifier le Répertoire des thèmes, les filtres, exclusions et deux modes de recherche.
10. Passer le registre au statut adapté (`indexing`, puis `indexed` ou `error`) et conserver l’empreinte SHA-256.
11. Relier l’URL privée / signée du PDF au document lorsque le parcours de consultation le permet.

## Vérifications de la fusion — 4 septembre 2026

Le projet Supabase commun `La forêt enchantée` a été restauré puis vérifié `ACTIVE_HEALTHY`.

État historique préservé après migration :

- 3 audios et 3 fichiers audio ;
- 3 images de couverture ;
- 2 catégories et 2 sous-catégories ;
- 2 articles et 3 images de blog ;
- 1 compte Auth historique, conservé comme administrateur commun.

État Wikignose après intégration :

- `app_admins` : 1 administrateur ;
- registre `wikignose_pending_documents` : 0 document au démarrage et toujours 0 après les tests transactionnels ;
- bucket privé `wikignose-pdfs` créé et vide au démarrage ;
- colonne `sha256` et index unique de déduplication actifs ;
- corpus local : 2 ouvrages, 17 sections thématiques, 0 section avec index lexical.

Tests RLS réalisés :

- avec l’identité de l’administrateur historique, une insertion temporaire dans le registre Wikignose est autorisée ;
- avec un utilisateur authentifié non administrateur, la même insertion est refusée par PostgreSQL ;
- un visiteur anonyme conserve la lecture des contenus publics historiques ;
- le visiteur anonyme ne peut pas lire `wikignose_pending_documents` et ne voit aucun objet du bucket privé Wikignose.

Les écritures de test autorisées ont été exécutées dans une transaction annulée afin de ne laisser aucune donnée de test.

## Source historique

La première version a été portée depuis `ludodulac/Wikignose` le 4 septembre 2026. Les principes ci-dessus reprennent les contrats documentés dans ses anciens `AGENTS.md`, `docs/INDEXATION.md` et `docs/ADMIN_INDEXATION.md`, adaptés à l’architecture commune tout en gardant Wikignose séparé de l’expérience jeunesse publique.
