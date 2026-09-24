# Mes dépenses

Petite application web pour suivre ses dépenses : connexion par identifiant, total, catégories, filtre. 100 % statique (HTML, CSS, JS), sans serveur ni dépendance.

## Structure

```
index.html
css/style.css
js/app.js
data/utilisateurs.csv   # comptes autorisés
```

## Publier sur GitHub Pages

1. Crée un dépôt sur GitHub et envoie-y ces fichiers (à la racine du dépôt).
2. **Settings → Pages → Build and deployment** : source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Le site est disponible à `https://<ton-compte>.github.io/<nom-du-depot>/`.

## Tester en local

Ouvre un terminal dans le dossier puis lance `python3 -m http.server 8000` et va sur http://localhost:8000. Le double-clic sur `index.html` ne marche pas : le navigateur bloque la lecture du CSV.

## Gérer les utilisateurs

`data/utilisateurs.csv` contient un compte par ligne : `login;empreinte`. L'empreinte est le SHA-256 de `login:motdepasse` (login en minuscules).

```bash
printf 'alice:soleil2026' | sha256sum
```

Ajoute la ligne `alice;<empreinte>`, puis `git commit` et `git push`. Pour supprimer un compte, retire sa ligne.

Comptes de démonstration : `alice` / `soleil2026` et `bob` / `banane42`. **Change-les avant de partager le site.**

## Limites à connaître

- **Ce n'est pas une vraie sécurité.** Le site est statique : le CSV est téléchargeable par n'importe quel visiteur. Les mots de passe y sont hachés (pas en clair), mais un mot de passe faible peut être retrouvé par essais. Choisis des mots de passe longs et n'y mets rien de sensible.
- **Les dépenses restent dans le navigateur** (`localStorage`) : elles ne sont pas synchronisées entre appareils et disparaissent si on vide les données du site.
- Le hachage utilise l'API Web Crypto, disponible en HTTPS (GitHub Pages) et sur `localhost`.
