# Tasbih — application Android

Application Android pour la bague Zikr Ring (iQIBLA) :
objectif par tour, nombre de tours, retour automatique à zéro, vibration à chaque tour.

## Installer
Lien permanent vers la **dernière version** (à ouvrir sur le téléphone Android) :
https://github.com/Malam1091/compteur-zikr/releases/latest/download/Tasbih.apk

Sur un nouveau téléphone, installez directement ce fichier : aucune version précédente n'est nécessaire.
GitHub compile l'application automatiquement à chaque modification.

## Structure
- `www/index.html` — l'interface et la logique du compteur
- `src/native.js` — Bluetooth et vibration natifs (Capacitor)
- `android/` — projet Android
- `.github/workflows/build-apk.yml` — compilation automatique

## Auteur et licence
© 2026 **Garba Inoussa Ismael** — Tous droits réservés.
Application gratuite, libre d'utilisation pour tous. Reproduction, modification ou vente
interdites sans autorisation. Voir le fichier [LICENSE](LICENSE).

L'APK est signé avec le certificat de l'auteur (RSA 3072 bits).
