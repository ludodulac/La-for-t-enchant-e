# 🌲 La Forêt Enchantée — Bibliothèque audio jeunesse

Bibliothèque audio pour enfants, hébergée sur **GitHub Pages** et alimentée par **Supabase**.

---

## ✨ Fonctionnalités

- **Visiteurs** : parcourir les catégories, rechercher une histoire, écouter avec un lecteur audio moderne (play/pause, seek, volume, ±15s)
- **Administrateur** : ajouter / modifier / supprimer des audios et des catégories, upload des fichiers vers Supabase Storage
- **Sans compte visiteur** : aucune inscription requise
- **Responsive** : mobile et ordinateur

---

## 🗂 Structure des fichiers

```
foret-enchantee/
├── index.html           ← Accueil (catégories + recherche)
├── audio.html           ← Fiche de lecture d'un audio
├── login.html           ← Connexion administrateur
├── admin.html           ← Tableau de bord admin
├── css/
│   └── style.css        ← Design complet
├── js/
│   ├── supabase.js      ← Configuration Supabase ← À MODIFIER
│   ├── auth.js          ← Authentification
│   ├── app.js           ← Logique visiteurs
│   ├── audio.js         ← Lecteur audio
│   └── admin.js         ← Logique administration
├── supabase-setup.sql   ← Script SQL à exécuter dans Supabase
└── README.md
```

---

## 🚀 Installation pas à pas

### Étape 1 — Créer un projet Supabase

1. Rendez-vous sur [https://supabase.com](https://supabase.com) et créez un compte gratuit.
2. Cliquez sur **New project**, choisissez un nom et une région proche de la France (ex : `eu-west-1`).
3. Notez le **mot de passe de base de données** (vous en aurez besoin si vous administrez la BDD directement).

---

### Étape 2 — Exécuter le script SQL

1. Dans le tableau de bord Supabase, allez dans **SQL Editor** > **New query**.
2. Copiez-collez intégralement le contenu du fichier `supabase-setup.sql`.
3. Cliquez sur **Run** (ou `Ctrl+Entrée`).

Vous verrez se créer :
- Les tables `categories`, `subcategories`, `audios`
- Les catégories initiales (Contes traditionnels, Contes esséniens…)
- Les politiques RLS (sécurité)
- Les buckets Storage `images` et `audios`

> ⚠️ Si les politiques Storage génèrent une erreur (ex : policy already exists), ignorez ces erreurs — les buckets ont été créés. Vérifiez manuellement dans **Storage** que `images` et `audios` sont bien là et marqués **public**.

---

### Étape 3 — Récupérer les clés Supabase

1. Dans le tableau de bord Supabase, allez dans **Settings** (icône engrenage) > **API**.
2. Copiez :
   - **Project URL** (ex : `https://abcdefgh.supabase.co`)
   - **anon public key** (longue chaîne commençant par `eyJ…`)

---

### Étape 4 — Configurer le projet

Ouvrez le fichier `js/supabase.js` et remplacez les deux valeurs :

```js
const SUPABASE_URL     = 'https://VOTRE_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';
```

**⚠️ Attention** : la `anon key` est publique par conception (Supabase la rend publique), mais les politiques RLS empêchent les visiteurs d'écrire ou de supprimer des données. Ne partagez jamais votre `service_role key`.

---

### Étape 5 — Créer le compte administrateur

1. Dans le tableau de bord Supabase, allez dans **Authentication** > **Users** > **Add user**.
2. Entrez votre adresse e-mail et un mot de passe fort.
3. Cliquez sur **Create user**.

C'est tout. Vous pourrez vous connecter sur `login.html` avec ces identifiants.

---

### Étape 6 — Publier sur GitHub Pages

#### Option A — Interface GitHub (la plus simple)

1. Créez un nouveau dépôt sur [github.com](https://github.com) (ex : `foret-enchantee`).
2. Uploadez tous les fichiers du projet (glisser-déposer dans l'interface web).
3. Allez dans **Settings** > **Pages**.
4. Sous **Source**, sélectionnez la branche `main` et le dossier `/ (root)`.
5. Cliquez sur **Save**.

Votre site sera disponible à l'adresse :
```
https://VOTRE-NOM-UTILISATEUR.github.io/foret-enchantee/
```

#### Option B — Via Git en ligne de commande

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE-NOM/foret-enchantee.git
git push -u origin main
# Puis activer GitHub Pages dans Settings > Pages
```

---

### Étape 7 — Vérification finale

Checklist :
- [ ] Le site s'affiche sur l'URL GitHub Pages
- [ ] Les catégories apparaissent sur la page d'accueil
- [ ] La connexion admin fonctionne sur `/login.html`
- [ ] L'ajout d'un audio fonctionne (upload + apparition dans la liste)
- [ ] Le lecteur audio se lit correctement

---

## 🎨 Personnalisation

### Changer les couleurs
Dans `css/style.css`, modifiez les variables CSS en haut du fichier (section `:root`).

### Ajouter une catégorie
Depuis l'interface admin (`/admin.html`) > onglet **Catégories** > **Ajouter une catégorie**.

### Modifier le titre du site
Cherchez `La Forêt Enchantée` dans les fichiers HTML et remplacez par votre titre.

---

## ❓ Dépannage fréquent

| Problème | Solution |
|---|---|
| Les données ne s'affichent pas | Vérifiez `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans `js/supabase.js` |
| Erreur de connexion admin | Vérifiez que l'utilisateur existe dans Supabase Auth > Users |
| Les images/sons ne se chargent pas | Vérifiez que les buckets `images` et `audios` sont bien **public** dans Storage |
| Erreur RLS | Vérifiez que les politiques ont bien été créées via le script SQL |
| Upload échoue | Vérifiez les politiques Storage pour le rôle `authenticated` |

---

## 📄 Licence

Projet libre — à utiliser et adapter librement.
