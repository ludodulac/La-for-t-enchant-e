# AI_START_HERE — La Forêt Enchantée

Ce fichier est un **routeur**, pas une seconde documentation du projet. Une tâche ciblée doit charger seulement le contexte nécessaire.

## 1. Commencer par l’état réel

Avant de modifier quoi que ce soit :

1. partir de `main` et regarder les commits récents ;
2. vérifier les PR/issues ouvertes pertinentes ;
3. vérifier les derniers runs de `.github/workflows/static-checks.yml` et `.github/workflows/pages-production.yml` ;
4. lire `README.md` pour l’état général, puis seulement les fichiers de la zone touchée ;
5. si une affirmation historique contredit le code, les politiques, les données ou le comportement déployé, considérer l’historique comme périmé jusqu’à preuve contraire.

Hiérarchie de vérité : **code + données + RLS/policies + comportement déployé > contrats maintenus > état opérationnel actuel > README > historique/anciennes expériences**.

État à ne pas oublier : La Forêt Enchantée est actuellement une médiathèque personnelle audio et de contenu, simple, chaleureuse et accessible. **Wikignose a été retiré de `main`** ; ne pas le traiter comme une fonctionnalité actuelle ni le réintroduire à partir de vieux commits sans décision produit explicite.

## 2. Sources de vérité et frontières

- Pages publiques : `index.html`, `audio.html`, `blog.html`, `article.html`.
- Logique publique : `js/app.js`, `js/audio.js`, `js/blog.js`, avec `js/app-accessibility.js` et `js/app-resilience.js` quand concernés.
- Styles publics : `css/app-2026.css`; Journal : `css/blog-2026.css`. Les anciens `css/style.css` et `css/blog.css` ne sont pas à présumer actifs : vérifier les `<link>` de la page touchée avant de les modifier.
- Administration : `admin.html`, `js/admin.js`, `js/admin-blog.js`, `js/admin-blog-safety.js`, `js/admin-ux.js`, `css/admin-2026.css`.
- Auth : `login.html`, `js/auth.js`.
- Client Supabase : `js/supabase.js`. Vérifier ici le projet réellement visé avant toute mutation.
- Schéma/policies versionnés : `supabase/migrations/`.
- CI : `.github/workflows/static-checks.yml`.
- Production : `.github/workflows/pages-production.yml` déploie `main` sur GitHub Pages.

Ne pas confondre source canonique et dérivés : les tables Supabase portent les données métier ; Storage porte les fichiers ; chemins/métadonnées relient les deux ; DOM, vues, `localStorage` de reprise/récents et autres calculs sont dérivés. Un dérivé ne devient pas silencieusement la nouvelle source de vérité.

## 3. Routage : quoi lire — et quoi éviter

### Médiathèque / consultation publique

Lire d’abord `index.html` + `js/app.js` + `css/app-2026.css`, puis `js/supabase.js` et seulement les tables/champs nécessaires (`audios`, `categories`, `subcategories`). Lire `js/app-accessibility.js` si navigation/clavier/annonces sont touchés.

Ne pas charger l’admin, le Journal ou toutes les migrations sans dépendance réelle.

Préserver une distinction claire : **choisir quoi écouter ≠ écouter**. La découverte peut être riche ; pendant l’écoute, l’interface peut devenir plus calme et moins envahissante. Conserver recherche, filtres, vues, reprise et historique sauf décision explicite de remplacement/migration.

### Audio / jeunesse / écoute

Pour une fiche ou le lecteur dédié : `audio.html` + `js/audio.js` + styles effectivement liés par `audio.html`, puis `js/supabase.js` et la ligne `audios` nécessaire. Si le mini-player ou la reprise depuis la médiathèque est concerné, ajouter `index.html` + `js/app.js`.

Préserver : accès compréhensible pour l’enfant, peu de distractions pendant l’écoute, expérience calme, navigation adaptée à l’âge si pertinente, reprise simple. Les fonctions parentales doivent répondre à une valeur réelle. Alma Studio, Franceinfo jeunesse ou autres références externes sont des benchmarks, jamais des spécifications à recopier.

### Administration

Lire `admin.html`, puis seulement les scripts de la capacité touchée :

- audio/catégories : `js/admin.js` ;
- Journal : `js/admin-blog.js` + **`js/admin-blog-safety.js`** ;
- auth/autorisation : `js/auth.js` ;
- UX admin : `js/admin-ux.js` seulement si concerné ;
- données/sécurité : `js/supabase.js` + migration/policy pertinente.

L’admin peut être plus dense que le public. Ne pas supprimer une capacité administrative sous prétexte de simplifier l’expérience publique.

### Médias / fichiers

Avant remplacement/suppression, identifier la ligne SQL qui référence le fichier et son bucket (`audios`, `images`, `blog-images`). Préserver l’ordre sûr :

`upload nouveau → vérifier → mettre à jour SQL → vérifier → supprimer ancien`.

Si l’écriture SQL échoue après upload, nettoyer le nouveau fichier si cela peut être fait sans risque. Pour une suppression complète, supprimer d’abord la référence canonique en base, puis nettoyer Storage. Ne jamais supprimer l’ancien fichier avant d’avoir une nouvelle référence valide.

Les implémentations actuelles de référence sont `js/admin.js` pour les audios/images et `js/admin-blog-safety.js` pour les médias du Journal.

### Supabase / données / auth

Toujours vérifier le projet dans `js/supabase.js`, puis la migration/policy pertinente dans `supabase/migrations/`. Le projet actuellement référencé est celui dont le ref est `jwyayfkssyagvnablttg`; ne jamais recopier une autre référence depuis l’historique sans vérification.

Règle : lecture publique seulement lorsque le produit l’exige ; écritures admin protégées par le modèle réel `app_admins` / `is_app_admin()` et RLS. Ne pas contourner RLS dans le frontend. Pour toute modification auth/admin, tester un cas autorisé **et** non autorisé.

### Journal / contenu riche

Public : `blog.html` / `article.html` + `js/blog.js` + `css/blog-2026.css`.

Admin : `admin.html` + `js/admin-blog.js` + `js/admin-blog-safety.js`.

`js/blog.js` filtre le HTML riche avant rendu. Ne pas retirer cette sanitation pour corriger un problème visuel ; si représentation et rendu divergent, corriger le bon niveau sans ouvrir l’injection de scripts, handlers, URL dangereuses ou embeds non autorisés.

## 4. Invariants à préserver

- Produit personnel, simple, chaleureux, accessible, agréable à parcourir, particulièrement attentif à l’écoute.
- Pas de transformation implicite en grosse plateforme média, réseau social ou système documentaire.
- Préserver avant de supprimer : inventorier les usages, garder ce qui fonctionne, ajouter/migrer, vérifier, puis retirer seulement ce qui est réellement inutile.
- Données Supabase, médias, admin, contenu existant et navigation publique ne doivent pas perdre silencieusement une capacité.
- Les explorations futures restent distinctes du produit actuel tant qu’elles ne sont pas intégrées et vérifiées sur `main`/production.

## 5. Tester proportionnellement

Ordre par défaut : **inspection → test ciblé → vérification fonctionnelle → validation plus large seulement si nécessaire**.

- JS touché : `node --check` sur le ou les fichiers concernés ; lancer les contrôles de `.github/workflows/static-checks.yml` pertinents.
- UI : vérifier le parcours affecté ; desktop/mobile si la mise en page ou l’interaction est concernée.
- Écoute : vérifier plus que Play/Pause — entrée dans l’écoute, distractions, reprise, progression, sortie/retour et continuité avec la découverte.
- Mutation donnée/média : vérifier l’état avant/après en base et Storage, y compris le chemin d’échec.
- Auth/admin : cas autorisé + refusé, sans affaiblir RLS.
- Journal riche : contenu légitime + contenu dangereux représentatif.

Ne pas lancer une validation lourde sans raison et ne pas laisser une commande longue tourner sans suivi.

## 6. Passation sans journal massif

Ne pas créer un journal chronologique par défaut. Pour une session importante, utiliser en priorité la **PR active** (ou, pour un petit changement direct, le commit) comme passation courte avec :

- changé réellement ;
- vérifié ;
- reste à tester ;
- migrations/mutations de données ou médias ;
- expérimental ;
- supprimé/abandonné ;
- prochaine action utile.

Si une PR ou un document existant porte déjà cet état, le mettre à jour plutôt que créer un nouveau fichier. Une ancienne PR/documentation reste historique après merge/abandon : revalider contre `main` avant de s’y fier.

## 7. Avant de terminer

Vérifier que tous les chemins cités existent encore, que les protections de mutation et de sécurité sont intactes, et que la tâche suivante peut démarrer avec ce routeur + la seule zone concernée. Si le travail révèle qu’un document, une branche ou une expérience est périmé, le dire explicitement dans la passation au lieu de laisser deux vérités concurrentes.
