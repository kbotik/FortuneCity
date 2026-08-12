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
PORT=8080 CORS_ORIGIN="*" npm start
```

Le contrôle de santé est disponible sur <http://localhost:8080/health>.

Pour tester le mode online dans un navigateur local, ouvrir :

```text
http://localhost:4173/?mode=online&ws=ws://localhost:8080
```

Le panneau permet de créer une salle, de rejoindre avec son code, de se déclarer prêt et de lancer la partie. Le mode local reste le mode par défaut.

Pour utiliser GitHub Pages avec plusieurs appareils, le serveur WebSocket doit être déployé séparément avec une URL `wss://` publique, puis fournie dans le paramètre `ws`. Le serveur doit aussi définir `CORS_ORIGIN` avec l’origine GitHub Pages autorisée.
