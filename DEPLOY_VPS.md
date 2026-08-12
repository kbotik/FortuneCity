# Déployer le serveur FortuneCity sur un VPS Linux

Ce document prépare le serveur WebSocket existant pour un VPS. Il ne se
connecte à aucun VPS, ne modifie aucun DNS ou certificat et n’inclut aucun
secret ni sous-domaine fictif.

Architecture cible :

```text
Internet
  ↓
https://fortunecityplay.fr
  ↓
Client FortuneCity publié sur GitHub Pages/LWS
  ↓
wss://SOUS_DOMAINE_WS_A_DEFINIR
  ↓
Nginx sur le VPS
  ↓
serveur Node.js FortuneCity
```

Le sous-domaine WebSocket sera choisi ultérieurement. Le placeholder
`SOUS_DOMAINE_WS_A_DEFINIR` ne doit pas être utilisé comme domaine réel.

## A. Installation système

Sur un VPS Ubuntu/Debian :

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl
```

## B. Installation de Node.js et npm

Installer une version LTS récente de Node.js, puis vérifier :

```bash
sudo apt install -y nodejs npm
node --version
npm --version
```

Node.js 20 ou une version LTS plus récente est recommandé. Si la distribution
fournit une version trop ancienne, utiliser le dépôt officiel Node.js LTS
adapté à la distribution du VPS.

## C. Récupération du dépôt FortuneCity

Remplacer `<URL_DU_DEPOT>` par l’URL réelle du dépôt :

```bash
sudo mkdir -p /opt
sudo chown "$USER":"$USER" /opt
git clone <URL_DU_DEPOT> /opt/FortuneCity
cd /opt/FortuneCity
```

Le serveur existant est démarré par `server/server.js` via `npm start`.
Ne créer et ne lancer aucun deuxième serveur.

## D. Installation des dépendances

```bash
npm ci --omit=dev
```

`package-lock.json` est utilisé pour reproduire exactement la dépendance
WebSocket existante.

## E. Configuration du fichier `.env`

```bash
cp .env.example .env
nano .env
```

Configuration de production :

```env
NODE_ENV=production
PORT=8080
MAX_PLAYERS=4
CORS_ORIGIN=https://fortunecityplay.fr
FORTUNECITY_WS_URL=
```

Variables réellement utilisées par le projet :

- `NODE_ENV` : active les règles de configuration production ;
- `PORT` : port HTTP/WebSocket interne, `8080` par défaut ;
- `MAX_PLAYERS` : maximum de joueurs, limité à 4 par le serveur ;
- `CORS_ORIGIN` : origines autorisées, notamment `https://fortunecityplay.fr` ;
- `FORTUNECITY_WS_URL` : configuration du client statique, laissée vide tant
  que le sous-domaine réel n’est pas choisi.

Le fichier `.env` est ignoré par Git. Ne jamais y mettre de mot de passe, clé,
token ou certificat.

Le serveur écoute sur `0.0.0.0:$PORT`. Nginx lui transmettra les requêtes via
`127.0.0.1:8080`, et le firewall ne doit pas exposer directement le port
`8080`.

## F. Tests et démarrage manuel

```bash
npm test
NODE_ENV=production PORT=8080 \
  MAX_PLAYERS=4 \
  CORS_ORIGIN="https://fortunecityplay.fr" \
  npm start
```

Dans un autre terminal :

```bash
curl http://127.0.0.1:8080/health
```

La réponse doit contenir `"status":"ok"`. Arrêter ensuite le processus avec
`Ctrl+C`.

## G. Démarrage automatique avec systemd

Créer un utilisateur système :

```bash
sudo useradd --system --home /opt/FortuneCity \
  --shell /usr/sbin/nologin fortunecity
sudo chown -R fortunecity:fortunecity /opt/FortuneCity
```

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

Activer et démarrer :

```bash
sudo systemctl daemon-reload
sudo systemctl enable fortunecity
sudo systemctl start fortunecity
sudo systemctl status fortunecity
```

Logs :

```bash
sudo journalctl -u fortunecity -f
```

Arrêt/redémarrage :

```bash
sudo systemctl stop fortunecity
sudo systemctl restart fortunecity
```

Le serveur gère `SIGINT` et `SIGTERM`, ferme ses temporisations et ses
connexions WebSocket avant de terminer.

## H. Nginx et reverse proxy

Installer Nginx :

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/fortunecity
```

Remplacer `SOUS_DOMAINE_WS_A_DEFINIR` uniquement après avoir choisi le vrai
sous-domaine :

```nginx
server {
    listen 80;
    server_name SOUS_DOMAINE_WS_A_DEFINIR;

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

Activer et vérifier :

```bash
sudo ln -s /etc/nginx/sites-available/fortunecity \
  /etc/nginx/sites-enabled/fortunecity
sudo nginx -t
sudo systemctl reload nginx
```

## I. HTTPS et WSS

Après configuration DNS du vrai sous-domaine :

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SOUS_DOMAINE_WS_A_DEFINIR
sudo nginx -t
sudo systemctl reload nginx
```

Le résultat attendu sera :

```text
https://SOUS_DOMAINE_WS_A_DEFINIR
wss://SOUS_DOMAINE_WS_A_DEFINIR
```

Le serveur Node reste en HTTP local sur `127.0.0.1:8080`; TLS est terminé par
Nginx. Aucun certificat ni clé privée ne doit être ajouté au dépôt.

## J. Configuration du client GitHub Pages

Le site officiel reste :

```text
https://fortunecityplay.fr
```

Après le choix et la configuration du vrai sous-domaine, renseigner l’URL
`wss://` réelle via `FORTUNECITY_WS_URL` dans la configuration statique du
client. Tant qu’elle est vide, le mode local reste disponible.

Ne jamais activer `ws://` depuis une page HTTPS. Le paramètre `?ws=` est
réservé aux tests et ne remplace pas une configuration de production.

## K. Firewall et sécurité

N’exposer que SSH, HTTP et HTTPS :

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Ne pas ouvrir le port `8080`. Utiliser une clé SSH et désactiver
l’authentification SSH par mot de passe selon la politique du VPS.

Le serveur reste l’autorité pour les dés, l’argent, les positions, les
propriétés, les loyers, les tours, la faillite et la victoire. Il valide les
JSON, les types de messages, les salles, les joueurs, les montants et limite
les messages ainsi que `MAX_PLAYERS`.

## L. Checklist de vérification

Sur le VPS :

```bash
npm ci --omit=dev
npm test
sudo systemctl restart fortunecity
curl http://127.0.0.1:8080/health
```

Tester ensuite :

- connexion WebSocket ;
- création et rejoint d’une salle ;
- deux joueurs ;
- maximum quatre joueurs et refus du cinquième ;
- changement de tour ;
- dés générés côté serveur ;
- déplacement et synchronisation ;
- achats, loyers et transferts ;
- Chance, Bonus, Taxes, Impôt, Gare, Prison et Départ ;
- faillite et victoire ;
- reconnexion ;
- transfert d’hôte ;
- déconnexion d’un joueur ;
- absence de messages `ROOM_STATE` en double ;
- nouvelle partie ;
- mode local sans serveur.

## M. Vérification depuis deux téléphones

1. Publier le client sur `https://fortunecityplay.fr`.
2. Configurer le vrai `wss://SOUS_DOMAINE_WS_A_DEFINIR` après choix du
   sous-domaine.
3. Ouvrir le site sur deux téléphones.
4. Créer une salle sur le premier téléphone.
5. Partager le code réel.
6. Rejoindre la salle sur le second.
7. Mettre les joueurs prêts et lancer avec l’hôte.
8. Vérifier dés, tours, déplacements, achats, loyers et reconnexion.
9. Vérifier :

```bash
curl https://SOUS_DOMAINE_WS_A_DEFINIR/health
sudo journalctl -u fortunecity -f
```

L’état online vient du serveur WebSocket. Le navigateur n’utilise pas
`localStorage` pour synchroniser l’argent, les positions, les propriétés, les
dés ou les tours.
