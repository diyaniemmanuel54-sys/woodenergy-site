/* =====================================================================
   WoodEnergy — app.js
   Moteur front : navigation, recherche, fournisseurs, calculateur,
   devis multi-étapes, comparateur, carte, espace client, cookies.
   100 % autonome (aucune dépendance externe).
   ===================================================================== */
(function () {
  'use strict';
  window.WE_ENGINE = true;   // signale à script.js que le moteur est actif

  /* ================= Utilitaires ================= */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const euro = (n) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const SUPPLIERS = window.WE_SUPPLIERS || [];
  const bySlug = (s) => SUPPLIERS.filter((x) => x.slug === s)[0];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Article defini accorde a l'unite de vente : "le stere", "la tonne", "le m3".
  const unitArticle = (u) => (u === 'tonne' ? 'la ' : 'le ') + u;

  /* ========== E-mail : le client envoie lui-meme son recapitulatif ========== */
  const MAIL_TO = 'maxbarrett892@gmail.com';
  const MAIL_SUBJECT = 'Demande de devis - WoodEnergy';
  // Aucun envoi automatique : le site ne transmet rien. Il ouvre uniquement le
  // logiciel de messagerie du visiteur avec le recapitulatif deja redige ; c'est
  // le client qui clique sur « Envoyer » depuis sa propre boite mail.
  const MAIL_PHONE = '+33 7 44 27 87 70';
  const MAIL_PHONE_HREF = 'tel:+33744278770';

  // Lien mailto complet : destinataire, objet et corps du message.
  function mailQuoteLink(lines) {
    return 'mailto:' + MAIL_TO +
      '?subject=' + encodeURIComponent(MAIL_SUBJECT) +
      '&body=' + encodeURIComponent(lines.join('\r\n'));
  }

  // Ouvre la messagerie du visiteur sur le message pre-rempli.
  // Retourne true si le lien a pu etre declenche.
  function mailGoto(lines) {
    const url = mailQuoteLink(lines);
    let a = null;
    try {
      a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      return true;
    } catch (e) {
      try { window.location.href = url; return true; } catch (e2) { return false; }
    } finally {
      if (a && a.parentNode) a.parentNode.removeChild(a);
    }
  }

  // Ouvre le brouillon dans la messagerie du client puis lui indique la derniere
  // etape : cliquer sur « Envoyer ». Rien n'est envoye depuis la page.
  // Ouvre le brouillon dans la messagerie du client puis lui indique la dernière
  // étape : cliquer sur « Envoyer ». Rien n'est envoyé depuis la page.
  function openMailDraft(note, lines, okText, btn) {
    if (btn) btn.disabled = false;
    const opened = mailGoto(lines);
    const msg = okText || ('Votre logiciel de messagerie s\'ouvre avec le récapitulatif adressé à ' +
      MAIL_TO + ' : il vous reste à cliquer sur « Envoyer » depuis votre messagerie.');
    if (!note) { if (!opened) window.alert(msg); return; }
    note.className = opened ? 'form-note ok' : 'form-note err';
    note.innerHTML = esc(msg) + (opened ? '' :
      ' Aucune messagerie détectée sur cet appareil : écrivez à <a href="mailto:' + MAIL_TO + '">' +
      MAIL_TO + '</a> ou appelez le <a href="' + MAIL_PHONE_HREF + '">' + MAIL_PHONE + '</a>.');
  }

  /* ========== Prix dégressifs selon la quantité ========== */
  const TIERS = (window.WE_TIERS && window.WE_TIERS.length ? window.WE_TIERS : [[1, 0], [3, 5], [5, 10], [10, 15], [20, 20]])
    .slice().sort((a, b) => a[0] - b[0]);
  const FREE_SHIP = 600;   // livraison offerte à partir de ce montant
  const SHIP_FEE = 59;     // participation forfaitaire en dessous
  const MINUS = '\u2212';  // signe moins typographique

  function tierFor(qty) {
    const q = Number(qty) || 0;
    let pct = 0;
    TIERS.forEach((t) => { if (q >= t[0]) pct = t[1]; });
    return pct;
  }
  function nextTier(qty) {
    const q = Number(qty) || 0;
    for (let i = 0; i < TIERS.length; i++) { if (q < TIERS[i][0]) return TIERS[i]; }
    return null;
  }
  function unitAfter(price, qty) { return Number(price) * (1 - tierFor(qty) / 100); }
  function lineTotal(price, qty) { return unitAfter(price, qty) * (Number(qty) || 0); }
  function discLabel(pct) { return pct ? MINUS + pct + ' %' : ''; }
  function tierPill(pct) { return pct ? '<span class="tier-badge">' + discLabel(pct) + '</span>' : ''; }

  /* ================= Navigation ================= */
  function initNav() {
    const burger = $('#burger'), navLinks = $('#navLinks');
    if (burger && navLinks) {
      burger.setAttribute('aria-controls', 'navLinks');
      burger.setAttribute('aria-expanded', 'false');
      const setOpen = (open) => {
        navLinks.classList.toggle('open', open);
        burger.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        document.body.classList.toggle('nav-open', open);
        if (!open) $$('.nav-drop.open', navLinks).forEach((d) => d.classList.remove('open'));
      };
      burger.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!navLinks.classList.contains('open'));
      });
      $$('a', navLinks).forEach((a) => a.addEventListener('click', () => {
        // Un lien parent de sous-menu sert de bascule : on ne referme pas le panneau.
        if (a.parentElement && a.parentElement.classList.contains('nav-drop')) return;
        setOpen(false);
      }));
      document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') &&
            !navLinks.contains(e.target) && !burger.contains(e.target)) setOpen(false);
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
      window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && navLinks.classList.contains('open')) setOpen(false);
      });
    }
    $$('.nav-drop > a').forEach((a) => {
      a.addEventListener('click', (e) => {
        if (window.matchMedia('(max-width:900px)').matches) {
          e.preventDefault();
          a.parentElement.classList.toggle('open');
        }
      });
    });
    const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  }

  /* ================= Bannière cookies ================= */
  function initCookies() {
    const b = $('#cookieBanner');
    if (!b || store.get('we_cookie_choice')) return;
    b.classList.add('show');
    $('#cookieOk') && $('#cookieOk').addEventListener('click', () => {
      store.set('we_cookie_choice', 'accepted'); b.classList.remove('show');
    });
    $('#cookieNo') && $('#cookieNo').addEventListener('click', () => {
      store.set('we_cookie_choice', 'essential'); b.classList.remove('show');
    });
  }

  /* ================= Formulaires ================= */
  function fieldError(el, msg) {
    el.classList.add('invalid');
    let n = el.parentElement.querySelector('.field-err');
    if (!n) { n = document.createElement('p'); n.className = 'field-err'; el.parentElement.appendChild(n); }
    n.textContent = msg; n.style.color = '#b3261e'; n.style.fontSize = '.8rem'; n.style.marginTop = '.3rem';
  }
  function clearError(el) {
    el.classList.remove('invalid');
    const n = el.parentElement.querySelector('.field-err');
    if (n) n.remove();
  }
  function validate(form) {
    let ok = true, first = null;
    $$('input,select,textarea', form).forEach((el) => {
      if (el.type === 'checkbox' && el.required) {
        if (!el.checked) { ok = false; first = first || el; }
        return;
      }
      clearError(el);
      const v = (el.value || '').trim();
      if (el.required && !v) { fieldError(el, 'Champ obligatoire.'); ok = false; first = first || el; return; }
      if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { fieldError(el, 'Adresse e-mail invalide.'); ok = false; first = first || el; return; }
      if (el.name === 'cp' && v && !/^\d{5}$/.test(v)) { fieldError(el, 'Code postal à 5 chiffres.'); ok = false; first = first || el; return; }
      if (el.name === 'tel' && v && !/^[+0-9 ().-]{6,}$/.test(v)) { fieldError(el, 'Numéro invalide.'); ok = false; first = first || el; return; }
    });
    if (first) first.focus();
    return ok;
  }
  // Récapitulatif texte du formulaire court (index.html, contact.html).
  function shortQuoteLines(d) {
    const wl = ['Bonjour WoodEnergy,', 'voici ma demande de devis :', ''];
    if (d.nom) wl.push('\u2022 Nom : ' + d.nom);
    if (d.email) wl.push('\u2022 E-mail : ' + d.email);
    if (d.tel) wl.push('\u2022 T\u00e9l\u00e9phone : ' + d.tel);
    if (d.cp) wl.push('\u2022 Code postal : ' + d.cp);
    if (d.besoin) wl.push('\u2022 Besoin : ' + d.besoin);
    if (d.message) wl.push('\u2022 Pr\u00e9cisions : ' + d.message);
    wl.push('', 'Merci de me recontacter pour finaliser mon devis.', 'Demande pr\u00e9par\u00e9e depuis woodenergyfr.com');
    return wl;
  }
  function shortQuoteFields(d) {
    return {
      Nom: d.nom || '',
      Email: d.email || '',
      Telephone: d.tel || '',
      'Code postal': d.cp || '',
      Besoin: d.besoin || '',
      Precisions: d.message || ''
    };
  }

  function initForms() {
    $$('form.js-form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const note = $('.form-note', form) || (() => {
          const p = document.createElement('p'); p.className = 'form-note'; form.appendChild(p); return p;
        })();
        const submitBtn = $('button[type="submit"]', form);
        if (submitBtn && submitBtn.disabled) return;   // envoi déjà en cours
        if (!validate(form)) { note.textContent = 'Merci de corriger les champs en rouge.'; note.className = 'form-note err'; return; }
        const data = Object.fromEntries(new FormData(form).entries());
        const endpoint = form.getAttribute('data-endpoint');
        const type = form.getAttribute('data-save');
        note.textContent = type === 'quote' ? 'Ouverture de votre messagerie\u2026' : 'Envoi en cours\u2026';
        if (submitBtn) submitBtn.disabled = true;

        const saveLocally = () => {
          if (type === 'quote') {
            const q = store.get('we_quotes', []); q.unshift({ date: new Date().toISOString(), data });
            store.set('we_quotes', q);
          }
          if (type === 'avis') {
            const a = store.get('we_avis', []); a.unshift({ date: new Date().toISOString(), data });
            store.set('we_avis', a);
          }
          if (type === 'newsletter') {
            const n = store.get('we_newsletter', []); n.unshift({ date: new Date().toISOString(), email: data.email || '' });
            store.set('we_newsletter', n);
          }
          if (type === 'pro') {
            const pr = store.get('we_pro', []); pr.unshift({ date: new Date().toISOString(), data });
            store.set('we_pro', pr);
          }
        };

        const done = (ok) => {
          if (submitBtn) submitBtn.disabled = false;
          if (!ok) {
            note.textContent = 'Votre message n\'a pas pu \u00eatre envoy\u00e9. Merci de r\u00e9essayer dans un instant, ou de nous appeler au +33 7 44 27 87 70.';
            note.className = 'form-note err';
            return;
          }
          saveLocally();
          note.textContent = form.getAttribute('data-success') || 'Merci ! Votre message a bien \u00e9t\u00e9 envoy\u00e9.';
          note.className = 'form-note ok';
          form.reset();
        };

        if (type === 'quote') {
          // Aucun envoi depuis le site : on ouvre la messagerie du visiteur avec
          // le récapitulatif déjà rédigé, il ne reste qu'à cliquer sur « Envoyer ».
          saveLocally();
          openMailDraft(note, shortQuoteLines(data),
            'Merci' + (data.nom ? ' ' + data.nom : '') +
            ' ! Votre récapitulatif s\'ouvre dans votre logiciel de messagerie, adressé à ' + MAIL_TO +
            '. Il vous reste à cliquer sur « Envoyer » depuis votre messagerie : ' +
            'rien n\'est envoyé depuis cette page.', submitBtn);
          form.reset();
          return;
        }

        if (endpoint && endpoint.indexOf('VOTRE_') === -1) {
          fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
            .then((r) => done(r.ok)).catch(() => done(false));
        } else {
          console.log('[WoodEnergy] formulaire', form.id || form.className, data);
          setTimeout(() => done(true), 250);
        }
      });
    });
  }

  /* ================= Rendu des fournisseurs ================= */
  function stars(r) {
    const full = Math.round(r);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full) + ' ' + String(r).replace('.', ',') + '/5';
  }
  function supplierCard(s, opts) {
    opts = opts || {};
    const favs = store.get('we_favs', []);
    const fav = favs.indexOf(s.id) > -1;
    const price = s.priceFrom ? `<strong>${euro(s.priceFrom)}</strong> ${esc(s.priceUnit)}` : esc(s.priceUnit);
    const shop = (s.products || []).filter((p) => Number(p.price) > 0).sort((a, b) => a.price - b.price)[0];
    const addBtn = shop ? `<button type="button" class="btn btn-ghost js-add" data-pid="${esc(shop.id || (s.id + '-0'))}"
          data-slug="${esc(s.slug)}" data-supplier="${esc(s.name.replace(/&amp;/g, '&'))}" data-name="${esc(shop.name)}"
          data-price="${shop.price}" data-unit="${esc(shop.unit)}">🛒 Ajouter au panier</button>` : '';
    return `
    <article class="supplier" data-id="${s.id}" data-types="${esc((s.types || []).join(','))}">
      <img src="${s.img}" alt="${esc(s.name)} — bois de chauffage" loading="lazy" />
      <div>
        <h3><a href="fournisseur-${s.slug}.html">${s.name}</a></h3>
        <p class="loc">📍 ${esc(s.zone)} — ${esc(s.cp)}</p>
        <div class="score-row"><span class="stars">${stars(s.rating)}</span>
          <span class="muted" style="font-size:.78rem">(${s.reviews} avis)</span></div>
        <div class="tags">${(s.tags || []).map((t) => `<span class="tag-pill">${esc(t)}</span>`).join('')}</div>
        <p class="meta">${esc(s.summary)} À partir de ${price}.</p>
      </div>
      <div class="actions">
        <a href="devis.html?f=${s.slug}" class="btn btn-primary">Demander un devis</a>
        <a href="fournisseur-${s.slug}.html" class="btn btn-ghost">Voir la fiche</a>
        ${addBtn}
        <button type="button" class="btn btn-ghost js-fav" data-id="${s.id}" aria-pressed="${fav}"
          title="Ajouter à mes favoris">${fav ? '★ Favori' : '☆ Ajouter aux favoris'}</button>
      </div>
    </article>`;
  }
  function initFavButtons(scope) {
    $$('.js-fav', scope || document).forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const favs = store.get('we_favs', []);
        const i = favs.indexOf(id);
        if (i > -1) { favs.splice(i, 1); b.textContent = '☆ Ajouter aux favoris'; b.setAttribute('aria-pressed', 'false'); }
        else { favs.push(id); b.textContent = '★ Favori'; b.setAttribute('aria-pressed', 'true'); }
        store.set('we_favs', favs);
      });
    });
  }
  function renderSupplierList(container, list) {
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<p class="empty">Aucun fournisseur ne correspond à ces critères pour le moment. Élargissez votre recherche ou <a href="contact.html" style="color:var(--amber-dark);text-decoration:underline">contactez-nous</a>.</p>';
      return;
    }
    container.innerHTML = list.map((s) => supplierCard(s)).join('');
    initFavButtons(container);
  }

  /* ================= Annuaire fournisseurs ================= */
  function initDirectory() {
    const listEl = $('#supplierList');
    if (!listEl) return;
    const params = new URLSearchParams(location.search);
    const tSel = $('#fType'), cpIn = $('#fCp'), condSel = $('#fCond'), sortSel = $('#fSort');
    if (tSel && params.get('type')) {
      const want = params.get('type').toLowerCase();
      $$('option', tSel).forEach((o) => { if (o.value && o.value.toLowerCase().indexOf(want.slice(0, 5)) > -1) tSel.value = o.value; });
    }
    if (cpIn && params.get('cp')) cpIn.value = params.get('cp');

    function apply() {
      let list = SUPPLIERS.slice();
      const t = tSel ? tSel.value : '';
      const cp = cpIn ? cpIn.value.trim() : '';
      const cond = condSel ? condSel.value : '';
      const note = $('#filterNote');
      if (cp && !/^\d{5}$/.test(cp)) {
        if (note) { note.textContent = 'Code postal invalide (5 chiffres attendus).'; note.className = 'search-note err'; }
        return;
      }
      if (t) list = list.filter((s) => (s.types || []).some((x) => x === t));
      if (cp) list = list.filter((s) => s.cp.slice(0, 2) === cp.slice(0, 2) || (s.zoneCities || []).indexOf('France métropolitaine') > -1 || s.cp === cp);
      if (cond === 'Vrac') list = list.filter((s) => (s.tags || []).join(' ').toLowerCase().indexOf('vrac') > -1);
      if (cond === 'Sac / palette') list = list.filter((s) => /sac|palette|pack/i.test((s.tags || []).join(' ')));
      const sort = sortSel ? sortSel.value : '';
      if (sort === 'prix') list.sort((a, b) => (a.priceFrom || 1e9) - (b.priceFrom || 1e9));
      if (sort === 'note') list.sort((a, b) => b.rating - a.rating);
      if (sort === 'avis') list.sort((a, b) => b.reviews - a.reviews);
      renderSupplierList(listEl, list);
      const res = $('#supplierCount');
      if (res) res.textContent = list.length + (list.length > 1 ? ' fournisseurs' : ' fournisseur');
      if (note) {
        const parts = [];
        if (t) parts.push('type : ' + t);
        if (cp) parts.push('zone : ' + cp);
        if (cond) parts.push('conditionnement : ' + cond);
        note.textContent = parts.length ? 'Filtres appliqués (' + parts.join(', ') + ').' : 'Tous les fournisseurs sont affichés.';
        note.className = 'search-note ok';
      }
    }
    const form = $('#filterForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
    [tSel, cpIn, condSel, sortSel].forEach((el) => el && el.addEventListener('change', apply));
    apply();
  }

  /* ================= Recherche de l'accueil ================= */
  function initHomeSearch() {
    const chips = $$('#chips .chip');
    const typeBois = $('#typeBois');
    chips.forEach((c) => c.addEventListener('click', () => {
      chips.forEach((x) => x.classList.remove('active'));
      c.classList.add('active');
      if (typeBois) typeBois.value = c.dataset.value;
    }));
    const form = $('#searchForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cp = ($('#cpSearch') && $('#cpSearch').value || '').trim();
      const note = $('#searchNote');
      if (!/^\d{5}$/.test(cp)) {
        if (note) { note.textContent = 'Merci de saisir un code postal valide (5 chiffres).'; note.className = 'search-note err'; }
        $('#cpSearch') && $('#cpSearch').classList.add('invalid');
        return;
      }
      const type = (typeBois && typeBois.value) || 'Buches';
      const map = { Buches: 'Bûches de bois', Granules: 'Granulés / Pellets', 'Bois densifie': 'Bois densifié', Plaquettes: 'Plaquettes' };
      if (note) { note.textContent = 'Recherche en cours pour « ' + type + ' » dans le ' + cp + '…'; note.className = 'search-note ok'; }
      location.href = 'fournisseurs.html?type=' + encodeURIComponent(map[type] || type) + '&cp=' + cp + '#liste';
    });
  }

  /* ================= Calculateur de besoin ================= */
  const FUELS = {
    buches:     { label: 'Bûches de bois', kwhPerUnit: 1600, unit: 'stère',  pricePerUnit: 89,  pack: 'stères' },
    granules:   { label: 'Granulés ENplus A1', kwhPerUnit: 4800, unit: 'tonne', pricePerUnit: 350, pack: 'tonnes' },
    densifie:   { label: 'Bois densifié', kwhPerUnit: 4900, unit: 'tonne', pricePerUnit: 420, pack: 'tonnes' },
    plaquettes: { label: 'Plaquettes forestières', kwhPerUnit: 900, unit: 'm³', pricePerUnit: 75, pack: 'm³' }
  };
  const APPLIANCES = {
    poele:    { label: 'Poêle à bûches', rend: 0.75 },
    insert:   { label: 'Insert / cheminée', rend: 0.65 },
    granules: { label: 'Poêle à granulés', rend: 0.88 },
    chaudiere:{ label: 'Chaudière bois', rend: 0.90 }
  };
  const INSUL = { bonne: 80, moyenne: 110, faible: 150 };

  function initCalculator() {
    const root = $('#calcApp');
    if (!root) return;
    const R = (id) => $('#' + id);
    const out = {
      surface: R('cSurface'), insul: R('cInsul'), app: R('cApp'), fuel: R('cFuel')
    };
    function run() {
      const surface = Number(out.surface.value) || 100;
      const insul = out.insul.value;
      const app = out.app.value;
      const fuel = out.fuel.value;
      const conso = INSUL[insul];
      const rend = APPLIANCES[app].rend;
      const besoinUtile = surface * conso;                 // kWh/an utiles
      const besoinPrimaire = besoinUtile / rend;           // kWh/an à fournir
      const f = FUELS[fuel];
      const units = besoinPrimaire / f.kwhPerUnit;         // stères ou tonnes ou m³
      const pct = tierFor(units);
      const uPrice = unitAfter(f.pricePerUnit, units);
      const cost = lineTotal(f.pricePerUnit, units);       // total remisé

      const sv = $('#cSurfaceV');
      if (sv) sv.textContent = surface + ' m²';
      $('#cBig').textContent = units.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' ' + f.pack;
      $('#cSub').textContent = 'soit environ ' + euro(Math.round(cost / 10) * 10) + ' par an pour ' + surface + ' m² (' + f.label.toLowerCase() + ')';
      $('#cNeed').textContent = Math.round(besoinUtile).toLocaleString('fr-FR') + ' kWh';
      $('#cPrim').textContent = Math.round(besoinPrimaire).toLocaleString('fr-FR') + ' kWh';
      $('#cRend').textContent = Math.round(rend * 100) + ' %';
      $('#cUnit').textContent = units.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' ' + f.pack;
      const cUp = $('#cUnitPrice'); if (cUp) cUp.textContent = euro(Math.round(uPrice * 100) / 100) + ' / ' + f.unit;
      const cD = $('#cDisc'); if (cD) cD.textContent = pct ? discLabel(pct) : 'aucune remise';
      $('#cCost').textContent = euro(Math.round(cost));
      const nt = nextTier(units);
      $('#cNote').textContent = 'Base : ' + conso + ' kWh/m²/an (isolation ' + insul + '), appareil « ' + APPLIANCES[app].label + ' », prix ' + euro(f.pricePerUnit) + ' ' + unitArticle(f.unit) +
        (pct ? ' avec ' + discLabel(pct) + ' de remise volume.' : '.') +
        (nt ? ' Dès ' + nt[0] + ' ' + f.pack + ' : ' + discLabel(nt[1]) + '.' : '');
      // mémorise pour le devis
      store.set('we_calc', { surface, insul, app, fuel, units: Math.round(units * 10) / 10, cost: Math.round(cost), pct, unitPrice: Math.round(uPrice * 100) / 100 });
      const lk = $('#cToDevis');
      if (lk) lk.href = 'devis.html?fuel=' + fuel + '&qty=' + Math.round(units * 10) / 10 + '&cp=';
    }
    ['input', 'change'].forEach((ev) => root.addEventListener(ev, run));
    run();
  }

  /* ================= Devis multi-étapes ================= */
  function initWizard() {
    const wz = $('#wizard');
    if (!wz) return;
    const steps = $$('.wz-step', wz);
    const bars = $$('.wz-progress span', wz);
    let i = 0;
    const state = store.get('we_draft', {});
    const p = new URLSearchParams(location.search);
    if (p.get('fuel')) state.fuel = p.get('fuel');
    if (p.get('qty')) state.qty = p.get('qty');
    if (p.get('f')) state.supplier = p.get('f');

    function show(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      bars.forEach((b, k) => b.classList.toggle('on', k <= i));
      $('#wzBack').style.visibility = i === 0 ? 'hidden' : 'visible';
      $('#wzNext').style.display = i === steps.length - 1 ? 'none' : '';
      $('#wzPrint').style.display = i === steps.length - 1 ? '' : 'none';
      wz.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function collect() {
      $$('.opt.sel', wz).forEach((o) => { state[o.dataset.group] = o.dataset.value; });
      $$('input,select,textarea', wz).forEach((el) => { if (el.name) state[el.name] = el.value; });
      store.set('we_draft', state);
    }
    // pré-remplissage
    $$('.opt', wz).forEach((o) => {
      if (state[o.dataset.group] === o.dataset.value) o.classList.add('sel');
      o.addEventListener('click', () => {
        $$('.opt[data-group="' + o.dataset.group + '"]', wz).forEach((x) => x.classList.remove('sel'));
        o.classList.add('sel'); collect();
      });
    });
    $$('input,select,textarea', wz).forEach((el) => {
      if (el.name && state[el.name]) el.value = state[el.name];
      el.addEventListener('change', collect);
      el.addEventListener('input', collect);
    });
    if (state.qty && $('#wQty')) $('#wQty').value = state.qty;
    if (state.fuel && $('#wFuel')) $('#wFuel').value = FUELS[state.fuel] ? FUELS[state.fuel].label : state.fuel;
    // #wSupplier est un <select> dont les valeurs sont les slugs :
    // le pré-remplissage générique ci-dessus suffit.

    $('#wzNext').addEventListener('click', () => { collect(); show(i + 1); });
    $('#wzBack').addEventListener('click', () => { collect(); show(i - 1); });

    // récapitulatif
    const recEl = $('#wzRecap');
    function recap() {
      if (!recEl) return;
      const f = FUELS[state.fuel] || FUELS.buches;
      const qty = Number(state.qty) || 0;
      const pct = tierFor(qty);
      const netUnit = unitAfter(f.pricePerUnit, qty);
      const total = lineTotal(f.pricePerUnit, qty);
      const nt = nextTier(qty);
      const rows = [
        ['Type de bois', f.label],
        ['Quantité souhaitée', qty ? qty + ' ' + f.pack : 'à préciser'],
        ['Prix unitaire remisé', qty ? money(netUnit) + ' ' + unitArticle(f.unit) : '—'],
        ['Remise volume', qty ? (pct ? discLabel(pct) : 'Aucune') : '—'],
        ['Palier suivant', qty ? (nt ? 'dès ' + nt[0] + ' : ' + discLabel(nt[1]) : 'Palier maximal atteint') : '—'],
        ['Budget indicatif', total ? money(total) : 'sur devis'],
        ['Appareil de chauffage', APPLIANCES[state.app] ? APPLIANCES[state.app].label : (state.app || '—')],
        ['Code postal', state.cp || '—'],
        ['Nom', state.nom || '—'],
        ['E-mail', state.email || '—'],
        ['Téléphone', state.tel || '—'],
        ['Délai souhaité', state.delai || '—'],
        ['Fournisseur souhaité', state.supplier ? (bySlug(state.supplier) || {}).name || '—' : 'Peu importe'],
        ['Message', state.message || '—']
      ];
      recEl.innerHTML = rows.map((r) => `<div class="kv"><span>${esc(r[0])}</span><b>${esc(String(r[1]).replace(/&amp;/g, '&'))}</b></div>`).join('');
    }
    steps.forEach((s, k) => { if (k === steps.length - 1) bars.length && show(0); });

    $('#wzNext').addEventListener('click', () => { if (i + 1 === steps.length - 1) { collect(); recap(); } });
    $('#wzBack').addEventListener('click', () => { if (i === steps.length - 1) collect(); });
    $$('.wz-next-to-recap', wz).forEach(() => {});
    const observer = new MutationObserver(() => { if (steps[i] && i === steps.length - 1) recap(); });
    steps.forEach((s) => observer.observe(s, { attributes: true, attributeFilter: ['class'] }));

    const form = $('#wzForm');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = $('#wzSubmit') || $('button[type="submit"]', form);
      if (submitBtn && submitBtn.disabled) return;   // envoi déjà en cours
      if (!validate(form)) {
        // champ obligatoire manquant : on l'explique et on revient à l'étape concernée
        const bad = $('.invalid', form);
        const noteEl = $('#wzNote');
        if (noteEl) {
          noteEl.textContent = 'Merci de compléter les champs obligatoires' + (bad && bad.labels && bad.labels[0] ? ' (' + bad.labels[0].textContent.trim().toLowerCase() + ')' : '') + ' avant l\'envoi.';
          noteEl.className = 'form-note err';
        }
        if (bad) {
          const st = bad.closest('.wz-step');
          const idx = st ? steps.indexOf(st) : -1;
          if (idx > -1) show(idx);
          try { bad.focus(); } catch (e) {}
        }
        return;
      }
      collect();
      const list = store.get('we_quotes', []);
      const fz = FUELS[state.fuel] || FUELS.buches;
      const qN = Number(state.qty) || 0;
      const enriched = Object.assign({}, state, {
        pct: tierFor(qN),
        unitPrice: Math.round(unitAfter(fz.pricePerUnit, qN) * 100) / 100,
        total: qN ? Math.round(lineTotal(fz.pricePerUnit, qN) * 100) / 100 : 0
      });
      list.unshift({ date: new Date().toISOString(), data: enriched });
      store.set('we_quotes', list);

      /* --- Envoi du devis chiffré par e-mail --- */
      const wl = ['Bonjour WoodEnergy,', 'voici ma demande de devis :', ''];
      wl.push('\u2022 Bois : ' + fz.label);
      wl.push('\u2022 Quantit\u00e9 : ' + (qN ? qN + ' ' + fz.pack : '\u00e0 pr\u00e9ciser'));
      if (qN) {
        wl.push('\u2022 Prix estim\u00e9 : ' + money(enriched.total) +
          ' (' + money(enriched.unitPrice) + ' ' + unitArticle(fz.unit) +
          (enriched.pct ? ', remise ' + discLabel(enriched.pct) : '') + ')');
      }
      if (APPLIANCES[state.app]) wl.push('\u2022 Appareil : ' + APPLIANCES[state.app].label);
      if (state.cp) wl.push('\u2022 Code postal : ' + state.cp);
      if (state.delai) wl.push('\u2022 D\u00e9lai : ' + state.delai);
      wl.push('\u2022 Fournisseur : ' + (state.supplier ? ((bySlug(state.supplier) || {}).name || state.supplier) : 'peu importe, le plus proche'));
      if (state.nom) wl.push('\u2022 Nom : ' + state.nom);
      if (state.email) wl.push('\u2022 E-mail : ' + state.email);
      if (state.tel) wl.push('\u2022 T\u00e9l\u00e9phone : ' + state.tel);
      if (state.message) wl.push('\u2022 Pr\u00e9cisions : ' + state.message);
      wl.push('', 'Merci de me recontacter pour finaliser ce devis.', 'Demande pr\u00e9par\u00e9e depuis woodenergyfr.com');

      // Aucun envoi depuis le site : le récapitulatif est remis au logiciel de
      // messagerie du visiteur, qui n'a plus qu'à cliquer sur « Envoyer ».
      const note = $('#wzNote');
      const okText = 'Merci' + (state.nom ? ' ' + state.nom : '') +
        ' ! Votre récapitulatif est prêt dans votre logiciel de messagerie, adressé à ' + MAIL_TO +
        '. Il vous reste à cliquer sur « Envoyer » : c\'est votre messagerie qui transmet la demande, ' +
        'rien n\'est envoyé depuis cette page.';
      openMailDraft(note, wl, okText, submitBtn);
    });
    show(0);
  }

  /* ================= Comparateur ================= */
  function initComparator() {
    const pick = $('#cmpPicker');
    if (!pick) return;
    const table = $('#cmpTable');
    const sel = new Set();
    // pré-sélection
    const p = new URLSearchParams(location.search);
    (p.get('ids') || '').split(',').filter(Boolean).forEach((id) => sel.add(id));
    if (!sel.size) SUPPLIERS.slice(0, 3).forEach((s) => sel.add(s.id));

    pick.innerHTML = SUPPLIERS.map((s) => `
      <button type="button" class="opt ${sel.has(s.id) ? 'sel' : ''}" data-id="${s.id}">
        <span class="opt-ico">${(s.types || [])[0] && (s.types[0] === 'Granulés / Pellets' ? '⚫' : s.types[0] === 'Bois densifié' ? '📦' : s.types[0] === 'Plaquettes' ? '🌿' : '🪵')}</span>
        ${s.name.replace(/&amp;/g, '&')}<br><small style="font-weight:400;color:var(--muted)">${s.priceFrom ? euro(s.priceFrom) + ' ' + esc(s.priceUnit) : esc(s.priceUnit)}</small>
      </button>`).join('');

    function render() {
      const list = SUPPLIERS.filter((s) => sel.has(s.id));
      if (!list.length) { table.innerHTML = '<p class="empty" style="padding:1.5rem">Sélectionnez au moins un fournisseur à comparer.</p>'; return; }
      const cheapest = list.reduce((a, b) => ((a.priceFrom || 1e9) <= (b.priceFrom || 1e9) ? a : b));
      const best = list.reduce((a, b) => (a.rating >= b.rating ? a : b));
      const rows = [
        ['Photo', (s) => `<img src="${s.img}" alt="${esc(s.name)}" loading="lazy" style="width:56px;height:56px;object-fit:cover;border-radius:10px">`],
        ['Type de bois', (s) => (s.types || []).join(', ')],
        ['Prix de départ', (s) => s.priceFrom ? `<strong>${euro(s.priceFrom)}</strong> ${esc(s.priceUnit)}` : esc(s.priceUnit)],
        ['Note clients', (s) => `${stars(s.rating)} <span class="muted">(${s.reviews})</span>`],
        ['Zone de livraison', (s) => esc(s.zone)],
        ['Conditionnement', (s) => (s.tags || []).join(' · ')],
        ['Livraison', (s) => esc(s.delivery)],
        ['Commande minimum', (s) => esc(s.minOrder)],
        ['Certifications', (s) => (s.certifs || []).join(' · ')],
        ['Ancienneté', (s) => 'Depuis ' + s.since],
        ['Contact', (s) => `${esc(s.phone)}<br>${esc(s.email)}`]
      ];
      table.innerHTML = `
        <table class="cmp-table">
          <thead><tr><th></th>${list.map((s) => `<th class="${s.id === best.id ? 'cmp-winner' : ''}">${s.name.replace(/&amp;/g, '&')}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(([label, fn]) => `<tr><th>${label}</th>${list.map((s) => `<td class="${s.id === cheapest.id && label === 'Prix de départ' ? 'cmp-winner' : ''}">${fn(s)}</td>`).join('')}</tr>`).join('')}
            <tr><th>Action</th>${list.map((s) => `<td><a class="btn btn-primary" href="devis.html?f=${s.slug}">Demander un devis</a></td>`).join('')}</tr>
          </tbody>
        </table>`;
    }
    pick.addEventListener('click', (e) => {
      const b = e.target.closest('.opt'); if (!b) return;
      const id = b.getAttribute('data-id');
      if (sel.has(id)) { sel.delete(id); b.classList.remove('sel'); }
      else {
        if (sel.size >= 3) { alert('Vous pouvez comparer jusqu\'à 3 fournisseurs à la fois.'); return; }
        sel.add(id); b.classList.add('sel');
      }
      render();
    });
    render();
  }

  /* ================= Carte des fournisseurs ================= */
  function initMap() {
    const pinsEl = $('#mapPins'), listEl = $('#mapList');
    if (!pinsEl) return;
    const p = new URLSearchParams(location.search);
    const filterType = p.get('type');
    let list = SUPPLIERS.slice();
    if (filterType) list = list.filter((s) => (s.types || []).join(',').toLowerCase().indexOf(filterType.toLowerCase().slice(0, 6)) > -1);

    pinsEl.innerHTML = list.map((s) => `
      <button type="button" class="map-pin" data-id="${s.id}" style="left:${s.map.x}%;top:${s.map.y}%"
        aria-label="${esc(s.name)}">
        <span aria-hidden="true">📍</span>
        <span class="pin-label">${s.name.replace(/&amp;/g, '&')}</span>
      </button>`).join('');

    listEl.innerHTML = list.map((s) => `
      <button type="button" class="map-item" data-id="${s.id}">
        <h4>${s.name.replace(/&amp;/g, '&')}</h4>
        <p>${esc(s.zone)}</p>
        <span class="stars">${stars(s.rating)}</span>
      </button>`).join('');

    function select(id) {
      $$('.map-pin,.map-item').forEach((el) => el.classList.toggle('on', el.getAttribute('data-id') === id));
      const s = list.filter((x) => x.id === id)[0];
      const box = $('#mapCard');
      if (box && s) {
        box.innerHTML = `
          <img src="${s.img}" alt="${esc(s.name)}" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:10px">
          <h3 style="color:var(--brown-dark);margin:.7rem 0 .2rem">${s.name.replace(/&amp;/g, '&')}</h3>
          <p class="muted" style="font-size:.86rem">${esc(s.zone)}</p>
          <p style="font-size:.88rem;margin:.6rem 0"><span class="stars">${stars(s.rating)}</span> · ${s.reviews} avis</p>
          <p style="font-size:.88rem">À partir de <strong>${s.priceFrom ? euro(s.priceFrom) + ' ' + esc(s.priceUnit) : esc(s.priceUnit)}</strong></p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.8rem">
            <a class="btn btn-primary" href="fournisseur-${s.slug}.html">Voir la fiche</a>
            <a class="btn btn-ghost" href="devis.html?f=${s.slug}">Devis</a>
          </div>`;
      }
    }
    pinsEl.addEventListener('click', (e) => { const b = e.target.closest('.map-pin'); if (b) select(b.getAttribute('data-id')); });
    listEl.addEventListener('click', (e) => { const b = e.target.closest('.map-item'); if (b) select(b.getAttribute('data-id')); });
    if (list.length) select(list[0].id);

    const fs = $('#mapFilter');
    if (fs) fs.addEventListener('change', () => {
      const v = fs.value;
      const filtered = v ? SUPPLIERS.filter((s) => (s.types || []).indexOf(v) > -1) : SUPPLIERS;
      location.href = 'carte.html' + (v ? '?type=' + encodeURIComponent(v) : '');
      void filtered;
    });
  }

  /* ================= Onglets ================= */
  function initTabs() {
    $$('.tabs').forEach((tabs) => {
      const btns = $$('.tab', tabs);
      btns.forEach((b) => b.addEventListener('click', () => {
        btns.forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        const panels = $$('.tab-panel', tabs.parentElement);
        panels.forEach((pnl) => pnl.classList.toggle('on', pnl.id === b.dataset.panel));
      }));
    });
  }

  /* ================= Espace client ================= */
  function initAccount() {
    const box = $('#accountApp');
    if (!box) return;
    const user = store.get('we_user', null);

    function renderLogged() {
      const u = store.get('we_user', null);
      if (!u) return renderAuth();
      const favs = store.get('we_favs', []).map(bySlug).filter(Boolean);
      const quotes = store.get('we_quotes', []);
      const orders = store.get('we_orders', []);
      box.innerHTML = `
        <div class="dash-grid">
          <div class="dash-card">
            <h3>Mon compte</h3>
            <div class="kv"><span>Nom</span><b>${esc(u.nom)}</b></div>
            <div class="kv"><span>E-mail</span><b>${esc(u.email)}</b></div>
            <div class="kv"><span>Code postal</span><b>${esc(u.cp || '—')}</b></div>
            <p style="margin-top:1rem"><button class="btn btn-ghost" id="logout">Se déconnecter</button></p>
          </div>
          <div class="dash-card">
            <h3>Mes favoris (${favs.length})</h3>
            ${favs.length ? favs.map((s) => `<div class="kv"><span><a href="fournisseur-${s.slug}.html" style="color:var(--amber-dark)">${s.name.replace(/&amp;/g, '&')}</a></span><b>${s.priceFrom ? euro(s.priceFrom) : esc(s.priceUnit)}</b></div>`).join('')
              : '<p class="empty">Aucun favori. Ajoutez des fournisseurs depuis l\'annuaire.</p>'}
          </div>
          <div class="dash-card">
            <h3>Mes demandes de devis (${quotes.length})</h3>
            ${quotes.length ? quotes.slice(0, 5).map((q) => `<div class="kv"><span>${new Date(q.date).toLocaleDateString('fr-FR')} — ${esc((q.data && q.data.fuel) || 'devis')}${q.data && q.data.pct ? ' (' + discLabel(q.data.pct) + ')' : ''}</span><b>${q.data && q.data.total ? euro(q.data.total) : esc((q.data && q.data.cp) || '—')}</b></div>`).join('')
              : '<p class="empty">Aucune demande pour l\'instant. <a href="devis.html" style="color:var(--amber-dark)">Demander un devis</a>.</p>'}
          </div>
          <div class="dash-card">
            <h3>Mes commandes</h3>
            ${orders.length ? orders.map((o) => `<div class="kv"><span>${esc(o.ref)} — ${o.date ? new Date(o.date).toLocaleDateString('fr-FR') : esc(o.statut)}</span><b>${(o.totals && o.totals.total ? euro(o.totals.total) : '') + (o.totals && o.totals.total ? ' · ' : '') + esc(o.statut)}</b></div>`).join('')
              : '<p class="empty">Aucune commande enregistrée.</p>'}
          </div>
        </div>`;
      $('#logout').addEventListener('click', () => { store.set('we_user', null); renderAuth(); });
    }

    function renderAuth() {
      box.innerHTML = `
        <div class="auth-box">
          <div class="auth-tabs">
            <button class="on" data-tab="login">Connexion</button>
            <button data-tab="register">Créer un compte</button>
          </div>
          <form class="panel on" id="panelLogin" novalidate>
            <div class="field"><label for="lEmail">E-mail</label><input type="email" id="lEmail" name="email" required placeholder="vous@exemple.fr"></div>
            <div class="field"><label for="lPass">Mot de passe</label><input type="password" id="lPass" name="password" required placeholder="••••••••"></div>
            <button type="submit" class="btn btn-primary btn-block">Se connecter</button>
            <p class="form-note" role="status"></p>
          </form>
          <form class="panel" id="panelRegister" novalidate>
            <div class="field"><label for="rNom">Nom</label><input type="text" id="rNom" name="nom" required placeholder="Votre nom"></div>
            <div class="field"><label for="rEmail">E-mail</label><input type="email" id="rEmail" name="email" required placeholder="vous@exemple.fr"></div>
            <div class="field"><label for="rCp">Code postal</label><input type="text" id="rCp" name="cp" required inputmode="numeric" maxlength="5" placeholder="00000"></div>
            <div class="field"><label for="rPass">Mot de passe</label><input type="password" id="rPass" name="password" required placeholder="••••••••"></div>
            <label style="display:flex;gap:.5rem;font-size:.84rem;margin-bottom:1rem"><input type="checkbox" name="rgpd" required> J'accepte que mes données soient utilisées pour gérer mes demandes.</label>
            <button type="submit" class="btn btn-primary btn-block">Créer mon compte</button>
            <p class="form-note" role="status"></p>
          </form>
        </div>`;
      $$('.auth-tabs button', box).forEach((b) => b.addEventListener('click', () => {
        $$('.auth-tabs button', box).forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        $('#panelLogin').classList.toggle('on', b.dataset.tab === 'login');
        $('#panelRegister').classList.toggle('on', b.dataset.tab === 'register');
      }));
      $('#panelLogin').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.currentTarget, note = $('.form-note', f);
        if (!validate(f)) { note.textContent = 'Vérifiez vos identifiants.'; note.className = 'form-note err'; return; }
        const u = store.get('we_registered', null);
        const data = Object.fromEntries(new FormData(f).entries());
        if (!u || u.email !== data.email) {
          note.textContent = 'Aucun compte pour cet e-mail. Créez un compte ou demandez un devis sans compte.';
          note.className = 'form-note err'; return;
        }
        store.set('we_user', u); renderLogged();
      });
      $('#panelRegister').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.currentTarget, note = $('.form-note', f);
        if (!validate(f)) { note.textContent = 'Merci de compléter les champs en rouge.'; note.className = 'form-note err'; return; }
        const u = Object.fromEntries(new FormData(f).entries());
        u.createdAt = new Date().toISOString();
        store.set('we_registered', u); store.set('we_user', u);
        renderLogged();
      });
    }
    user ? renderLogged() : renderAuth();
  }

  /* ================= Divers ================= */
  function initMisc() {
    // bouton d'impression (récapitulatif devis)
    $$('.js-print').forEach((b) => b.addEventListener('click', () => window.print()));
    // année
    const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    // tableau des tarifs dynamique
    const tb = $('#tarifBody');
    if (tb && window.WE_TARIFS) {
      tb.innerHTML = window.WE_TARIFS.map((t) => `<tr class="${/Bûches|Granulés/.test(t.combustible) ? 'highlight' : ''}">
        <td>${esc(t.combustible)}</td><td>${esc(t.prix)}</td><td>${esc(t.kwh)}</td><td>${esc(t.note)}</td></tr>`).join('');
    }
    const cb = $('#compareBody');
    if (cb && window.WE_TARIFS) {
      cb.innerHTML = window.WE_TARIFS.map((t) => `<tr><td>${esc(t.combustible)}</td><td>${esc(t.kwh)}</td><td>${esc(t.note)}</td></tr>`).join('');
    }
  }

  /* ================= Panier ================= */
  const CART_KEY = 'we_cart';
  let cartFlash = null;
  const money = (n) => euro(Math.round((Number(n) || 0) * 100) / 100);

  function cartItems() {
    const raw = store.get(CART_KEY, []);
    return Array.isArray(raw) ? raw.filter((i) => i && i.pid) : [];
  }
  function cartSave(items) {
    store.set(CART_KEY, items);
    try { document.dispatchEvent(new CustomEvent('we:cart', { detail: items })); } catch (e) {}
  }
  function cartAdd(btn, qty) {
    const pid = btn.getAttribute('data-pid');
    if (!pid) return;
    const price = Number(btn.getAttribute('data-price')) || 0;
    let add = Number(qty) || Number(btn.getAttribute('data-qty')) || 1;
    add = Math.max(1, Math.min(999, Math.round(add)));
    const items = cartItems();
    const found = items.filter((i) => i.pid === pid)[0];
    if (found) found.qty = Math.min(999, (Number(found.qty) || 1) + add);
    else items.push({
      pid,
      slug: btn.getAttribute('data-slug') || '',
      supplier: btn.getAttribute('data-supplier') || '',
      name: btn.getAttribute('data-name') || 'Produit',
      price,
      unit: btn.getAttribute('data-unit') || '',
      img: btn.getAttribute('data-img') || '',
      qty: add
    });
    cartSave(items);
  }
  function cartSetQty(pid, qty) {
    const items = cartItems();
    const it = items.filter((i) => i.pid === pid)[0];
    if (!it) return;
    it.qty = Math.max(1, Math.min(999, Math.round(Number(qty) || 1)));
    cartSave(items);
  }
  function cartRemove(pid) { cartSave(cartItems().filter((i) => i.pid !== pid)); }
  function cartClear() { cartSave([]); }

  function cartTotals(items) {
    items = items || cartItems();
    let gross = 0, disc = 0, count = 0;
    items.forEach((i) => {
      const q = Number(i.qty) || 0;
      const g = (Number(i.price) || 0) * q;
      gross += g;
      disc += g - lineTotal(i.price, q);
      count += q;
    });
    const sub = gross - disc;
    const ship = (sub > 0 && sub < FREE_SHIP) ? SHIP_FEE : 0;
    return { gross, disc, sub, ship, total: sub + ship, count, items };
  }

  function cartLineHTML(i) {
    const q = Number(i.qty) || 1;
    const pct = tierFor(q);
    const thumb = i.img ? '<img class="cart-line-img" src="' + esc(i.img) + '" alt="" loading="lazy" />' : '';
    return '<div class="cart-line" data-pid="' + esc(i.pid) + '">' + thumb +
      '<div class="cart-line-info"><strong>' + esc(i.name) + '</strong>' +
      '<span class="muted">' + esc(i.supplier) + ' · ' + money(i.price) + ' / ' + esc(i.unit) + '</span>' +
      '<span class="line-note">' + (pct ? 'Remise ' + discLabel(pct) + ' → ' + money(unitAfter(i.price, q)) + ' / ' + esc(i.unit) : 'Prix unitaire : ' + money(i.price)) + '</span></div>' +
      '<div class="cart-line-qty">' +
      '<button type="button" class="qty-btn js-cart-qty" data-pid="' + esc(i.pid) + '" data-d="-1" aria-label="Diminuer">' + MINUS + '</button>' +
      '<input class="qty-input js-cart-qty-input" data-pid="' + esc(i.pid) + '" inputmode="numeric" value="' + q + '" aria-label="Quantité">' +
      '<button type="button" class="qty-btn js-cart-qty" data-pid="' + esc(i.pid) + '" data-d="1" aria-label="Augmenter">+</button></div>' +
      '<div class="cart-line-total"><b class="line-total">' + money(lineTotal(i.price, q)) + '</b>' + tierPill(pct) +
      '<button type="button" class="cart-rm js-cart-rm" data-pid="' + esc(i.pid) + '" aria-label="Retirer">×</button></div></div>';
  }

  function cartRowHTML(i) {
    const q = Number(i.qty) || 1;
    const pct = tierFor(q);
    return '<tr data-pid="' + esc(i.pid) + '">' +
      '<td>' + (i.img ? '<img class="cart-row-img" src="' + esc(i.img) + '" alt="" loading="lazy" /> ' : '') + '<strong>' + esc(i.name) + '</strong><br><span class="muted">' + esc(i.supplier) + (i.slug ? ' · <a href="fournisseur-' + esc(i.slug) + '.html">fiche</a>' : '') + '</span></td>' +
      '<td>' + money(i.price) + ' / ' + esc(i.unit) + '</td>' +
      '<td><div class="qty-cell">' +
      '<button type="button" class="qty-btn js-cart-qty" data-pid="' + esc(i.pid) + '" data-d="-1" aria-label="Diminuer">' + MINUS + '</button>' +
      '<input class="qty-input js-cart-qty-input" data-pid="' + esc(i.pid) + '" inputmode="numeric" value="' + q + '" aria-label="Quantité">' +
      '<button type="button" class="qty-btn js-cart-qty" data-pid="' + esc(i.pid) + '" data-d="1" aria-label="Augmenter">+</button></div></td>' +
      '<td>' + (pct ? '<span class="tier-badge">' + discLabel(pct) + '</span> <span class="line-note">→ ' + money(unitAfter(i.price, q)) + '</span>' : '<span class="muted">—</span>') + '</td>' +
      '<td><b class="line-total">' + money(lineTotal(i.price, q)) + '</b></td>' +
      '<td><button type="button" class="cart-rm js-cart-rm" data-pid="' + esc(i.pid) + '" aria-label="Retirer">×</button></td></tr>';
  }

  function cartSummaryHTML(t) {
    return '<div class="cart-sum"><span>Sous-total (' + t.count + ' ' + (t.count > 1 ? 'unités' : 'unité') + ')</span><b>' + money(t.sub) + '</b></div>' +
      (t.disc ? '<div class="cart-sum is-disc"><span>Économie volume</span><b>' + MINUS + money(t.disc) + '</b></div>' : '') +
      '<div class="cart-sum"><span>Livraison</span><b>' + (t.ship ? money(t.ship) : 'Offerte') + '</b></div>' +
      '<div class="cart-sum is-total"><span>Total</span><b>' + money(t.total) + '</b></div>' +
      (t.ship ? '<p class="cart-promo">Plus que ' + money(FREE_SHIP - t.sub) + ' pour la livraison offerte (dès ' + money(FREE_SHIP) + ').</p>'
              : '<p class="cart-promo">Livraison offerte sur cette commande.</p>');
  }

  function renderDrawer() {
    const box = $('#cartDrawerLines'), foot = $('#cartDrawerFoot');
    if (!box || !foot) return;
    const items = cartItems();
    const t = cartTotals(items);
    if (!items.length) {
      box.innerHTML = '<p class="cart-empty">Votre panier est vide.</p>';
      foot.innerHTML = '<a class="btn btn-ghost btn-block" href="fournisseurs.html">Voir les fournisseurs</a>';
      return;
    }
    box.innerHTML = items.map(cartLineHTML).join('');
    foot.innerHTML = cartSummaryHTML(t) +
      '<div class="cart-actions"><a class="btn btn-primary btn-block" href="panier.html">Voir le panier</a>' +
      '<button type="button" class="btn btn-ghost btn-block js-cart-clear">Vider le panier</button></div>';
  }

  function renderCartPage() {
    const root = $('#cartApp');
    if (!root) return;
    const flash = cartFlash ? '<p class="form-note ok cart-flash">' + cartFlash + '</p>' : '';
    cartFlash = null;
    const items = cartItems();
    const t = cartTotals(items);
    const user = store.get('we_user', null) || {};
    if (!items.length) {
      root.innerHTML = flash + '<div class="cart-empty-box"><p class="cart-empty">Votre panier est vide.</p>' +
        '<p><a class="btn btn-primary" href="fournisseurs.html">Découvrir les fournisseurs</a></p></div>';
      return;
    }
    root.innerHTML = flash +
      '<div class="cart-grid"><div class="cart-main"><div class="table-wrap"><table class="prod-table shop-table cart-table">' +
      '<thead><tr><th>Produit</th><th>Prix unitaire</th><th>Quantité</th><th>Remise</th><th>Total ligne</th><th></th></tr></thead>' +
      '<tbody>' + items.map(cartRowHTML).join('') + '</tbody></table></div>' +
      '<p class="cart-promo"><a href="fournisseurs.html">← Continuer mes achats</a></p></div>' +
      '<aside class="cart-summary"><h3>Récapitulatif</h3>' + cartSummaryHTML(t) +
      '<form id="cartOrderForm" novalidate>' +
      '<div class="field"><label for="cartName">Nom</label><input id="cartName" name="name" type="text" value="' + esc(user.nom || '') + '" placeholder="Votre nom"></div>' +
      '<div class="field"><label for="cartEmail">E-mail</label><input id="cartEmail" name="email" type="email" value="' + esc(user.email || '') + '" placeholder="vous@exemple.fr" required></div>' +
      '<div class="field"><label for="cartCp">Code postal</label><input id="cartCp" name="cp" type="text" inputmode="numeric" maxlength="5" value="' + esc(user.cp || '') + '" placeholder="00000"></div>' +
      '<button type="submit" class="btn btn-primary btn-block" id="cartOrder">Valider la commande</button>' +
      '<button type="button" class="btn btn-ghost btn-block" id="cartQuote">Transformer en devis</button>' +
      '<button type="button" class="btn btn-ghost btn-block js-cart-clear">Vider le panier</button>' +
      '<p class="form-note" id="cartMsg" role="status"></p>' +
      '<p class="muted" style="font-size:.78rem">Démonstration : la commande et le devis sont enregistrés dans votre navigateur (aucun paiement réel).</p>' +
      '</form></aside></div>';
    const form = $('#cartOrderForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); cartPlaceOrder(form); });
    const qb = $('#cartQuote');
    if (qb) qb.addEventListener('click', cartMakeQuote);
  }

  function cartPlaceOrder(form) {
    const msg = $('#cartMsg');
    const data = Object.fromEntries(new FormData(form).entries());
    const t = cartTotals();
    if (!t.items.length) return;
    if (!data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      if (msg) { msg.textContent = 'Merci d\'indiquer une adresse e-mail valide pour confirmer la commande.'; msg.className = 'form-note err'; }
      return;
    }
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ref = 'WE-' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + Math.floor(1000 + Math.random() * 9000);
    const orders = store.get('we_orders', []);
    orders.unshift({
      ref, statut: 'Confirmée (démo)', date: now.toISOString(),
      email: data.email, name: data.name || '', cp: data.cp || '',
      items: t.items.map((i) => ({ pid: i.pid, name: i.name, supplier: i.supplier, unit: i.unit, price: i.price, qty: i.qty, total: Math.round(lineTotal(i.price, i.qty) * 100) / 100 })),
      totals: { sub: Math.round(t.sub * 100) / 100, disc: Math.round(t.disc * 100) / 100, ship: t.ship, total: Math.round(t.total * 100) / 100 }
    });
    store.set('we_orders', orders);
    cartFlash = 'Commande <b>' + esc(ref) + '</b> enregistrée (démonstration). Un fournisseur vous contacte à ' + esc(data.email) + ' pour confirmer la livraison.';
    cartClear();
  }

  function cartMakeQuote() {
    const t = cartTotals();
    if (!t.items.length) return;
    const user = store.get('we_user', null) || {};
    const form = $('#cartOrderForm');
    const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
    const quotes = store.get('we_quotes', []);
    quotes.unshift({ date: new Date().toISOString(), data: {
      fuel: 'Panier', qty: String(t.count), cp: data.cp || user.cp || '', nom: data.name || user.nom || '',
      email: data.email || user.email || '', tel: '', delai: '', app: '', supplier: '',
      message: t.items.map((i) => i.qty + ' × ' + i.name + ' (' + i.supplier + ')').join(' ; '),
      total: Math.round(t.total * 100) / 100
    } });
    store.set('we_quotes', quotes);
    cartFlash = 'Votre panier a été transformé en demande de devis. Retrouvez-la dans <a href="compte.html">votre espace</a>.';
    cartClear();
  }

  function refreshCartUI() {
    const t = cartTotals();
    const badge = $('#cartCount');
    if (badge) { badge.textContent = t.count; badge.hidden = !t.count; }
    renderDrawer();
    renderCartPage();
  }

  function shopRowUpdate(row) {
    if (!row) return;
    const price = Number(row.getAttribute('data-price')) || 0;
    const input = $('.js-qty-input', row);
    const q = Math.max(1, Math.min(999, Math.round(Number(input && input.value) || 1)));
    if (input) input.value = q;
    const pct = tierFor(q);
    const nt = nextTier(q);
    const lt = $('.line-total', row); if (lt) lt.textContent = money(lineTotal(price, q));
    const ln = $('.line-note', row); if (ln) {
      ln.textContent = (pct ? 'Remise ' + discLabel(pct) + ' → ' + money(unitAfter(price, q)) + ' / unité' : 'Aucune remise') +
        (nt ? ' · dès ' + nt[0] + ' : ' + discLabel(nt[1]) : '');
    }
    const badge = $('.tier-badge', row); if (badge) { badge.textContent = pct ? discLabel(pct) : ''; badge.hidden = !pct; }
    const add = $('.js-add', row); if (add) add.setAttribute('data-qty', q);
  }

  function initCart() {
    const drawer = $('#cartDrawer');
    const isCartPage = !!$('#cartApp');
    function openDrawer() {
      if (!drawer) return;
      drawer.hidden = false; drawer.classList.add('open');
      document.body.classList.add('cart-lock');
    }
    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove('open'); drawer.hidden = true;
      document.body.classList.remove('cart-lock');
    }
    const btn = $('#cartBtn');
    if (btn) btn.addEventListener('click', (e) => {
      if (isCartPage) return;                        // sur panier.html : navigation normale
      e.preventDefault();
      if (drawer && drawer.classList.contains('open')) closeDrawer(); else openDrawer();
    });
    if (drawer) {
      $$('[data-close]', drawer).forEach((b) => b.addEventListener('click', closeDrawer));
      drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    }

    document.addEventListener('click', (e) => {
      const add = e.target.closest('.js-add');
      if (add) {
        const row = add.closest('tr[data-pid]');
        const qin = row ? $('.js-qty-input', row) : null;
        cartAdd(add, qin ? qin.value : null);
        openDrawer();
        return;
      }
      const step = e.target.closest('.js-qty, .js-cart-qty');
      if (step) {
        const d = Number(step.getAttribute('data-d')) || Number(step.getAttribute('data-step')) || 0;
        const row = step.closest('tr[data-pid]');
        if (step.classList.contains('js-cart-qty')) {
          const pid = step.getAttribute('data-pid');
          const it = cartItems().filter((i) => i.pid === pid)[0];
          if (it) cartSetQty(pid, (Number(it.qty) || 1) + d);
        } else if (row) {
          const input = $('.js-qty-input', row);
          if (input) input.value = Math.max(1, Math.min(999, (Number(input.value) || 1) + d));
          shopRowUpdate(row);
        }
        return;
      }
      const rm = e.target.closest('.js-cart-rm');
      if (rm) { cartRemove(rm.getAttribute('data-pid')); return; }
      if (e.target.closest('.js-cart-clear')) { cartClear(); return; }
    });

    document.addEventListener('change', (e) => {
      const inp = e.target.closest('.js-qty-input, .js-cart-qty-input');
      if (!inp) return;
      if (inp.classList.contains('js-cart-qty-input')) cartSetQty(inp.getAttribute('data-pid'), inp.value);
      else shopRowUpdate(inp.closest('tr[data-pid]'));
    });

    $$('tr[data-pid]').forEach((row) => { if ($('.js-qty-input', row)) shopRowUpdate(row); });
    document.addEventListener('we:cart', refreshCartUI);
    refreshCartUI();
  }

  /* ================= Démarrage ================= */
  document.addEventListener('DOMContentLoaded', function () {
    initNav(); initCookies(); initForms(); initHomeSearch();
    initDirectory(); initCalculator(); initWizard(); initComparator();
    initMap(); initTabs(); initAccount(); initMisc(); initCart();
    initFavButtons(document);
  });
})();