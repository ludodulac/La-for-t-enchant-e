# La Forêt Enchantée

La Forêt Enchantée est une médiathèque personnelle audio construite en HTML, CSS et JavaScript avec Supabase pour les données, l’authentification et le stockage.

## Surfaces principales

- `index.html` — médiathèque audio jeunesse ;
- `audio.html?id=…` — fiche et lecteur d’une histoire ;
- `blog.html` / `article.html` — journal ;
- `login.html` / `admin.html` — administration.

## Backend

Le projet Supabase de référence est **La forêt enchantée** (`jwyayfkssyagvnablttg`).

Il conserve les données de la médiathèque et du blog. Les comptes administrateurs autorisés sont centralisés dans `public.app_admins`.

Les migrations nécessaires au projet sont versionnées dans `supabase/migrations/`.

## Sécurité et intégrité des médias

Les visiteurs gardent un accès en lecture aux contenus publics. Les écritures sont réservées aux comptes présents dans `app_admins` via les politiques RLS.

Pour les audios, les remplacements suivent l’ordre **upload nouveau → mise à jour SQL → suppression ancien**. Une erreur de base ne doit donc plus supprimer un fichier encore référencé.

Le blog applique désormais le même principe aux couvertures et aux médias inline : la base est mise à jour avant de supprimer un média ancien, et un nouveau fichier est nettoyé si son écriture SQL échoue.

Le rendu public du Journal échappe les métadonnées et filtre le HTML riche avant affichage afin de retirer scripts, handlers d’événements, URL `javascript:` et embeds non autorisés, tout en conservant les liens, images et vidéos YouTube légitimes.

Le back-office masque son interface tant que l’autorisation `app_admins` n’est pas validée. Les extensions UX et sécurité Blog ne sont chargées qu’après cette validation ; les politiques RLS restent la protection serveur de référence.

## Expérience publique

La médiathèque, les fiches audio et le Journal partagent la même direction visuelle premium et responsive. Le Journal conserve ses URLs et son modèle de données existants, mais utilise une couche de présentation modernisée dans `css/blog-2026.css`.

La médiathèque conserve recherche, filtres, vues grille/liste, mini-player, reprise d’écoute et historique récent. Une couche d’accessibilité améliore aussi la navigation clavier et l’annonce des cartes et états de navigation.

## Développement

Le site reste volontairement léger : pas de framework applicatif ni de dépendance de build obligatoire.

Un workflow GitHub Actions vérifie notamment la syntaxe JavaScript, la présence des surfaces publiques et administratives, les contrats DOM essentiels, la cohérence du projet Supabase, la sécurité du blog et l’orchestration du back-office.

Le workflow utilise une version actuelle de `actions/checkout` compatible avec le runtime Node 24 des runners GitHub Actions.
