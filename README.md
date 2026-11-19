# Salle PS5

Application de gestion d'une salle de jeux PS5 : postes avec chronomètre, bar et stock, caisse, clients fidèles, tournois, rapports, utilisateurs avec rôles. Interface en français et en arabe.

Elle fonctionne sur iPhone (et Android) **sans Internet** : les données sont enregistrées dans le téléphone.

Adresse : https://sarlagrolgica-design.github.io/Salle-ps5/

## Installer sur l'iPhone

1. Ouvrir l'adresse ci-dessus dans **Safari** (pas Chrome).
2. Toucher le bouton **Partager** (carré avec une flèche vers le haut).
3. Choisir **Sur l'écran d'accueil**, puis **Ajouter**.
4. Ouvrir l'appli depuis l'icône « Salle PS5 ». Elle s'ouvre en plein écran et marche ensuite sans Internet.

Sur Android : ouvrir l'adresse dans Chrome, menu ⋮, **Installer l'application**.

## Première utilisation

1. Se connecter avec le compte **Admin**, code **1234**.
2. Changer le code tout de suite (bandeau jaune ou Plus › Mon code PIN).
3. Plus › **Réglages** : nom de la salle, postes (ajouter, modifier, supprimer), tarifs, fond de caisse, happy hour, points de fidélité.
4. Plus › **Stock** : produits du bar, prix, entrées de stock.
5. Plus › **Utilisateurs** : créer les comptes Gérant et Caissier, chacun avec son code.
6. Onglet **Caisse** : ouvrir la caisse chaque jour, la clôturer le soir.

Langue : Plus › عربي (ou le bouton en bas de l'écran de connexion).

## Rôles

| Fonction | Admin | Gérant | Caissier |
|---|---|---|---|
| Postes, bar, caisse, clients | Oui | Oui | Oui |
| Remises, annulations, stock | Oui | Oui | Non |
| Tournois, rapports, journal | Oui | Oui | Non |
| Réglages, tarifs, postes, utilisateurs, sauvegarde | Oui | Non | Non |

## Sauvegarde (important)

Les données restent dans le téléphone. Une fois par semaine : Plus › **Sauvegarde** › Créer une sauvegarde, puis garder le fichier dans « Fichiers », sur WhatsApp ou par e-mail.
Pour changer de téléphone : installer l'appli sur le nouveau, puis Sauvegarde › Restaurer avec ce fichier.

Ne pas utiliser « Effacer l'historique et les données de sites » de Safari : cela efface aussi les données de l'appli.

## Réinitialiser tout

Plus › Sauvegarde › **Réinitialiser tout** (Admin seulement), avec le code **LB7Z**. Efface toutes les opérations (sessions, ventes, encaissements, caisse, mouvements de stock, tournois, journal) et remet à zéro les soldes des clients. Les postes, tarifs, produits (avec leur stock actuel), clients et utilisateurs sont conservés. L'appli propose de faire une sauvegarde juste avant.

## Mises à jour

Les mises à jour sont publiées sur l'adresse ci-dessus. L'appli les récupère toute seule à la prochaine ouverture avec Internet, sans perdre les données.

## Fichiers

- `core.js` : toute la logique (calcul des prix, caisse, stock, rapports). Réutilisable plus tard pour la version PC (.exe) et Android (APK).
- `store.js` : enregistrement des données dans le téléphone.
- `ui.js`, `style.css`, `index.html` : l'interface.
- `i18n.js` : traduction arabe.
- `sw.js`, `manifest.webmanifest`, `icons/` : installation et fonctionnement hors ligne.
