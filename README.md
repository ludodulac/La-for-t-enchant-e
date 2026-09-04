# La Forêt Enchantée

La Forêt Enchantée est une médiathèque personnelle audio construite en HTML, CSS et JavaScript avec Supabase pour les données, l’authentification et le stockage.

Le dépôt héberge aussi **Wikignose**, un outil documentaire conséquent mais volontairement séparé de l’expérience jeunesse. Il partage le même dépôt, le même backend Supabase et le même back-office afin d’éviter de maintenir une seconde infrastructure, mais il ne doit pas être présenté comme une rubrique éditoriale de La Forêt Enchantée.

## Surfaces principales

- `index.html` — médiathèque audio jeunesse ;
- `audio.html?id=…` — fiche et lecteur d’une histoire ;
- `blog.html` / `article.html` — journal ;
- `login.html` / `admin.html` — administration commune ;
- `wikignose.html` — micro-site documentaire annexe, accessible discrètement depuis le bas de la navigation.

## Backend commun

Le projet Supabase de référence est **La forêt enchantée** (`jwyayfkssyagvnablttg`).

Il conserve les données historiques de la médiathèque et du blog et héberge désormais aussi le backend Wikignose. Les comptes administrateurs autorisés sont centralisés dans `public.app_admins` et les PDF Wikignose sont stockés dans le bucket privé `wikignose-pdfs`.

Les migrations de la fusion sont versionnées dans `supabase/migrations/`.

## Positionnement de Wikignose

Wikignose est un **outil compagnon** et non une fonctionnalité jeunesse. Son implémentation active reste maintenue ici pour mutualiser la sécurité, l’administration et le déploiement, mais son interface publique possède sa propre identité sobre et autonome.

La page `wikignose.html` est volontairement `noindex` afin de rester un outil trouvable depuis le site par les personnes qui en ont besoin, sans devenir une porte d’entrée publique concurrente à la médiathèque jeunesse.

La logique, l’index et les règles d’indexation sont documentés dans [`docs/WIKIGNOSE.md`](docs/WIKIGNOSE.md). L’ancien dépôt `ludodulac/Wikignose` est conservé uniquement comme archive historique.

## Sécurité et intégrité des médias

Les visiteurs gardent un accès en lecture aux contenus publics. Les écritures sont réservées aux comptes présents dans `app_admins` via les politiques RLS.

Pour les audios, les remplacements suivent l’ordre **upload nouveau → mise à jour SQL → suppression ancien**. Une erreur de base ne doit donc plus supprimer un fichier encore référencé.

Le blog applique désormais le même principe aux couvertures et aux médias inline : la base est mise à jour avant de supprimer un média ancien, et un nouveau fichier est nettoyé si son écriture SQL échoue.

## Développement

Le site reste volontairement léger : pas de framework applicatif ni de dépendance de build obligatoire.

Un workflow GitHub Actions vérifie :

- la syntaxe des fichiers JavaScript ;
- la présence des surfaces Wikignose et administration ;
- la présence des migrations Supabase communes ;
- l’absence de référence active à l’ancien projet Supabase Wikignose.

Les changements de la refonte premium et de l’intégration Wikignose sont préparés dans une branche dédiée avant fusion vers `main`.
