/* =====================================================================
   WoodEnergy — script.js
   Filet de sécurité minimal.

   Le moteur complet (menu, année, formulaires, calculs, carte…) est
   fourni par app.js. Ce fichier n'agit QUE si app.js n'a pas pu se
   charger, afin d'éviter tout double traitement (ex. menu mobile qui
   s'ouvre puis se referme instantanément).
   ===================================================================== */
(function () {
  'use strict';

  function fallback() {
    // app.js déjà actif : on ne fait rien.
    if (window.WE_ENGINE) return;

    // Menu mobile
    var burger = document.getElementById('burger');
    var nav = document.getElementById('navLinks');
    if (burger && nav) {
      burger.addEventListener('click', function () {
        nav.classList.toggle('open');
      });
      Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
        a.addEventListener('click', function () { nav.classList.remove('open'); });
      });
    }

    // Année dans le pied de page
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(fallback, 0); });
  } else {
    setTimeout(fallback, 0);
  }
})();
