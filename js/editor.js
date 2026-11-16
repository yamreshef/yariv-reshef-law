/* Edit mode – open the site with ?edit at the end of the address.
   Texts marked data-edit and photos marked data-edit-img become editable.
   Changes are kept as a draft in this browser until published.
   Publishing rewrites index.html (and uploads photos) in the GitHub repository. */
(function () {
  'use strict';
  var DRAFT = 'yr-draft', GH = 'yr-gh';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var draft = load(DRAFT) || { text: {}, img: {} };
  var originals = { text: {}, img: {} };

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save() {
    try { localStorage.setItem(DRAFT, JSON.stringify(draft)); setState('הטיוטה נשמרה בדפדפן זה'); }
    catch (e) { setState('אין מקום לשמור טיוטה – כדאי לפרסם או להקטין תמונות', true); }
    count();
  }
  function changed() { return Object.keys(draft.text).length + Object.keys(draft.img).length; }

  /* ---------- toolbar ---------- */
  var bar = document.createElement('div');
  bar.className = 'ed-bar'; bar.dataset.editor = '1'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'סרגל עריכה');
  bar.innerHTML =
    '<strong class="ed-bar__t">מצב עריכה</strong>' +
    '<span class="ed-bar__h">לחצו על טקסט כדי לשנות אותו, או על תמונה כדי להחליף אותה</span>' +
    '<span class="ed-bar__s" role="status" aria-live="polite"></span>' +
    '<button type="button" class="ed-b ed-b--main" data-act="publish">פרסום לאתר</button>' +
    '<button type="button" class="ed-b" data-act="download">הורדת קובץ</button>' +
    '<button type="button" class="ed-b" data-act="reset">ביטול שינויים</button>' +
    '<button type="button" class="ed-b" data-act="exit">יציאה</button>';
  document.body.prepend(bar);
  document.documentElement.classList.add('ed-on');
  var stateEl = bar.querySelector('.ed-bar__s');
  function setState(msg, err) { stateEl.textContent = msg; stateEl.classList.toggle('err', !!err); }
  function count() {
    var n = changed();
    bar.querySelector('[data-act="publish"]').textContent = n ? 'פרסום לאתר (' + n + ')' : 'פרסום לאתר';
  }

  var file = document.createElement('input');
  file.type = 'file'; file.accept = 'image/*'; file.hidden = true; file.dataset.editor = '1';
  document.body.appendChild(file);

  /* ---------- text ---------- */
  function setText(el, t) {
    el.textContent = '';
    String(t).split('\n').forEach(function (line, i) {
      if (i) el.appendChild(el.ownerDocument.createElement('br'));
      el.appendChild(el.ownerDocument.createTextNode(line));
    });
  }
  function getText(el) { return el.innerText.replace(/ /g, ' ').replace(/\n+$/, ''); }

  $$('[data-edit]').forEach(function (el) {
    var k = el.dataset.edit;
    if (!(k in originals.text)) originals.text[k] = getText(el);
    if (k in draft.text) setText(el, draft.text[k]);
    el.setAttribute('contenteditable', 'plaintext-only');
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.addEventListener('input', function () {
      var t = getText(el);
      if (t === originals.text[k]) delete draft.text[k]; else draft.text[k] = t;
      $$('[data-edit="' + k + '"]').forEach(function (o) { if (o !== el) setText(o, t); });
      if (k === 'phone') window.YR.syncPhone();
      save();
    });
    el.addEventListener('paste', function (e) {           // always paste as plain text
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      if (e.key === ' ' && el.tagName === 'SUMMARY') e.stopPropagation();
    });
  });
  // links, buttons and FAQ toggles must not fire while their text is being edited
  document.addEventListener('click', function (e) {
    if (e.target.closest('.ed-bar, .ed-dlg')) return;
    var hit = e.target.closest('a, summary, button[data-edit], button[type=submit]');
    if (hit && (hit.matches('[data-edit]') || hit.querySelector('[data-edit]'))) e.preventDefault();
  }, true);
  $$('.faq details').forEach(function (d) { d.open = true; });
  window.YR.syncPhone();

  /* ---------- photos ---------- */
  var target = null;
  $$('[data-edit-img]').forEach(function (img) {
    var k = img.dataset.editImg;
    originals.img[k] = img.getAttribute('src');
    if (draft.img[k]) img.src = draft.img[k];
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.title = 'לחצו להחלפת התמונה';
    var pick = function () { target = img; file.value = ''; file.click(); };
    img.addEventListener('click', pick);
    img.addEventListener('keydown', function (e) { if (e.key === 'Enter') pick(); });
  });
  file.addEventListener('change', function () {
    var f = file.files[0];
    if (!f || !target) return;
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      var max = 1400, s = Math.min(1, max / Math.max(im.width, im.height));
      var c = document.createElement('canvas');
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      var data = c.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      target.src = data;
      draft.img[target.dataset.editImg] = data;
      save();
    };
    im.onerror = function () { setState('לא ניתן לקרוא את קובץ התמונה', true); };
    im.src = url;
  });

  /* ---------- build the final index.html from the published source + draft ---------- */
  function build(source, imgPaths) {
    var doc = new DOMParser().parseFromString(source, 'text/html');
    Object.keys(draft.text).forEach(function (k) {
      doc.querySelectorAll('[data-edit="' + k + '"]').forEach(function (el) { setText(el, draft.text[k]); });
    });
    Object.keys(draft.img).forEach(function (k) {
      doc.querySelectorAll('[data-edit-img="' + k + '"]').forEach(function (el) {
        el.setAttribute('src', imgPaths && imgPaths[k] ? imgPaths[k] : draft.img[k]);
      });
    });
    window.YR.syncPhone(doc);
    window.YR.syncFaq(doc);
    var phone = doc.querySelector('[data-edit="phone"]'), meta = doc.querySelector('meta[data-meta="description"]');
    if (phone && meta) meta.setAttribute('content', meta.getAttribute('content').replace(/0\d{1,2}-?\d{7}/, phone.textContent.trim()));
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML + '\n';
  }

  /* ---------- GitHub publishing ---------- */
  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function unb64(s) {
    var bin = atob(s.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function api(cfg, path, opts) {
    opts = opts || {};
    opts.headers = { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json' };
    return fetch('https://api.github.com/repos/' + cfg.repo + '/contents/' + path, opts).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'קוד הגישה שגוי או חסר הרשאה' : r.status === 404 ? 'המאגר או הקובץ לא נמצאו' : (j.message || 'שגיאה ' + r.status));
        return j;
      });
    });
  }
  function put(cfg, path, content64, sha, msg) {
    var body = { message: msg, content: content64, branch: cfg.branch };
    if (sha) body.sha = sha;
    return api(cfg, path, { method: 'PUT', body: JSON.stringify(body) });
  }

  function askSettings() {
    return new Promise(function (resolve) {
      var cfg = load(GH) || { repo: '', branch: 'main', token: '' };
      var d = document.createElement('dialog');
      d.className = 'ed-dlg'; d.dataset.editor = '1';
      d.innerHTML =
        '<form method="dialog"><h2>חיבור לפרסום</h2>' +
        '<p>ממלאים פעם אחת. הפרטים נשמרים רק בדפדפן הזה.</p>' +
        '<label>מאגר GitHub (בעלים/שם)<input name="repo" dir="ltr" placeholder="owner/repo" required></label>' +
        '<label>ענף<input name="branch" dir="ltr" required></label>' +
        '<label>קוד גישה (Token)<input name="token" type="password" dir="ltr" autocomplete="off" required></label>' +
        '<div class="ed-dlg__b"><button class="ed-b ed-b--main" value="ok">שמירה ופרסום</button>' +
        '<button class="ed-b" value="cancel" formnovalidate>ביטול</button></div></form>';
      document.body.appendChild(d);
      var f = d.querySelector('form');
      f.repo.value = cfg.repo; f.branch.value = cfg.branch || 'main'; f.token.value = cfg.token;
      d.addEventListener('close', function () {
        var out = null;
        if (d.returnValue === 'ok') {
          out = { repo: f.repo.value.trim(), branch: f.branch.value.trim(), token: f.token.value.trim() };
          localStorage.setItem(GH, JSON.stringify(out));
        }
        d.remove(); resolve(out);
      });
      d.showModal();
    });
  }

  function publish(forceAsk) {
    if (!changed()) { setState('אין שינויים לפרסום'); return; }
    var saved = load(GH);
    var getCfg = (saved && saved.token && !forceAsk) ? Promise.resolve(saved) : askSettings();
    getCfg.then(function (cfg) {
      if (!cfg) return;
      setState('מפרסם…');
      var paths = {}, stamp = Date.now();
      var uploads = Object.keys(draft.img).reduce(function (p, k) {
        return p.then(function () {
          var path = 'images/uploads/' + k.replace(/[^a-z0-9]+/gi, '-') + '-' + stamp + '.jpg';
          paths[k] = path;
          return put(cfg, path, draft.img[k].split(',')[1], null, 'Update photo: ' + k);
        });
      }, Promise.resolve());
      return uploads
        .then(function () { return api(cfg, 'index.html?ref=' + encodeURIComponent(cfg.branch)); })
        .then(function (cur) { return put(cfg, 'index.html', b64(build(unb64(cur.content), paths)), cur.sha, 'Update site content from editor'); })
        .then(function () {
          localStorage.removeItem(DRAFT);
          draft = { text: {}, img: {} };
          count();
          setState('פורסם! השינויים יופיעו באתר בתוך דקה-שתיים');
        });
    }).catch(function (e) {
      setState('הפרסום נכשל: ' + e.message, true);
      if (/קוד הגישה|המאגר/.test(e.message)) publish(true);
    });
  }

  function download() {
    fetch('index.html', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (src) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([build(src)], { type: 'text/html;charset=utf-8' }));
      a.download = 'index.html';
      a.click();
      setState('הקובץ ירד – ניתן להעביר אותו למי שמתחזק את האתר');
    }).catch(function () { setState('ההורדה נכשלה', true); });
  }

  bar.addEventListener('click', function (e) {
    var act = e.target.dataset && e.target.dataset.act;
    if (act === 'publish') publish();
    if (act === 'download') download();
    if (act === 'reset' && changed() && confirm('לבטל את כל השינויים שלא פורסמו?')) {
      localStorage.removeItem(DRAFT); location.reload();
    }
    if (act === 'exit') location.href = location.pathname;
  });

  window.YR.build = build;   // exposed for testing
  count();
  setState(changed() ? 'נטענה טיוטה שלא פורסמה' : 'מוכן לעריכה');
})();
