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

## Devis envoyé par e-mail (envoi direct)
À l'envoi d'une demande de devis (`devis.html`, formulaire de `index.html` et de
`contact.html`), le récapitulatif (type de bois, quantité, prix estimé, code postal,
coordonnées, précisions) est envoyé **directement à EnergyWood@gmail.com depuis la
page**, sans logiciel de messagerie côté visiteur. Le client voit « Envoi en cours… »
puis un message de confirmation, et la demande reste aussi consultable dans son
espace (`compte.html`).

L'envoi passe par le relais gratuit FormSubmit, appelé en AJAX depuis `app.js` :
`FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + MAIL_TO`. Points à connaître :

- à la **première** demande envoyée, FormSubmit adresse un e-mail d'activation à
  `EnergyWood@gmail.com` : il faut cliquer une seule fois sur « Activate Form »,
  sinon les demandes suivantes ne sont pas transmises ;
- l'adresse de destination et donc le relais sont définis une seule fois dans
  `app.js` (`MAIL_TO`) : changez-la à cet endroit pour recevoir les demandes sur une
  autre boîte (pensez alors à réactiver le formulaire depuis la nouvelle adresse) ;
- si le relais est indisponible (réseau, quota), la page affiche un message neutre
  (« Votre demande n'a pas pu être envoyée… ») avec le numéro de téléphone : aucun
  envoi automatique, aucune fenêtre ni application externe ne s'ouvre, et les champs
  saisis restent en place pour permettre un nouvel essai.
Le lien WhatsApp `https://wa.me/33744278770` reste disponible dans le pied de page
et sur `contact.html` pour les visiteurs qui préfèrent la messagerie instantanée.

## Démonstration
Prix, fournisseurs et coordonnées sont fictifs et fournis à titre d'exemple.
Crédits images : voir `mentions.html#credits` et `images/credits.json`.
