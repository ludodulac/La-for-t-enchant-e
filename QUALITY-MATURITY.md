# Maturité de production — La Forêt Enchantée

Ce document décrit l’état de la branche de production `main` sans transformer des pistes produit en exigences techniques.

## Référence actuelle

- Production : GitHub Pages déployé depuis `main`.
- Architecture : HTML/CSS/JavaScript statique + Supabase `jwyayfkssyagvnablttg`.
- Sécurité : les autorisations d’écriture sont imposées par RLS ; l’interface Admin n’est qu’une couche UX.
- Wikignose : retiré de `main` ; les branches historiques qui le contiennent ne sont pas une référence fonctionnelle.

## Matrice implemented / tested / verified

`Implemented` = présent dans le code ou le backend de production.
`Tested` = couvert par un contrôle automatisé reproductible.
`Verified` = comportement réellement confirmé sur la production ou par un test interactif récent.

| Domaine | Implemented | Tested | Verified | Preuve / limite actuelle |
| --- | --- | --- | --- | --- |
| Upload audio | oui | oui | partiel | Nouveau fichier → écriture DB → nettoyage ancien ; rollback Storage des nouveaux fichiers si SQL échoue. CI vérifie le contrat. Un CRUD Admin interactif récent reste à refaire sans toucher aux médias historiques. |
| Publication Journal | oui | oui | partiel | Le public ne charge que `published = true`; les mutations Admin conservent `published_at`. CI vérifie les contrats statiques. La lecture des contenus publiés est confirmée, pas le cycle publish/unpublish interactif complet. |
| Sanitization Journal | oui | oui | partiel | `sanitizeArticleHtml` retire éléments actifs, handlers, `srcdoc`, URLs dangereuses et limite les iframes à YouTube. CI vérifie la frontière. Un jeu de payloads malveillants en navigateur reste souhaitable. |
| Permissions | oui | oui | oui/partiel | RLS est activé sur `audios`, `articles`, `categories`, `subcategories`, `app_admins`; les politiques d’écriture ciblent les utilisateurs authentifiés et l’allow-list `app_admins`. L’état backend est vérifié, mais un test de rôle non-admin interactif périodique reste utile. |
| Responsive | oui | oui | partiel | Les couches CSS responsives sont présentes et le CI vérifie leurs media queries. Une validation visuelle desktop/tablette/mobile doit rester une étape de release quand l’UI change. |

## Contrats de mutation sûrs

Pour toute mutation qui remplace un média référencé :

1. uploader le nouveau média sous un nouveau chemin ;
2. écrire la nouvelle référence en base ;
3. seulement après succès DB, supprimer l’ancien média ;
4. si l’écriture DB échoue, supprimer le nouveau média devenu orphelin ;
5. si le nettoyage de l’ancien média échoue après succès DB, conserver la référence DB valide et signaler un nettoyage à reprendre.

Pour une suppression définitive comportant des médias : supprimer d’abord la ligne DB, puis nettoyer uniquement les objets Storage devenus non référencés. La base reste ainsi la source de vérité.

## Pistes évaluées mais non introduites

### Soft-delete / corbeille

Potentiellement utile pour les audios et articles, mais le volume actuel est faible et le produit ne définit pas encore la durée de rétention, la restauration des médias, ni le comportement des URLs publiques après suppression. Ne pas ajouter de colonnes `deleted_at`, de bucket de corbeille ou de restauration implicite avant cette décision produit.

Question produit à trancher : **une suppression d’audio/article doit-elle être récupérable, pendant combien de temps, et une restauration doit-elle rétablir automatiquement publication, catégorie et médias ?**

### Segmentation profil / groupe / parcours

Non justifiée aujourd’hui : le modèle actuel est une bibliothèque publique avec administration, sans notion produit d’assignation individuelle ou de visibilité par groupe. Ne pas importer les tables ou concepts de Célébrations tant qu’un cas d’usage concret n’existe pas.

### Catalogues / index générés

Le volume actuel (quelques audios et articles) ne justifie pas d’artefact de catalogue généré. Réévaluer lorsque le volume rend les contrôles manuels ou les requêtes directes difficiles à auditer.

### Progressive disclosure

Déjà obtenue en grande partie par la séparation expérience publique / back-office. Préserver cette séparation avant d’ajouter des contrôles avancés au public.

### Métriques d’usage

Ne pas construire de nouvelles fonctions sur des hypothèses. Avant d’ajouter de l’analytics, définir explicitement les décisions produit à informer, les événements minimaux nécessaires, la durée de conservation et les contraintes de confidentialité.

## Vérifications de release à conserver

- CI statique verte sur le SHA livré ;
- contrôle visuel desktop + mobile après changement d’interface ;
- test Admin ciblé après changement de mutation média ;
- test rôle non-admin après changement RLS/auth ;
- payloads de sanitization après changement du rendu riche ;
- advisors Supabase après migration de sécurité ou de schéma.
