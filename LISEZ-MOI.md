# WoodEnergy — site statique

Site vitrine + annuaire pour un service de bois de chauffage (bûches, granulés,
bois densifié). 100 % statique : aucun serveur ni base de données requis.

## Ouvrir le site
Double-cliquez sur `index.html`, ou servez le dossier :
    python3 -m http.server 8000
puis http://localhost:8000

## Structure
- `*.html` ................. pages (accueil, annuaire, outils, blog, légal, villes, fiches)
- `styles.css` ............. styles de base
- `app.css` ................ composants (outils, carte, blog, compte, cookies)
- `script.js` .............. interactions minimales (menu, année)
- `app.js` ................. moteur (menu burger responsive, calculateur, devis, comparateur, carte, compte, panier)
- `panier.html` ............ panier, prix dégressifs et commande (page fonctionnelle)
- `data/fournisseurs.js` ... données fournisseurs / villes / FAQ / tarifs + paliers `WE_TIERS`
- `images/` ................ images (JPG/PNG + variantes WebP)
- `sitemap.xml`, `robots.txt`

## Personnaliser
1. Domaine : remplacez `BASE` dans votre recherche de « www.woodenergy.fr »
   dans les balises canonical/OG/sitemap.
2. Fournisseurs : éditez `data/fournisseurs.js` (les pages se régénèrent via `build.py`).
3. Formulaires : ajoutez `data-endpoint="https://..."` sur un `<form class="js-form">`
   pour envoyer les données vers un service (Formspree, EmailJS, backend…).
   Sans endpoint, les données sont stockées dans le navigateur (démonstration).

## Menu responsive (téléphone et tablette)
Sous 900 px de large, la barre de navigation se replie derrière un bouton burger
(animation en croix, `aria-expanded`). Le panneau déroulant liste tous les liens, le
sous-menu « Outils » devient un accordéon, et un bouton « Devis gratuit » est ajouté.
Fermeture au clic extérieur, avec la touche Échap, ou au changement de largeur. Sans
JavaScript, les pages restent entièrement lisibles (la navigation est un simple lien).

## Panier et prix dégressifs
Le prix unitaire baisse automatiquement selon la quantité commandée, par paliers
définis dans `TIERS` (build.py) et publiés dans `window.WE_TIERS` :
1 → 0 %, 3 → −5 %, 5 → −10 %, 10 → −15 %, 20 → −20 %.
Le panier est stocké dans le localStorage du navigateur (`we_cart`), la livraison est
offerte à partir de 600 € (sinon 59 € forfaitaires). Depuis `panier.html` vous pouvez
enregistrer une commande de démonstration (`we_orders`) ou convertir le panier en
demande de devis (`we_quotes`). Pour changer les paliers, modifiez `TIERS` dans
`build.py` puis relancez le générateur.

## Devis : le client envoie lui-même son récapitulatif
Aucun message n'est transmis depuis le site. À l'envoi d'une demande de devis
(`devis.html`, formulaire de `index.html` et de `contact.html`), la page ouvre le
**logiciel de messagerie du visiteur** (`mailto:`) avec un brouillon déjà rédigé :
destinataire `maxbarrett892@gmail.com`, objet « Demande de devis - WoodEnergy » et
récapitulatif complet (type de bois, quantité, prix estimé, code postal, coordonnées,
précisions). Le visiteur n'a plus qu'à cliquer sur « Envoyer » depuis sa boîte mail.

Points à connaître :

- l'adresse de destination est définie une seule fois dans `app.js` (`MAIL_TO`) :
  changez-la à cet endroit pour recevoir les demandes ailleurs ;
- le récapitulatif est construit par `shortQuoteLines()` (formulaires courts) et par
  l'assistant de `devis.html`, puis passé à `mailQuoteLink()` / `openMailDraft()` ;
- si aucun client de messagerie n'est configuré sur l'appareil, la page affiche
  l'adresse e-mail cliquable et le téléphone `+33 7 44 27 87 70` en secours ;
- la demande est aussi enregistrée dans le navigateur du visiteur (`we_quotes`) et
  reste consultable dans son espace (`compte.html`) ;
- aucun service tiers, aucune activation ni clé d'API n'est nécessaire.
Le lien WhatsApp `https://wa.me/33744278770` reste disponible dans le pied de page
et sur `contact.html` pour les visiteurs qui préfèrent la messagerie instantanée.

## Démonstration
Prix, fournisseurs et coordonnées sont fictifs et fournis à titre d'exemple.
Crédits images : voir `mentions.html#credits` et `images/credits.json`.
