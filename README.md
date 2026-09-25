# 📻 Radio Browser - Application d'écoute en ligne

Une application web simple pour écouter les stations de radio en ligne en utilisant l'API [Radio Browser](https://www.radiobrowser.org/).

## Fonctionnalités

- 🔍 **Recherche de stations** par nom
- 🌍 **Recherche par pays** (code pays ex: FR, US, DE)
- 📈 **Top 50 stations** les plus populaires
- ▶️ **Lecture audio intégrée** (élément `<audio>`)
- ★ **Sauvegarde des favoris** dans `localStorage`
- 📱 **Responsive design**
- 📲 **Installation comme PWA** sur smartphone

## Prérequis

- Aucun serveur requis (site statique)
- Un navigateur moderne avec support CORS
- L'API Radio Browser est CORS-friendly (requêtes autorisées depuis le navigateur)

## Installation locale

```bash
# Clonez le dépôt
git clone <URL_DU_DEPOT>
cd radio-app

# Ouverture dans le navigateur
# Vous pouvez ouvrir le fichier index.html directement
# ou utiliser un serveur local simple
```

### Option 1 : Ouvrir directement (pas recommandé pour le chargement des APIs)

Double-cliquez sur `index.html` dans le gestionnaire de fichiers.

### Option 2 : Serveur local (recommandé)

```bash
# Avec Python 3
python -m http.server 8000

# Avec Node.js (installé en global)
npx serve .
```

Puis ouvrez http://localhost:8000 dans votre navigateur.

## Déploiement sur Netlify

1. **Comptez un dépôt Git** (GitHub, GitLab, Bitbucket)

2. **Connectez votre dépôt à Netlify** :
   - Rendez-vous sur https://app.netlify.com
   - Cliquez sur "New site from Git"
   - Sélectionnez votre fournisseur de dépôt
   - Choisissez le dépôt

3. **Configuration** (généralement automatique pour un site statique) :
   - Build command : laissez vide (pas de build nécessaire)
   - Publish directory : `/` (racine)

4. **Déploiement** :
   - Netlify build et déploie automatiquement
   - Vous recevrez une URL comme `https://nom-de-votre-site.netlify.app`

### Installation comme PWA

Après le déploiement HTTPS sur Netlify, ouvrez le site dans Chrome ou Safari sur votre smartphone, puis utilisez l'option du navigateur **Ajouter à l'écran d'accueil** ou **Installer l'application**.

Le service worker met en cache l'interface de l'application. Les stations et les flux audio nécessitent une connexion réseau.

### Mise à jour

Chaque fois que vous poussez (push) des modifications sur le dépôt, Netlify les déploiera automatiquement.

## Structure du projet

```
radio-app/
├── index.html          # Page principale
├── style.css           # Styles CSS
├── app.js              # Logique JavaScript
├── manifest.webmanifest # Configuration PWA
├── service-worker.js   # Cache de l'interface
├── icons/              # Icônes de l'application
├── netlify.toml        # Configuration Netlify
└── README.md           # Ce fichier
```

## API Radio Browser

L'API utilisée est disponible ici : https://www.radiobrowser.org/

### Endpoints principaux

| Endpoint | Description |
|----------|-------------|
| `/json/stations/topclick/{limit}` | Top stations par clics |
| `/json/stations/search?name=...` | Rechercher par nom |
| `/json/stations/bycountry/{code}` | Stations par pays |

Exemple : `https://de1.api.radio-browser.info/json/stations/topclick/50`

## License

Ce projet est fait pour un usage personnel. N'hésitez pas à l'améliorer et à partager !

---
Créé avec ❤️ pour les amateurs de radio.