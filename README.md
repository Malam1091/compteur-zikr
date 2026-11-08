# Tasbih — application Android

Application Android pour la bague Zikr Ring (iQIBLA) :
objectif par tour, nombre de tours, retour automatique à zéro, vibration à chaque tour.

## Obtenir l'APK
GitHub compile l'application automatiquement à chaque envoi de fichiers.
L'APK apparaît dans l'onglet **Releases** du dépôt (fichier `Tasbih.apk`).

## Structure
- `www/index.html` — l'interface et la logique du compteur
- `src/native.js` — Bluetooth et vibration natifs (Capacitor)
- `android/` — projet Android
- `.github/workflows/build-apk.yml` — compilation automatique

## Auteur et licence
© 2026 **Malam** (Malam1091) — Tous droits réservés.
Application gratuite, libre d'utilisation pour tous. Reproduction, modification ou vente
interdites sans autorisation. Voir le fichier [LICENSE](LICENSE).

L'APK est signé avec le certificat de l'auteur : `CN=Malam, O=Malam1091, L=Niamey, C=NE`.
