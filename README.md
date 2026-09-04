# La Forêt Enchantée

La Forêt Enchantée est une médiathèque personnelle audio construite en HTML, CSS et JavaScript avec Supabase pour les données, l’authentification et le stockage.

Le dépôt contient également **Wikignose**, désormais intégré comme module de recherche documentaire dans la même application et le même back-office.

## Surfaces principales

- `index.html` — médiathèque audio ;
- `audio.html?id=…` — fiche et lecteur d’une histoire ;
- `wikignose.html` — recherche documentaire Wikignose ;
- `blog.html` / `article.html` — journal ;
- `login.html` / `admin.html` — administration commune.

## Backend commun

Le projet Supabase de référence est **La forêt enchantée** (`jwyayfkssyagvnablttg`).

Il conserve les données historiques de la médiathèque et du blog et héberge désormais aussi le backend Wikignose. Les comptes administrateurs autorisés sont centralisés dans `public.app_admins` et les PDF Wikignose sont stockés dans le bucket privé `wikignose-pdfs`.

Les migrations de la fusion sont versionnées dans `supabase/migrations/`.

## Wikignose

La logique, l’index et les règles d’indexation Wikignose sont maintenant maintenus ici. Voir [`docs/WIKIGNOSE.md`](docs/WIKIGNOSE.md).

L’ancien dépôt `ludodulac/Wikignose` est conservé uniquement comme archive historique.

## Sécurité et intégrité des médias

Les visiteurs gardent un accès en lecture aux contenus publics. Les écritures sont réservées aux comptes présents dans `app_admins` via les politiques RLS.

Pour les audios, les remplacements suivent l’ordre **upload nouveau → mise à jour SQL → suppression ancien**. Une erreur de base ne doit donc plus supprimer un fichier encore référencé.

## Développement

Le site reste volontairement léger : pas de framework applicatif ni de dépendance de build obligatoire.

Un workflow GitHub Actions vérifie :

- la syntaxe des fichiers JavaScript ;
- la présence des surfaces Wikignose et administration ;
- la présence des migrations Supabase communes ;
- l’absence de référence active à l’ancien projet Supabase Wikignose.

Les changements de la refonte premium et de l’intégration Wikignose sont préparés dans une branche dédiée avant fusion vers `main`.
