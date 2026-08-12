# Déployer le serveur FortuneCity sur un VPS Linux

Ce document prépare le serveur WebSocket existant pour un VPS. Il ne déploie rien automatiquement et n’inclut aucun secret ni domaine réel.

## 1. Installer les prérequis

Sur un VPS Ubuntu/Debian :

```bash
sudo apt update
sudo apt install -y git nodejs npm
node --version
npm --version
```

Node.js 20 ou une version LTS plus récente est recommandé.

## 2. Récupérer le projet

Remplacer `<URL_DU_DEPOT>` par l’URL réelle du dépôt :

```bash
sudo mkdir -p /opt
sudo chown "$USER":"$USER" /opt
git clone <URL_DU_DEPOT> /opt/FortuneCity
cd /opt/FortuneCity
npm ci --omit=dev
```

Le serveur existant est démarré par `server/server.js` via le script `npm start`. Aucun deuxième serveur ne doit être lancé.

## 3. Configurer l’environnement

```bash
cp .env.example .env
nano .env
```

Configuration de production attendue :

```env
NODE_ENV=production
PORT=8080
MAX_PLAYERS=4
CORS_ORIGIN=https://kbotik.github.io
FORTUNECITY_WS_URL=
```

`FORTUNECITY_WS_URL` est une configuration du client statique. Elle reste vide dans l’environnement du serveur tant que le domaine public n’est pas connu. Ne jamais y mettre un secret.

Le serveur écoute sur `0.0.0.0:$PORT`, ce qui permet au reverse proxy local de lui transmettre les requêtes.

## 4. Tester avant de démarrer en production

```bash
npm test
NODE_ENV=production npm start
```

Dans un autre terminal :

```bash
curl http://127.0.0.1:8080/health
```

La réponse doit contenir `"status":"ok"`. Arrêter ensuite le processus avec `Ctrl+C`.

## 5. Démarrage automatique avec systemd

Créer le service :

```bash
sudo nano /etc/systemd/system/fortunecity.service
```

Contenu :

```ini
[Unit]
Description=FortuneCity WebSocket server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/FortuneCity
EnvironmentFile=/opt/FortuneCity/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=fortunecity
Group=fortunecity

[Install]
WantedBy=multi-user.target
```

Créer l’utilisateur et activer le service :

```bash
sudo useradd --system --home /opt/FortuneCity --shell /usr/sbin/nologin fortunecity
sudo chown -R fortunecity:fortunecity /opt/FortuneCity
sudo systemctl daemon-reload
sudo systemctl enable fortunecity
sudo systemctl start fortunecity
sudo systemctl status fortunecity
```

Logs :

```bash
sudo journalctl -u fortunecity -f
```

Arrêt/redémarrage propre :

```bash
sudo systemctl stop fortunecity
sudo systemctl restart fortunecity
```

Le serveur gère `SIGINT` et `SIGTERM`, ferme ses temporisations et ses connexions WebSocket avant de terminer.

## 6. Installer Nginx et le reverse proxy

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/fortunecity
```

Remplacer `SERVER_DOMAIN` uniquement après avoir configuré le vrai domaine :

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }
}
```

Activer le site :

```bash
sudo ln -s /etc/nginx/sites-available/fortunecity /etc/nginx/sites-enabled/fortunecity
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Activer HTTPS et WSS

Après avoir fait pointer le DNS de `SERVER_DOMAIN` vers le VPS :

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SERVER_DOMAIN
sudo nginx -t
sudo systemctl reload nginx
```

Le reverse proxy fournit alors :

```text
https://SERVER_DOMAIN
wss://SERVER_DOMAIN
```

Le serveur Node reste en HTTP local sur `127.0.0.1:8080`; TLS est terminé par Nginx. Aucun certificat ni clé privée ne doit être ajouté au dépôt.

## 8. Configurer le client GitHub Pages

Après l’obtention du vrai domaine, renseigner l’URL `wss://` réelle dans la configuration statique `FORTUNECITY_WS_URL` de `public/index.html`, ou utiliser le paramètre `?ws=` pour un test ponctuel.

Ne pas inventer cette URL avant la configuration DNS/TLS. Le mode local reste disponible lorsque la configuration est vide ou que le serveur est indisponible.

## 9. Vérifier depuis deux téléphones

1. Publier le client sur GitHub Pages.
2. Configurer le vrai `wss://SERVER_DOMAIN`.
3. Ouvrir le site sur deux téléphones.
4. Créer une salle sur le premier téléphone.
5. Partager le code réel.
6. Rejoindre la salle sur le second.
7. Mettre les joueurs prêts et lancer la partie avec l’hôte.
8. Vérifier dés, tours, déplacements, achats, loyers et reconnexion.
9. Vérifier le serveur avec :

```bash
curl https://SERVER_DOMAIN/health
sudo journalctl -u fortunecity -f
```

L’état d’une partie online vient du serveur WebSocket. Le navigateur ne doit pas utiliser `localStorage` pour synchroniser l’argent, les positions, les propriétés, les dés ou les tours.
