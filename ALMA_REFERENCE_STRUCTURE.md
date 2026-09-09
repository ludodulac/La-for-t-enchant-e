# La Forêt Enchantée — structure produit inspirée d’Alma Studio

Ce document sert de référence fonctionnelle et UX pour faire évoluer **La Forêt Enchantée** vers une expérience proche d’Alma Studio, sans copier son identité graphique, ses textes, ses logos, ses personnages ni ses visuels.

Objectif : reprendre au maximum les **parcours, fonctionnalités, formes d’écrans, hiérarchie, logique mobile et comportements d’usage**, puis les adapter à l’univers propre de La Forêt Enchantée.

> Priorité actuelle : pas d’inscription utilisateur en ligne, pas d’abonnement, pas de système de compte familial complet. On commence avec une expérience locale/simple, puis on pourra connecter davantage de données plus tard.

---

## 1. Architecture générale

Deux espaces clairement séparés :

### Zone enfant
- accès direct aux histoires ;
- interface simple, visuelle et tactile ;
- grosses cartes ;
- navigation réduite ;
- profil enfant visible ;
- accès parent protégé ;
- lecteur audio très épuré ;
- possibilité de reprendre une histoire commencée.

### Zone parent
- protégée par une barrière simple de type calcul mental ;
- réglages par enfant ;
- gestion des profils ;
- contrôle des contenus ;
- minuteur ;
- anti-zapping ;
- mode nuit ;
- barre de lecture ;
- téléchargements / stockage ;
- statistiques d’écoute ;
- blocage de titres ;
- gestion des préférences de langue.

L’administration technique existante (`admin.html`) reste séparée de cette future **zone parent**.

---

## 2. Écran d’entrée / choix du profil

Écran simple avec :
- titre d’accueil ;
- question du type « Vers quel espace souhaitez-vous aller ? » ;
- option « Mode guidé / écran épinglé » ;
- carte « Espace parents » ;
- cartes profils enfants avec avatar, prénom et âge.

### Comportement
- un clic sur un profil enfant ouvre directement sa zone ;
- un clic sur l’espace parent déclenche la protection parentale ;
- le profil actif est mémorisé localement ;
- l’avatar du profil actif reste visible dans la zone enfant.

### Phase 1
Stockage des profils localement dans le navigateur (`localStorage`).

### Plus tard
Migration éventuelle vers Supabase si plusieurs appareils doivent partager les mêmes profils.

---

## 3. Protection de l’espace parent

Avant d’entrer dans l’espace parent :
- modal / bottom sheet ;
- petit calcul aléatoire simple ;
- clavier numérique ;
- bouton Valider ;
- bouton fermer.

Objectif : empêcher l’accès accidentel d’un jeune enfant, pas créer une sécurité forte.

---

## 4. Zone enfant — navigation principale mobile

Navigation fixe en bas inspirée de l’application mobile :

1. **Accueil**
2. **Catégories**
3. **Langue**
4. **Minuteur**

Sur une version plus riche, « Recherche » peut être accessible depuis l’accueil ou devenir un onglet dédié.

### Desktop
Ne pas agrandir mécaniquement la barre mobile. Adapter l’architecture :
- sidebar légère ou navigation horizontale ;
- contenu centré avec largeur maximale ;
- cartes plus nombreuses par ligne ;
- mêmes fonctions et même hiérarchie que sur mobile.

---

## 5. Accueil enfant

En haut :
- « Bonjour [prénom] » ;
- avatar du profil ;
- bouton cadenas vers l’espace parent.

Contenu principal :
- grande sélection éditoriale / histoire mise en avant ;
- image de couverture dominante ;
- titre ;
- bouton principal « Découvrir » ou « Écouter ».

Puis des rails horizontaux :
- Nouveautés ;
- Histoires douces ;
- Pour les curieux ;
- Pour rire ;
- Aventures ;
- Musique ;
- autres collections selon le contenu réel.

Chaque carte peut afficher :
- couverture ;
- âge conseillé ;
- thème / mot-clé ;
- titre.

### Reprise d’écoute
Si une histoire a déjà été commencée :
- mini-player persistant en bas de l’écran ;
- couverture miniature ;
- titre ;
- épisode ;
- temps restant ;
- bouton lecture.

Le moteur actuel de reprise d’écoute doit être conservé.

---

## 6. Catégories enfant

Écran en grille 2 colonnes sur mobile avec grosses cartes illustrées :
- Nouveautés ;
- Une histoire douce ;
- Une histoire pour les curieux ;
- Une histoire pour rire ;
- Une aventure ;
- De la musique ;
- Toutes les histoires.

Chaque catégorie :
- couleur / univers propre ;
- illustration ou personnage propre à La Forêt Enchantée ;
- texte très lisible ;
- grande zone tactile.

Desktop : plus de colonnes, mêmes catégories.

---

## 7. Recherche

Écran ou section comportant :
- grand champ de recherche ;
- résultats instantanés ;
- rails de contenus par catégorie si aucune recherche active.

Recherche sur :
- titre ;
- description ;
- catégorie ;
- sous-catégorie.

La recherche actuelle existe déjà et doit être réutilisée.

---

## 8. Langue

Modal ou écran simple :
- Français ;
- Anglais.

Le choix peut être :
- global au départ ;
- puis spécifique à chaque profil enfant.

À terme, chaque profil peut n’afficher que les contenus correspondant à sa langue.

Pour une version bilingue très simple, on peut garder deux profils séparés si cela simplifie l’usage enfant.

---

## 9. Fiche d’une série / collection

Écran avec :
- grande couverture ;
- retour ;
- accès parent ;
- titre de la série ;
- durée totale ou indication de contenu ;
- liste verticale des épisodes.

Chaque épisode :
- vignette ;
- titre ;
- durée ;
- indicateur déjà écouté ;
- bouton lecture rond très visible.

Si une collection contient beaucoup d’épisodes : scroll vertical simple.

---

## 10. Lecteur audio plein écran

Pendant l’écoute :
- fond très calme ;
- titre centré ;
- progression ;
- temps actuel ;
- durée totale ;
- gros bouton lecture / pause ;
- éventuellement retour 15 s / avance 15 s ;
- bouton fermer / retour discret.

Principe central : **plus l’écoute avance, plus l’interface s’efface**.

### Barre de lecture
Peut être désactivée par profil dans l’espace parent.

Si désactivée :
- pas de scrubbing libre ;
- interface encore plus simple.

### Reprise
À la prochaine ouverture : reprendre à l’endroit mémorisé.

---

## 11. Minuteur enfant

Accessible depuis la zone enfant et configurable depuis l’espace parent.

Fonctionnement :
- durée définie pour le profil ;
- activation / désactivation ;
- quand le temps est écoulé, laisser terminer l’histoire en cours ;
- ensuite mettre l’application en veille / empêcher une nouvelle lecture.

UI :
- durée visible ;
- bouton démarrer / arrêter ;
- grand sélecteur heures / minutes côté parent.

---

## 12. Anti-zapping

Réglage par enfant.

Durées possibles :
- désactivé ;
- 15 secondes ;
- 30 secondes ;
- 45 secondes ;
- 60 secondes.

Quand activé :
- après démarrage d’une histoire, l’enfant ne peut plus changer immédiatement de contenu ;
- une fois la durée écoulée, la navigation redevient possible.

But : réduire le jeu compulsif avec l’interface et favoriser l’écoute.

---

## 13. Mode nuit

Réglage par enfant.

Fonctionnement :
- activation / désactivation ;
- plage horaire ;
- tous les jours ou jours choisis ;
- pendant cette plage, seuls les contenus « doux / calmes » restent accessibles.

Exemple : 20:00 → 07:00.

Desktop et mobile utilisent la même règle.

---

## 14. Barre de lecture

Réglage par enfant :
- activée ;
- désactivée.

Quand activée : l’enfant peut avancer / reculer dans l’histoire.

Quand désactivée :
- seule lecture / pause reste disponible ;
- éventuellement retour court contrôlé.

Pour les plus jeunes, désactivée par défaut peut être une bonne logique.

---

## 15. Contenus selon l’âge

Chaque profil possède une date de naissance ou un âge.

Les contenus peuvent avoir un âge recommandé :
- 3+ ;
- 5+ ;
- 7+ ;
- etc.

Réglage parent : autoriser ou non les contenus normalement destinés à une tranche supérieure.

À terme, l’accueil enfant filtre automatiquement les contenus selon le profil.

---

## 16. Gestion d’un profil enfant

Données prévues :
- avatar ;
- prénom ;
- mois de naissance ;
- année de naissance ;
- âge calculé ;
- langue ;
- autorisation de liker ;
- titres bloqués ;
- réglages de navigation ;
- minuteur ;
- anti-zapping ;
- mode nuit ;
- barre de lecture.

### Statistiques visibles au parent
- histoires / épisodes les plus écoutés ;
- nombre de lectures ;
- historique récent.

Pas nécessaire dans la première étape fonctionnelle, mais prévu dans la structure.

---

## 17. Likes et titres bloqués

Par profil :
- autoriser ou désactiver les likes ;
- liste des titres bloqués par le parent.

Un titre bloqué ne doit plus apparaître dans la zone enfant concernée.

---

## 18. Stockage / hors ligne

Espace parent :
- liste des contenus téléchargés ;
- taille utilisée ;
- suppression individuelle ;
- supprimer tous les téléchargements ;
- télécharger toutes les histoires si souhaité.

À court terme sur le site web, ne pas promettre du vrai téléchargement hors ligne avant d’avoir choisi une stratégie PWA / Cache Storage / IndexedDB.

Le moteur public actuel continue de lire depuis Supabase.

---

## 19. Mode guidé / écran épinglé

Option présentée au moment de passer en zone enfant.

Sur Android / mobile :
- guider l’adulte vers l’épinglage d’application ou accès guidé ;
- empêcher l’enfant de quitter facilement l’application.

Sur navigateur desktop : cette fonction n’a pas d’équivalent fiable ; l’interface doit simplement fonctionner normalement.

---

## 20. Conseils parents

Section « Conseils » ou aide parentale avec cartes visuelles :
- empêcher l’enfant de sortir de l’application ;
- favoriser la concentration ;
- utiliser français / anglais ;
- définir un temps d’écoute ;
- limiter les interruptions ;
- mode nuit ;
- usage hors ligne / mode avion.

Ces pages peuvent être ajoutées plus tard, car elles n’affectent pas le cœur de l’écoute.

---

## 21. Espace parent — navigation

Sur mobile : barre en bas du type :
- Accueil ;
- Rechercher ;
- Conseils ;
- Réglages.

Sur desktop : navigation latérale ou horizontale.

Accueil parent :
- mise en avant de contenus ;
- nouveautés ;
- accès rapide aux profils ;
- raccourci vers les réglages.

---

## 22. Réglages parentaux

Écran central contenant :

### Profils enfants
Carrousel / liste des profils.

### Configuration
- langue principale zone parent ;
- anti-zapping ;
- minuteur ;
- barre de lecture ;
- choix / niveau de navigation ;
- contenus +7 ans / filtre âge ;
- stockage ;
- mode nuit ;
- informations.

### Partage
- inviter / partager le site ;
- noter l’application, uniquement si pertinent plus tard.

### Informations
Pour le moment : pas de compte en ligne obligatoire.

---

## 23. Ce que l’on NE construit PAS maintenant

- inscription publique ;
- création de compte familial ;
- abonnement / paiement ;
- synchronisation multi-appareils ;
- système commercial ;
- notifications push ;
- téléchargement hors ligne complexe avant choix technique ;
- copie exacte des textes, personnages, logos ou visuels Alma Studio.

---

## 24. Ce que l’on conserve du projet actuel

À préserver autant que possible :
- Supabase comme backend médias ;
- tables catégories / sous-catégories / audios ;
- administration existante ;
- blog / Journal ;
- sécurité et RLS existantes ;
- stockage des médias ;
- reprise d’écoute ;
- historique récent ;
- moteur de recherche ;
- lecteur HTML5 ;
- responsive desktop existant comme base technique.

Le chantier concerne d’abord **l’expérience publique enfant**, pas une réécriture totale du projet.

---

## 25. Ordre de construction recommandé

### Étape 1 — coque enfant mobile + desktop
- sélection de profil locale ;
- accueil enfant ;
- navigation basse mobile ;
- catégories visuelles ;
- accès aux audios existants ;
- mini-player / reprise conservés ;
- adaptation desktop cohérente.

### Étape 2 — fiches collections + lecteur simplifié
- écran série ;
- liste d’épisodes ;
- lecteur plein écran ;
- barre de lecture configurable ensuite.

### Étape 3 — espace parent local
- protection par calcul ;
- liste des profils ;
- édition simple de profil ;
- réglages locaux.

### Étape 4 — contrôles parentaux
- minuteur ;
- anti-zapping ;
- mode nuit ;
- filtre âge ;
- barre de lecture ;
- blocage de titres.

### Étape 5 — enrichissements
- statistiques ;
- likes ;
- conseils ;
- hors ligne / PWA ;
- langues avancées.

---

## 26. Règle de conception

Toujours partir du geste enfant attendu :

**ouvrir → choisir son profil → voir quoi écouter → reconnaître → toucher → écouter → interface calme**.

Pour l’adulte :

**ouvrir espace parent → passer la protection → choisir un profil → régler précisément → revenir à la zone enfant**.

Sur mobile, l’expérience doit rester très proche des interactions observées dans Alma Studio. Sur ordinateur, on conserve exactement les mêmes capacités mais avec une mise en page adaptée au grand écran, sans simuler artificiellement un téléphone au centre de la page.
