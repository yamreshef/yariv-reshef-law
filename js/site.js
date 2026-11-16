/* Site behaviour: phone links, FAQ schema, lead form, dialogs, accessibility menu, edit-mode loader */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- phone: one editable number drives every tel:/WhatsApp link ---- */
  function intl(phone) {
    var d = String(phone).replace(/\D/g, '');
    if (d.indexOf('972') === 0) return d;
    return '972' + d.replace(/^0/, '');
  }
  function syncPhone(doc) {
    doc = doc || document;
    var el = doc.querySelector('[data-edit="phone"]');
    if (!el) return;
    var n = intl(el.textContent);
    if (n.length < 11) return;
    doc.querySelectorAll('a[data-tel]').forEach(function (a) { a.setAttribute('href', 'tel:+' + n); });
    doc.querySelectorAll('a[data-wa]').forEach(function (a) { a.setAttribute('href', 'https://wa.me/' + n); });
    var ld = doc.getElementById('ld-business');
    if (ld) {
      try {
        var j = JSON.parse(ld.textContent);
        j.telephone = '+' + n;
        ld.textContent = JSON.stringify(j, null, 2);
      } catch (e) { /* keep existing schema */ }
    }
  }

  /* ---- FAQ structured data is generated from the visible questions ---- */
  function syncFaq(doc) {
    doc = doc || document;
    var ld = doc.getElementById('ld-faq');
    if (!ld) return;
    var items = Array.prototype.map.call(doc.querySelectorAll('.faq details'), function (d) {
      return {
        '@type': 'Question',
        name: d.querySelector('summary').textContent.trim(),
        acceptedAnswer: { '@type': 'Answer', text: d.querySelector('p').textContent.trim() }
      };
    });
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items });
  }
  window.YR = { syncPhone: syncPhone, syncFaq: syncFaq, intl: intl };
  syncPhone();
  syncFaq();

  /* ---- lead form -> WhatsApp message to the office ---- */
  var form = $('#lead');
  if (form) {
    var status = $('.form__status', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, bad = null;
      [f.name, f.phone, f.ok].forEach(function (el) {
        var ok = el.checkValidity();
        el.classList.toggle('bad', !ok);
        el.setAttribute('aria-invalid', String(!ok));
        if (!ok && !bad) bad = el;
      });
      if (bad) {
        status.className = 'form__status err';
        status.textContent = bad === f.ok ? 'יש לאשר את מדיניות הפרטיות.' : 'נא למלא שם ומספר טלפון תקין.';
        bad.focus();
        return;
      }
      var text = 'שלום, פנייה חדשה מהאתר:\n' +
        'שם: ' + f.name.value.trim() + '\n' +
        'טלפון: ' + f.phone.value.trim() + '\n' +
        'תחום: ' + f.area.value +
        (f.msg.value.trim() ? '\nהודעה: ' + f.msg.value.trim() : '');
      var n = intl($('[data-edit="phone"]').textContent);
      window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      status.className = 'form__status ok';
      status.textContent = 'תודה! נפתחה הודעת וואטסאפ – לחצו "שליחה" כדי להשלים את הפנייה.';
      form.reset();
    });
  }

  /* ---- dialogs ---- */
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () { $('#dlg-' + b.dataset.open).showModal(); });
  });
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.hasAttribute('data-close')) d.close();
    });
  });

  /* ---- accessibility menu ---- */
  var aBtn = $('.a11y-btn'), aMenu = $('#a11y-menu'), root = document.documentElement;
  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('yr-a11y') || '{}'); } catch (e) { prefs = {}; }
  function applyPrefs() {
    ['big', 'contrast', 'links', 'still'].forEach(function (k) {
      root.classList.toggle('a-' + k, !!prefs[k]);
      var b = $('[data-a11y="' + k + '"]');
      if (b) b.setAttribute('aria-pressed', String(!!prefs[k]));
    });
    try { localStorage.setItem('yr-a11y', JSON.stringify(prefs)); } catch (e) { /* private mode */ }
  }
  function toggleMenu(open) {
    aMenu.hidden = !open;
    aBtn.setAttribute('aria-expanded', String(open));
  }
  aBtn.addEventListener('click', function () { toggleMenu(aMenu.hidden); });
  aMenu.addEventListener('click', function (e) {
    var k = e.target.dataset && e.target.dataset.a11y;
    if (!k) return;
    if (k === 'reset') prefs = {}; else prefs[k] = !prefs[k];
    applyPrefs();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !aMenu.hidden) { toggleMenu(false); aBtn.focus(); }
  });
  applyPrefs();

  /* ---- gentle reveal on scroll ---- */
  var editing = /[?&]edit\b/.test(location.search) || /[#&]key=/.test(location.hash);
  if ('IntersectionObserver' in window && !editing) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.card, .why__i, .steps li, .about__img, .about__txt, .form, .faq details').forEach(function (el) {
      el.classList.add('rv'); io.observe(el);
    });
  }

  /* ---- edit mode (loaded only when the address ends with ?edit) ---- */
  if (editing) {
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'css/editor.css'; css.dataset.editor = '1';
    document.head.appendChild(css);
    var s = document.createElement('script');
    s.src = 'js/editor.js'; s.dataset.editor = '1';
    document.body.appendChild(s);
  }
})();
