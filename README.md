# 🍹 Pastis and Points

**Pastis and Points** est l'application mobile ultime pour suivre vos scores de pétanque en toute simplicité. Fini les disputes sur le score après le deuxième Ricard !

## ✨ Fonctionnalités

- **Score en un clic** : Appuyez sur la zone de votre équipe pour ajouter un point (une boule).
- **Interface Visuelle** : Distinction claire entre l'Équipe Rouge et l'Équipe Bleue.
- **Correction facile** : Un appui long permet de retirer un point en cas d'erreur.
- **Objectif 13** : Alerte automatique dès qu'une équipe atteint les mythiques 13 points.
- **Design Épuré** : Un seul bouton pour lancer la partie et un logo stylisé.

## 🚀 Installation & Développement

### Prérequis
- Node.js (v18+)
- Expo Go sur votre smartphone

### Lancer en local
```bash
# Installer les dépendances
npm install

# Lancer le serveur Expo
npx expo start
```
Scannez le QR Code avec l'application **Expo Go** (iOS/Android).

## 🐳 Déploiement Web (Docker)

L'application est prête à être déployée avec Docker et Traefik.

```bash
# Construire et lancer avec Docker Compose
docker compose up -d --build
```
L'image utilise **Nginx** pour servir la version web de l'application de manière performante.

## 📱 Publication Mobile (EAS)

Configuré pour **Expo Application Services** :
- **Android** : `npm run build:android`
- **iOS** : `npm run build:ios`

Pour un build local sur Mac (plus rapide) :
```bash
npx eas build --platform android --local
```

## 🛠 Tech Stack

- **Framework** : React Native / Expo
- **Langage** : TypeScript
- **Icons/Logo** : Custom SVG (React Native SVG)
- **Déploiement** : Docker & Nginx

---
Développé avec ❤️ pour les amateurs de pétanque. Bonne partie ! 🏁☀️
