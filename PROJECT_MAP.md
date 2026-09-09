# La Forêt Enchantée — carte de navigation

Commencer par `AI_START_HERE.md`. Ce fichier évite de parcourir tout le dépôt lorsqu'une zone suffit.

## Bibliothèque publique

- `index.html` + JS/CSS réellement chargés — choix d'une histoire, recherche, catégories et hiérarchie de bibliothèque.
- `audio.html` + lecteur associé — expérience d'écoute ; préserver le mode calme.
- `blog.html` / `article.html` — Journal, séparé de la tâche d'écoute principale.

## Administration

- `admin.html` + scripts admin réellement chargés — gestion histoires/articles.
- `js/auth.js` et couches de sécurité associées — accès admin : vérifier avant toute modification.
- Pour remplacement média : préserver le principe sûr **nouveau média valide → mise à jour DB → suppression de l'ancien**, avec nettoyage du nouveau si l'écriture échoue.

## Données / backend

- `supabase/` et requêtes réelles — source de vérité pour schéma, RLS et capacités de publication.
- Ne pas inventer un statut brouillon/publié pour les audios sans migration cohérente du schéma, des politiques et des requêtes publiques.

## Principes UX durables

- simplicité enfant : ouvrir → voir quoi écouter → reconnaître → toucher → écouter ;
- pas de navigation vocale, profil enfant complexe, onboarding ou recommandation lourde par défaut ;
- simplicité enfant ≠ suppression des capacités utiles à l'adulte ;
- pendant l'écoute, l'interface doit s'effacer plutôt que se complexifier ;
- si l'enfant ne comprend pas l'écran, simplifier l'écran au lieu d'ajouter une couche explicative.

Toujours vérifier le comportement réel et l'état déployé avant de conclure qu'une fonction est opérationnelle.
