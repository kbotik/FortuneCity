# FortuneCity

Jeu de plateau web statique, prêt à être publié avec GitHub Pages.

## Tester localement

Depuis la racine du dépôt :

```bash
python3 -m http.server 4173 --directory public
```

Ouvrir ensuite <http://localhost:4173/>.

## Déployer sur GitHub Pages

1. Dans **Settings → Pages**, choisir **GitHub Actions** comme source de publication.
2. Pousser une modification sur `main`, ou lancer manuellement le workflow **Déployer FortuneCity sur GitHub Pages** depuis l’onglet **Actions**.
3. Ouvrir <https://kbotik.github.io/FortuneCity/>.

Le workflow publie directement le contenu de `public/` : aucun build ni dépendance npm n’est nécessaire.

## Mode multijoueur local

Le serveur temps réel est séparé du site statique :

```bash
npm install
PORT=8080 MAX_PLAYERS=4 \
  CORS_ORIGIN="https://kbotik.github.io" npm start
```

Le contrôle de santé est disponible sur <http://localhost:8080/health>.

Les valeurs de configuration sont documentées dans `.env.example`. Le serveur lit les variables fournies par l’environnement ; pour charger un fichier local sans ajouter de secret au dépôt :

```bash
cp .env.example .env
set -a
. ./.env
set +a
npm start
```

Variables disponibles : `PORT`, `MAX_PLAYERS` et `CORS_ORIGIN`.

Pour tester le mode online dans un navigateur local, ouvrir :

```text
http://localhost:4173/?mode=online&ws=ws://localhost:8080
```

Le panneau permet de créer une salle, de rejoindre avec son code, de se déclarer prêt et de lancer la partie. Le mode local reste le mode par défaut.

Pour utiliser GitHub Pages avec plusieurs appareils, le serveur WebSocket doit être déployé séparément avec une URL `wss://` publique, puis fournie dans le paramètre `ws`. Le serveur doit aussi définir `CORS_ORIGIN` avec l’origine GitHub Pages autorisée.

Le serveur Node n’embarque pas TLS lui-même : en production, placer un proxy HTTPS/TLS devant lui et utiliser `wss://` côté navigateur. Le endpoint `/health` permet au fournisseur d’hébergement de vérifier que le processus répond.
