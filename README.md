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
  CORS_ORIGIN="http://localhost:4173" npm start
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

Variables disponibles : `NODE_ENV`, `PORT`, `MAX_PLAYERS`, `CORS_ORIGIN` et `FORTUNECITY_WS_URL`.

En production, utiliser par exemple :

```bash
PORT=8080 MAX_PLAYERS=4 \
  CORS_ORIGIN="https://kbotik.github.io" npm start
```

Pour tester le mode online dans un navigateur local, ouvrir :

```text
http://localhost:4173/?mode=online&ws=ws://localhost:8080
```

Le panneau permet de créer une salle, de rejoindre avec son code, de se déclarer prêt et de lancer la partie. Le mode local reste le mode par défaut.

Pour utiliser GitHub Pages avec plusieurs appareils, le serveur WebSocket doit être déployé séparément avec une URL `wss://` publique, puis fournie dans le paramètre `ws`. Le serveur doit aussi définir `CORS_ORIGIN` avec l’origine GitHub Pages autorisée.

Le serveur Node n’embarque pas TLS lui-même : en production, placer un proxy HTTPS/TLS devant lui et utiliser `wss://` côté navigateur. Le endpoint `/health` permet au fournisseur d’hébergement de vérifier que le processus répond.

Le client lit aussi la configuration `FORTUNECITY_WS_URL` depuis la balise meta de `public/index.html` ou depuis `window.FORTUNECITY_WS_URL`. Elle est volontairement vide dans le dépôt tant qu’aucune URL publique réelle n’existe. Le paramètre d’URL `?ws=` reste disponible pour les tests et ne doit pas utiliser `ws://` depuis une page HTTPS.

## Déployer le serveur sur un VPS

Le serveur Node est indépendant du déploiement GitHub Pages. Les commandes suivantes sont à exécuter sur le VPS, après avoir configuré le dépôt et le domaine :

```bash
sudo apt update
sudo apt install -y nodejs npm
git clone <URL_DU_DEPOT> FortuneCity
cd FortuneCity
npm ci --omit=dev
NODE_ENV=production \
PORT=8080 \
MAX_PLAYERS=4 \
CORS_ORIGIN="https://kbotik.github.io" \
npm start
```

Vérifier le processus avec :

```bash
curl http://127.0.0.1:8080/health
```

Le serveur écoute sur `0.0.0.0` et peut donc être placé derrière un reverse proxy HTTPS. Exemple Nginx avec un domaine à remplacer :

```nginx
server {
    listen 80;
    server_name SERVER_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Après configuration DNS, installer le certificat sans modifier le dépôt :

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SERVER_DOMAIN
```

Le client GitHub Pages devra alors recevoir l’URL réelle `wss://SERVER_DOMAIN`, via `FORTUNECITY_WS_URL` dans la configuration statique ou via `?ws=`. Aucun domaine fictif n’est configuré ici. `FORTUNECITY_WS_URL` est une configuration client et ne contient aucun secret.
