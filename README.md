# Compteur Zikr — application Android

Application Android pour la bague Zikr Ring (iQIBLA) :
objectif par tour, nombre de tours, retour automatique à zéro, vibration à chaque tour.

## Obtenir l'APK
GitHub compile l'application automatiquement à chaque envoi de fichiers.
L'APK apparaît dans l'onglet **Releases** du dépôt (fichier `CompteurZikr.apk`).

## Structure
- `www/index.html` — l'interface et la logique du compteur
- `src/native.js` — Bluetooth et vibration natifs (Capacitor)
- `android/` — projet Android
- `.github/workflows/build-apk.yml` — compilation automatique
