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
