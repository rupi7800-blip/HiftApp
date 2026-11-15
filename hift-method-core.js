/* =========================================================
   hift-method-core.js — logica del metodo HIFT (nessun DOM)
   - adattatore per l'archivio esercizi ESTERNO (non contiene esercizi)
   - generatore CORE (3 × 4 × 30"/30") + CIRCUITO a 5 stazioni fisse
   - metodi di circuito configurabili e calcolo delle durate
   - controllo di coerenza della scheda
   Usabile nel browser (window.HiftCore) e in Node (require).
   ========================================================= */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.HiftCore = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- regole fisse del metodo ---------------- */
  var CORE_RULES = Object.freeze({ esercizi: 3, serie: 4, lavoro: 30, recupero: 30 });
  var STATIONS = Object.freeze([
    { k: 'petto', n: 'Petto' },
    { k: 'quadricipiti', n: 'Quadricipiti' },
    { k: 'spalle', n: 'Spalle' },
    { k: 'glutei', n: 'Glutei' },
    { k: 'dorso', n: 'Dorso' }
  ]);
  var SLOT_NAMES = { core: 'Core', petto: 'Petto', quadricipiti: 'Quadricipiti', spalle: 'Spalle', glutei: 'Glutei', dorso: 'Dorso' };
  var BW = 'corpo libero';

  /* ---------------- testo ---------------- */
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // parole che identificano i distretti (lette dai campi dell'archivio, non dal nome)
  var SLOT_WORDS = {
    core: ['core', 'addom', 'abdom', 'abs', 'obliqu', 'trasvers', 'antirotaz', 'anti rotaz', 'anti-rotaz'],
    petto: ['petto', 'pettoral', 'chest', 'pector'],
    quadricipiti: ['quadricip', 'quadricep', 'quads'],
    spalle: ['spall', 'deltoid', 'shoulder'],
    glutei: ['glute', 'gluteo', 'glutei'],
    dorso: ['dorso', 'dorsal', 'latissim', 'romboid', 'upper back', 'lats', 'schiena alta']
  };
  function slotOf(text) {
    var t = norm(text);
    if (!t) return null;
    for (var k in SLOT_WORDS) {
      if (SLOT_WORDS[k].some(function (w) { return t.indexOf(w) >= 0; })) return k;
    }
    return null;
  }
  var BW_WORDS = ['corpo libero', 'a corpo libero', 'bodyweight', 'body weight', 'nessuna', 'nessuno', 'nessun attrezzo', 'none', 'no equipment', '-'];
  function eqKey(s) {
    var t = norm(s);
    if (!t || BW_WORDS.indexOf(t) >= 0) return BW;
    return t;
  }

  /* ---------------- lettura dei campi (formati diversi) ---------------- */
  var K = {
    id: ['id', 'ID', 'Id', 'codice', 'code', 'uid', 'slug'],
    nome: ['nome', 'name', 'titolo', 'title'],
    distretto: ['distretto', 'distretto_muscolare', 'distrettoMuscolare', 'distretti', 'muscoli', 'muscolo', 'gruppo_muscolare', 'gruppoMuscolare', 'muscle', 'muscles', 'muscle_group', 'muscleGroup', 'district', 'target'],
    categoria: ['categoria', 'category', 'tipo', 'type'],
    attrezzatura: ['attrezzatura', 'attrezzatura_necessaria', 'attrezzaturaNecessaria', 'attrezzi', 'attrezzo', 'equipment'],
    descrizione: ['descrizione', 'description', 'desc', 'sintesi', 'summary'],
    esecuzione: ['esecuzione', 'modalita_esecuzione', 'modalitaEsecuzione', 'modalità_esecuzione', 'istruzioni', 'instructions', 'execution', 'steps', 'cues'],
    immagine: ['immagine', 'image', 'img', 'foto', 'thumbnail', 'gif'],
    video: ['video', 'video_url', 'videoUrl'],
    livello: ['livello', 'level', 'difficolta', 'difficoltà', 'difficulty'],
    varianti: ['varianti', 'variants', 'variations'],
    regressioni: ['regressioni', 'regressione', 'regressions', 'regression'],
    progressioni: ['progressioni', 'progressione', 'progressions', 'progression'],
    sezione: ['hift', 'sezione', 'sezioni', 'uso', 'slot', 'slots', 'hift_slot', 'hiftSlot', 'stazione', 'blocco'],
    fonte: ['fonte', 'source', 'riferimento']
  };
  function pick(o, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = o[keys[i]];
      if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) return v;
    }
    return undefined;
  }
  function toList(v, splitter) {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map(function (x) {
      return x && typeof x === 'object' ? (x.id != null ? x.id : x.nome || x.name || '') : x;
    }).map(function (x) { return String(x).trim(); }).filter(Boolean);
    if (typeof v === 'object') return toList(Object.values(v), splitter);
    return String(v).split(splitter || /[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function safeUrl(u) {
    if (typeof u !== 'string') return '';
    u = u.trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^data:image\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''; // javascript:, file:, ecc. → scartati
    return u; // percorso relativo
  }
  function levelOf(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' || /^\s*\d+([.,]\d+)?\s*$/.test(String(v))) return { n: parseFloat(String(v).replace(',', '.')) };
    var t = norm(v);
    if (/princip|base|facile|beginner|easy|elementare/.test(t)) return { w: 1 };
    if (/intermed|medio|media|moderat/.test(t)) return { w: 2 };
    if (/avanz|difficil|advanced|hard|espert|expert/.test(t)) return { w: 3 };
    return null;
  }

  /* ---------------- normalizzazione dell'archivio ---------------- */
  function listFromRaw(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      var inner = raw.esercizi || raw.exercises || raw.items || raw.data || raw.archivio;
      if (Array.isArray(inner)) return inner;
      if (inner && typeof inner === 'object') raw = inner;
      return Object.keys(raw).map(function (k) {
        var o = raw[k];
        if (o && typeof o === 'object' && pick(o, K.id) == null) { o = Object.assign({ id: k }, o); }
        return o;
      });
    }
    return null;
  }

  function normalizeArchive(raw, meta) {
    var list = listFromRaw(raw);
    var report = { total: 0, valid: 0, invalid: [], duplicates: [], sameName: [], perSlot: {}, unclassified: [], noLevel: 0, equipment: [], warnings: [] };
    Object.keys(SLOT_NAMES).forEach(function (k) { report.perSlot[k] = 0; });
    if (!list) {
      report.warnings.push('Formato non riconosciuto: serve un elenco (array) di esercizi oppure un oggetto con "esercizi".');
      return { ok: false, exercises: [], byId: {}, report: report, eqLabels: {}, meta: meta || {} };
    }
    report.total = list.length;
    var byId = {}, exercises = [], eqLabels = {}, eqCount = {}, nameSeen = {}, rawLevels = [];
    list.forEach(function (o, i) {
      if (!o || typeof o !== 'object') { report.invalid.push({ index: i, motivo: 'voce non valida' }); return; }
      var id = pick(o, K.id), nome = pick(o, K.nome);
      if (id == null || String(id).trim() === '') { report.invalid.push({ index: i, nome: nome || '', motivo: 'ID mancante' }); return; }
      id = String(id).trim();
      if (!nome) { report.invalid.push({ index: i, id: id, motivo: 'nome mancante' }); return; }
      if (byId[id]) { report.duplicates.push(id); return; }
      var eqRaw = pick(o, K.attrezzatura);
      if (eqRaw == null) { report.invalid.push({ index: i, id: id, nome: String(nome), motivo: 'attrezzatura non indicata' }); return; }
      // ogni voce è un requisito; "a | b" o "a o b" = alternative
      var reqs = toList(eqRaw, /[,;+\n]+/).map(function (item) {
        var alts = item.split(/\s*(?:\||\/|\boppure\b|\bo\b|\bor\b)\s*/i).map(function (a) { return a.trim(); }).filter(Boolean);
        return alts.map(function (a) {
          var k = eqKey(a);
          if (!eqLabels[k]) eqLabels[k] = k === BW ? 'Corpo libero' : a.charAt(0).toUpperCase() + a.slice(1);
          return k;
        });
      }).filter(function (r) { return r.length; });
      if (!reqs.length) reqs = [[BW]];
      if (!eqLabels[BW]) eqLabels[BW] = 'Corpo libero';
      var distretti = toList(pick(o, K.distretto));
      var categoria = pick(o, K.categoria);
      categoria = categoria == null ? '' : String(Array.isArray(categoria) ? categoria.join(', ') : categoria);
      var slots = {}, primary = null;
      var explicit = toList(pick(o, K.sezione));
      if (explicit.length) {
        explicit.forEach(function (s) { var k = slotOf(s); if (k) { slots[k] = 1; if (!primary) primary = k; } });
      }
      if (!primary) {
        distretti.forEach(function (d) { var k = slotOf(d); if (k) { slots[k] = 1; if (!primary) primary = k; } });
        var kc = slotOf(categoria);
        if (kc) { slots[kc] = 1; if (!primary) primary = kc; }
      }
      var media = o.media && typeof o.media === 'object' ? o.media : {};
      var esec = pick(o, K.esecuzione);
      var lv = levelOf(pick(o, K.livello));
      if (lv && lv.n != null) rawLevels.push(lv.n);
      var ex = {
        id: id,
        nome: String(nome).trim(),
        distretti: distretti,
        distretto: distretti.join(', '),
        categoria: categoria,
        attrezzatura: reqs,
        descrizione: String(pick(o, K.descrizione) || ''),
        esecuzione: Array.isArray(esec) ? esec.map(String) : esec ? String(esec).split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean) : [],
        immagine: safeUrl(pick(o, K.immagine) || pick(media, K.immagine)),
        video: safeUrl(pick(o, K.video) || pick(media, K.video)),
        _lv: lv,
        livello: null,
        varianti: toList(pick(o, K.varianti)),
        regressioni: toList(pick(o, K.regressioni)),
        progressioni: toList(pick(o, K.progressioni)),
        slots: slots,
        primary: primary,
        fonte: String(pick(o, K.fonte) || '')
      };
      byId[id] = ex;
      exercises.push(ex);
      reqs.forEach(function (r) { r.forEach(function (k) { eqCount[k] = (eqCount[k] || 0) + 1; }); });
      var nn = norm(ex.nome);
      if (nameSeen[nn]) report.sameName.push(nameSeen[nn] + ' / ' + id); else nameSeen[nn] = id;
    });
    // livelli numerici: scala 1–3 (se l'archivio usa 1–5 o 1–10 viene riportata)
    var maxLv = rawLevels.length ? Math.max.apply(null, rawLevels) : 3;
    exercises.forEach(function (ex) {
      var lv = ex._lv; delete ex._lv;
      if (!lv) { ex.livello = null; report.noLevel++; }
      else if (lv.w) ex.livello = lv.w;
      else ex.livello = maxLv <= 3 ? Math.min(3, Math.max(1, Math.round(lv.n))) : Math.min(3, Math.max(1, Math.ceil(lv.n * 3 / maxLv)));
      Object.keys(ex.slots).forEach(function (k) { report.perSlot[k]++; });
      if (!ex.primary) report.unclassified.push(ex.id);
    });
    // famiglie: varianti / regressioni / progressioni dello stesso esercizio
    var parent = {};
    function find(x) { while (parent[x] && parent[x] !== x) x = parent[x]; return x; }
    function unite(a, b) { a = find(a); b = find(b); if (a !== b) parent[b] = a; }
    var byName = {};
    exercises.forEach(function (ex) { parent[ex.id] = ex.id; });
    // stesso nome = stesso esercizio (magari con un altro attrezzo): mai due volte nella stessa scheda
    exercises.forEach(function (ex) { var nn = norm(ex.nome); if (byName[nn]) unite(byName[nn], ex.id); else byName[nn] = ex.id; });
    exercises.forEach(function (ex) {
      ex.varianti.concat(ex.regressioni, ex.progressioni).forEach(function (ref) {
        var other = byId[ref] ? ref : byName[norm(ref)];
        if (other) unite(ex.id, other);
      });
    });
    exercises.forEach(function (ex) { ex.famiglia = find(ex.id); });
    report.valid = exercises.length;
    report.equipment = Object.keys(eqCount).sort(function (a, b) {
      return a === BW ? -1 : b === BW ? 1 : eqLabels[a].localeCompare(eqLabels[b], 'it');
    }).map(function (k) { return { key: k, label: eqLabels[k], count: eqCount[k] }; });
    if (report.duplicates.length) report.warnings.push(report.duplicates.length + ' ID duplicati ignorati (tenuta la prima voce): ' + report.duplicates.slice(0, 5).join(', '));
    if (report.invalid.length) report.warnings.push(report.invalid.length + ' voci scartate perché incomplete (ID, nome o attrezzatura mancanti).');
    if (report.unclassified.length) report.warnings.push(report.unclassified.length + ' esercizi senza distretto riconoscibile per il metodo HIFT (non usati nella programmazione).');
    if (report.noLevel) report.warnings.push(report.noLevel + ' esercizi senza livello: considerati adatti a tutti i livelli.');
    if (report.sameName.length) report.warnings.push(report.sameName.length + ' nomi ripetuti con ID diversi (trattati come varianti, mai insieme nella stessa scheda): ' + report.sameName.slice(0, 3).join('; ') + '.');
    // descrizioni degli attrezzi e fonti, se l'archivio le fornisce
    var eqInfo = {}, fonti = [];
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      if (raw.attrezzi && typeof raw.attrezzi === 'object') Object.keys(raw.attrezzi).forEach(function (k) { if (raw.attrezzi[k]) eqInfo[eqKey(k)] = String(raw.attrezzi[k]); });
      if (Array.isArray(raw.fonti)) fonti = raw.fonti.filter(function (f) { return f && typeof f === 'object'; }).map(function (f) {
        return { nome: String(f.atlante || f.nome || f.name || ''), url: safeUrl(f.artifact || f.url || ''), esercizi: +f.esercizi || null };
      });
    }
    return { ok: exercises.length > 0, exercises: exercises, byId: byId, report: report, eqLabels: eqLabels, eqInfo: eqInfo, fonti: fonti, meta: meta || {} };
  }

  /* ---------------- compatibilità ---------------- */
  function toSet(a) { return a instanceof Set ? a : new Set(a || []); }
  function eqOk(ex, eqSet) {
    return ex.attrezzatura.every(function (req) { return req.some(function (k) { return k === BW || eqSet.has(k); }); });
  }
  function missingEq(ex, eqSet) {
    var miss = [];
    ex.attrezzatura.forEach(function (req) {
      if (!req.some(function (k) { return k === BW || eqSet.has(k); })) miss.push(req);
    });
    return miss;
  }
  function usable(ex, ctx) {
    return !!ex && eqOk(ex, ctx.eq) && (ex.livello == null || ex.livello <= ctx.level) && !ctx.exclude.has(ex.id);
  }
  function makeCtx(c) {
    c = c || {};
    return {
      eq: toSet(c.eq),
      level: Math.min(3, Math.max(1, +c.level || 1)),
      goal: c.goal || '',
      exclude: toSet(c.exclude),
      prefer: toSet(c.prefer),
      history: Array.isArray(c.history) ? c.history : [],
      seed: c.seed
    };
  }
  function fits(ex, slot, strict) {
    return strict ? ex.primary === slot : !!ex.slots[slot];
  }

  /* ---------------- casualità riproducibile ---------------- */
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function histAge(history) {
    var m = new Map();
    history.forEach(function (ids, i) { (ids || []).forEach(function (id) { if (!m.has(id)) m.set(id, i); }); });
    return m;
  }
  function weightOf(ex, ctx, age, cats) {
    var w = 1, a = age.get(ex.id);
    if (a === 0) w *= 0.15; else if (a != null && a < 3) w *= 0.4; else if (a != null && a < 6) w *= 0.75;
    if (ctx.prefer.has(ex.id)) w *= 2.2;
    if (ex.livello != null && ex.livello === ctx.level) w *= 1.4;
    if (cats && ex.categoria && cats.has(norm(ex.categoria))) w *= 0.5;
    return w;
  }
  function wpick(list, wf, r) {
    var tot = 0, ws = list.map(function (e) { var w = wf(e); tot += w; return w; });
    var x = r() * tot;
    for (var i = 0; i < list.length; i++) { x -= ws[i]; if (x <= 0) return list[i]; }
    return list[list.length - 1];
  }

  /* candidati per uno slot, con livelli di tolleranza crescenti */
  function candidates(arch, ctx, slot, taken) {
    var usedIds = new Set(), fams = new Set();
    (taken || []).forEach(function (id) { var e = arch.byId[id]; usedIds.add(id); if (e) fams.add(e.famiglia); });
    var ok = arch.exercises.filter(function (e) { return usable(e, ctx) && !usedIds.has(e.id); });
    var tiers = [
      { list: ok.filter(function (e) { return fits(e, slot, true) && !fams.has(e.famiglia); }), note: '' },
      { list: ok.filter(function (e) { return fits(e, slot, true); }), note: 'variante di un esercizio già presente: nell\'archivio non ci sono alternative diverse' },
      { list: ok.filter(function (e) { return fits(e, slot, false) && !fams.has(e.famiglia); }), note: 'distretto ' + SLOT_NAMES[slot].toLowerCase() + ' come muscolo secondario: nell\'archivio manca un esercizio specifico compatibile' },
      { list: ok.filter(function (e) { return fits(e, slot, false); }), note: 'distretto secondario e variante di un esercizio già presente' }
    ];
    for (var i = 0; i < tiers.length; i++) if (tiers[i].list.length) return tiers[i];
    return { list: [], note: '' };
  }

  /* alternative reali quando uno slot non si può coprire */
  function alternativesFor(arch, ctx, slot) {
    var out = [];
    arch.exercises.forEach(function (e) {
      if (!fits(e, slot, false)) return;
      var reasons = [];
      var miss = missingEq(e, ctx.eq);
      if (miss.length) reasons.push('richiede ' + miss.map(function (r) { return r.map(function (k) { return arch.eqLabels[k] || k; }).join(' o '); }).join(' + '));
      if (e.livello != null && e.livello > ctx.level) reasons.push('livello ' + ['', 'principiante', 'intermedio', 'avanzato'][e.livello]);
      if (ctx.exclude.has(e.id)) reasons.push('escluso da te');
      if (reasons.length) out.push({ id: e.id, nome: e.nome, motivo: reasons.join(', '), peso: miss.length * 2 + reasons.length });
    });
    return out.sort(function (a, b) { return a.peso - b.peso; }).slice(0, 5);
  }

  function emptyIssue(arch, ctx, part, index, slot) {
    var alt = alternativesFor(arch, ctx, slot);
    return {
      level: 'error', part: part, index: index,
      msg: (slot === 'core' ? 'CORE' : 'Stazione ' + (index + 1) + ' · ' + SLOT_NAMES[slot]) +
        ': nessun esercizio dell\'archivio è compatibile con attrezzatura e livello selezionati.' +
        (alt.length ? ' Puoi aggiungere l\'attrezzatura indicata per una di queste alternative.' : ' L\'archivio non contiene esercizi per questo distretto.'),
      alternatives: alt
    };
  }

  /* ---------------- metodi del circuito ---------------- */
  var METHODS = Object.freeze({
    tempo: { n: 'Circuito a tempo', d: 'Lavoro e recupero a tempo su ogni stazione, per più giri.' },
    intervalli: { n: 'Circuito a intervalli', d: 'Più serie a intervalli su ogni stazione prima di cambiare.' },
    fisso: { n: 'Circuito a tempo fisso', d: 'Durata complessiva stabilita, distribuita sulle 5 stazioni.' },
    ripetizioni: { n: 'Circuito a ripetizioni', d: 'Numero di ripetizioni per stazione, recupero tra le stazioni.' },
    personalizzato: { n: 'Circuito personalizzato', d: 'Parametri impostati a mano, anche diversi per ogni stazione.' }
  });
  var LIM = {
    lavoro: [5, 600], recupero: [0, 600], cambio: [0, 600], serie: [1, 20], giri: [1, 20], recGiri: [0, 900],
    durata: [5, 120], pctLavoro: [20, 95], rip: [1, 200], secRip: [1, 10]
  };
  function cl(v, k, d) { v = Math.round(+v); if (!isFinite(v)) v = d; return Math.min(LIM[k][1], Math.max(LIM[k][0], v)); }

  function defaultParams(method, level, goal) {
    var L = Math.min(3, Math.max(1, +level || 1));
    var giri = L === 1 ? 2 : 3;
    switch (method) {
      case 'intervalli': return { lavoro: goal === 'potenza' ? 20 : 30, recupero: goal === 'potenza' ? 40 : 15, serie: L === 1 ? 2 : 3, cambio: 30, giri: L === 1 ? 1 : 2, recGiri: 60 };
      case 'fisso': return { durata: L === 1 ? 15 : 20, giri: L === 1 ? 3 : 4, pctLavoro: L === 1 ? 50 : 67 };
      case 'ripetizioni': return { rip: goal === 'forza' ? 8 : L === 1 ? 10 : 12, cambio: L === 1 ? 45 : 30, giri: giri, recGiri: 90, secRip: 3 };
      case 'personalizzato': return { lavoro: 40, recupero: 20, serie: 1, giri: giri, recGiri: 60, secRip: 3 };
      default: return goal === 'resistenza' || goal === 'dimagrimento'
        ? { lavoro: L === 1 ? 30 : 40, recupero: L === 1 ? 30 : 20, giri: giri, recGiri: 60 }
        : { lavoro: L === 1 ? 30 : 40, recupero: L === 1 ? 30 : 20, giri: giri, recGiri: 90 };
    }
  }
  function sanitizeParams(method, p, level, goal) {
    var d = defaultParams(method, level, goal), o = {};
    p = p || {};
    Object.keys(d).forEach(function (k) { o[k] = cl(p[k] != null ? p[k] : d[k], k, d[k]); });
    return o;
  }
  function sanitizeOverride(ov, P) {
    ov = ov || {};
    var o = { tipo: ov.tipo === 'rip' ? 'rip' : 'tempo' };
    o.lavoro = cl(ov.lavoro != null ? ov.lavoro : (P.lavoro || 40), 'lavoro', 40);
    o.rip = cl(ov.rip != null ? ov.rip : (P.rip || 12), 'rip', 12);
    o.serie = cl(ov.serie != null ? ov.serie : (P.serie || 1), 'serie', 1);
    o.recupero = cl(ov.recupero != null ? ov.recupero : (P.recupero != null ? P.recupero : 20), 'recupero', 20);
    return o;
  }

  /* configurazione per stazione derivata dal metodo */
  function stationPlan(circ) {
    var m = circ.metodo, P = circ.params;
    var st = (circ.stazioni || []).map(function (s) {
      if (m === 'tempo') return { tipo: 'tempo', lavoro: P.lavoro, serie: 1, recSerie: 0, recStaz: P.recupero };
      if (m === 'intervalli') return { tipo: 'tempo', lavoro: P.lavoro, serie: P.serie, recSerie: P.recupero, recStaz: P.cambio };
      if (m === 'fisso') {
        var slot = Math.floor(P.durata * 60 / (P.giri * 5));
        var w = Math.max(5, Math.round(slot * P.pctLavoro / 100));
        return { tipo: 'tempo', lavoro: w, serie: 1, recSerie: 0, recStaz: Math.max(0, slot - w) };
      }
      if (m === 'ripetizioni') {
        var r = s.ov && s.ov.rip ? cl(s.ov.rip, 'rip', P.rip) : P.rip;
        return { tipo: 'rip', rip: r, stima: r * P.secRip, serie: 1, recSerie: 0, recStaz: P.cambio };
      }
      var ov = sanitizeOverride(s.ov, P);
      return ov.tipo === 'rip'
        ? { tipo: 'rip', rip: ov.rip, stima: ov.rip * P.secRip, serie: ov.serie, recSerie: ov.recupero, recStaz: ov.recupero }
        : { tipo: 'tempo', lavoro: ov.lavoro, serie: ov.serie, recSerie: ov.recupero, recStaz: ov.recupero };
    });
    var giri = P.giri, recGiri = m === 'fisso' ? null : P.recGiri;
    return { st: st, giri: giri, recGiri: recGiri, finale: m === 'fisso' };
  }

  /* sequenza completa: unica fonte per durata e timer */
  function expandCore() {
    var out = [];
    for (var e = 0; e < CORE_RULES.esercizi; e++)
      for (var s = 1; s <= CORE_RULES.serie; s++) {
        out.push({ part: 'core', index: e, set: s, sets: CORE_RULES.serie, kind: 'work', dur: CORE_RULES.lavoro });
        out.push({ part: 'core', index: e, set: s, sets: CORE_RULES.serie, kind: 'rest', dur: CORE_RULES.recupero, why: s < CORE_RULES.serie ? 'serie' : e < CORE_RULES.esercizi - 1 ? 'esercizio' : 'fine' });
      }
    return out;
  }
  function expandCircuit(circ) {
    var sp = stationPlan(circ), out = [], n = sp.st.length;
    for (var r = 1; r <= sp.giri; r++)
      for (var i = 0; i < n; i++) {
        var c = sp.st[i];
        for (var s = 1; s <= c.serie; s++) {
          out.push(c.tipo === 'rip'
            ? { part: 'circ', index: i, set: s, sets: c.serie, round: r, rounds: sp.giri, kind: 'work', reps: c.rip, dur: c.stima, est: true }
            : { part: 'circ', index: i, set: s, sets: c.serie, round: r, rounds: sp.giri, kind: 'work', dur: c.lavoro });
          var rest = null, why = '';
          if (s < c.serie) { rest = c.recSerie; why = 'serie'; }
          else if (i < n - 1) { rest = c.recStaz; why = 'stazione'; }
          else if (r < sp.giri) { rest = sp.finale ? c.recStaz : sp.recGiri; why = 'giro'; }
          else if (sp.finale) { rest = c.recStaz; why = 'fine'; }
          if (rest) out.push({ part: 'circ', index: i, set: s, sets: c.serie, round: r, rounds: sp.giri, kind: 'rest', dur: rest, why: why });
        }
      }
    return out;
  }
  function durations(plan) {
    var core = expandCore().reduce(function (a, s) { return a + s.dur; }, 0);
    var seq = expandCircuit(plan.circuito);
    var circ = seq.reduce(function (a, s) { return a + s.dur; }, 0);
    var work = seq.filter(function (s) { return s.kind === 'work'; }).reduce(function (a, s) { return a + s.dur; }, 0);
    return { core: core, circuito: circ, lavoroCircuito: work, totale: core + circ, stimata: seq.some(function (s) { return s.est; }) };
  }

  /* ---------------- generazione ---------------- */
  function newPlan(ctx, method, params) {
    var m = METHODS[method] ? method : 'tempo';
    return {
      v: 1,
      core: { esercizi: [], serie: CORE_RULES.serie, lavoro: CORE_RULES.lavoro, recupero: CORE_RULES.recupero },
      circuito: { metodo: m, params: sanitizeParams(m, params, ctx.level, ctx.goal), stazioni: STATIONS.map(function (s) { return { k: s.k, id: null, pin: false, ov: null }; }) },
      issues: []
    };
  }
  function allIds(plan, skip) {
    var ids = [];
    plan.core.esercizi.forEach(function (x, i) { if (x && x.id && skip !== 'c' + i) ids.push(x.id); });
    plan.circuito.stazioni.forEach(function (x, i) { if (x && x.id && skip !== 's' + i) ids.push(x.id); });
    return ids;
  }
  /* riempie gli slot non bloccati. which: 'all' | 'core' | 'circuito' */
  function fill(plan, arch, ctxIn, which, opt) {
    var ctx = ctxIn.eq instanceof Set ? ctxIn : makeCtx(ctxIn);
    opt = opt || {};
    var r = rng(ctx.seed || ((Date.now() % 1e9) | 1));
    var age = histAge(ctx.history);
    var keepPins = opt.keepPins !== false;
    var doCore = which === 'all' || which === 'core', doCirc = which === 'all' || which === 'circuito';
    // svuota gli slot da rigenerare (quelli bloccati restano)
    if (doCore) for (var i = 0; i < CORE_RULES.esercizi; i++) {
      var c = plan.core.esercizi[i];
      if (!(c && c.pin && keepPins && arch.byId[c.id])) plan.core.esercizi[i] = null;
    }
    if (doCirc) plan.circuito.stazioni.forEach(function (s) { if (!(s.pin && keepPins && arch.byId[s.id])) { s.id = null; s.pin = false; s.nota = ''; } });
    var cats = new Set();
    plan.core.esercizi.forEach(function (x) { var e = x && arch.byId[x.id]; if (e && e.categoria) cats.add(norm(e.categoria)); });
    if (doCore) for (var j = 0; j < CORE_RULES.esercizi; j++) {
      if (plan.core.esercizi[j]) continue;
      var t = candidates(arch, ctx, 'core', allIds(plan));
      if (!t.list.length) { plan.core.esercizi[j] = null; continue; }
      var e = wpick(t.list, function (x) { return weightOf(x, ctx, age, cats); }, r);
      if (e.categoria) cats.add(norm(e.categoria));
      plan.core.esercizi[j] = { id: e.id, pin: false, nota: t.note };
    }
    if (doCirc) plan.circuito.stazioni.forEach(function (s) {
      if (s.id) return;
      var t = candidates(arch, ctx, s.k, allIds(plan));
      if (!t.list.length) return;
      var e = wpick(t.list, function (x) { return weightOf(x, ctx, age, null); }, r);
      s.id = e.id; s.nota = t.note;
    });
    plan.issues = check(plan, arch, ctx);
    return plan;
  }
  function generate(arch, ctxIn, method, params) {
    var ctx = makeCtx(ctxIn);
    var plan = newPlan(ctx, method, params);
    plan.seed = ctx.seed || ((Date.now() % 1e9) | 1);
    ctx.seed = plan.seed;
    return fill(plan, arch, ctx, 'all');
  }
  /* cambia un solo esercizio, senza toccare gli altri */
  function swap(plan, arch, ctxIn, part, index, seed) {
    var ctx = makeCtx(ctxIn);
    var slot = part === 'core' ? 'core' : plan.circuito.stazioni[index].k;
    var cur = part === 'core' ? plan.core.esercizi[index] : plan.circuito.stazioni[index];
    var taken = allIds(plan, (part === 'core' ? 'c' : 's') + index);
    if (cur && cur.id) taken.push(cur.id);
    var t = candidates(arch, ctx, slot, taken);
    if (!t.list.length) return false;
    var age = histAge(ctx.history);
    var e = wpick(t.list, function (x) { return weightOf(x, ctx, age, null); }, rng(seed || ((Date.now() % 1e9) | 1)));
    setItem(plan, part, index, e.id, false, t.note);
    plan.issues = check(plan, arch, ctx);
    return true;
  }
  function setItem(plan, part, index, id, manual, note) {
    if (part === 'core') plan.core.esercizi[index] = { id: id, pin: !!manual, nota: note || '' };
    else { var s = plan.circuito.stazioni[index]; s.id = id; s.pin = !!manual; s.nota = note || ''; }
  }
  /* elenco per la scelta manuale */
  function options(plan, arch, ctxIn, part, index) {
    var ctx = makeCtx(ctxIn);
    var slot = part === 'core' ? 'core' : plan.circuito.stazioni[index].k;
    var taken = new Set(allIds(plan, (part === 'core' ? 'c' : 's') + index));
    var fams = new Set(); taken.forEach(function (id) { var e = arch.byId[id]; if (e) fams.add(e.famiglia); });
    var age = histAge(ctx.history);
    return arch.exercises.filter(function (e) { return fits(e, slot, false) && usable(e, ctx) && !taken.has(e.id); })
      .map(function (e) {
        var n = [];
        if (!fits(e, slot, true)) n.push('distretto secondario');
        if (fams.has(e.famiglia)) n.push('variante di un esercizio già presente');
        if (age.get(e.id) === 0) n.push('usato nell\'ultima scheda');
        return { id: e.id, nome: e.nome, note: n, primario: fits(e, slot, true) };
      })
      .sort(function (a, b) { return (b.primario - a.primario) || (a.note.length - b.note.length) || a.nome.localeCompare(b.nome, 'it'); });
  }

  /* ---------------- controllo della scheda ---------------- */
  function check(plan, arch, ctxIn) {
    var ctx = ctxIn.eq instanceof Set ? ctxIn : makeCtx(ctxIn);
    var iss = [], seen = {};
    function verify(id, part, index, slot, label) {
      if (!id) { iss.push(emptyIssue(arch, ctx, part, index, slot)); return; }
      var e = arch.byId[id];
      if (!e) { iss.push({ level: 'error', part: part, index: index, msg: label + ': l\'esercizio "' + id + '" non esiste più nell\'archivio. Cambialo prima di iniziare.' }); return; }
      if (seen[id] != null) iss.push({ level: 'error', part: part, index: index, msg: label + ': "' + e.nome + '" è già presente nella scheda.' });
      seen[id] = 1;
      if (!eqOk(e, ctx.eq)) iss.push({ level: 'error', part: part, index: index, msg: label + ': "' + e.nome + '" richiede attrezzatura non selezionata (' + missingEq(e, ctx.eq).map(function (r) { return r.map(function (k) { return arch.eqLabels[k] || k; }).join(' o '); }).join(', ') + ').' });
      if (e.livello != null && e.livello > ctx.level) iss.push({ level: 'warn', part: part, index: index, msg: label + ': "' + e.nome + '" è di livello superiore al tuo.' });
      if (ctx.exclude.has(id)) iss.push({ level: 'warn', part: part, index: index, msg: label + ': "' + e.nome + '" è tra gli esercizi che hai escluso.' });
      if (!fits(e, slot, false)) iss.push({ level: 'error', part: part, index: index, msg: label + ': "' + e.nome + '" non lavora il distretto ' + SLOT_NAMES[slot].toLowerCase() + '.' });
      else if (!fits(e, slot, true)) iss.push({ level: 'warn', part: part, index: index, msg: label + ': "' + e.nome + '" ha ' + SLOT_NAMES[slot].toLowerCase() + ' come distretto secondario.' });
    }
    if (plan.core.esercizi.length !== CORE_RULES.esercizi) iss.push({ level: 'error', part: 'core', msg: 'Il CORE deve avere esattamente 3 esercizi.' });
    if (plan.core.serie !== CORE_RULES.serie || plan.core.lavoro !== CORE_RULES.lavoro || plan.core.recupero !== CORE_RULES.recupero)
      iss.push({ level: 'error', part: 'core', msg: 'Il CORE segue regole fisse: 4 serie, 30" di lavoro, 30" di recupero.' });
    for (var i = 0; i < CORE_RULES.esercizi; i++) { var c = plan.core.esercizi[i]; verify(c && c.id, 'core', i, 'core', 'CORE ' + (i + 1)); }
    var fam = {};
    plan.core.esercizi.forEach(function (c, i) {
      var e = c && arch.byId[c.id]; if (!e) return;
      if (fam[e.famiglia] != null) iss.push({ level: 'warn', part: 'core', index: i, msg: 'CORE ' + (i + 1) + ': "' + e.nome + '" è una variante di un altro esercizio del CORE.' });
      fam[e.famiglia] = i;
    });
    var st = plan.circuito.stazioni;
    if (st.length !== STATIONS.length || st.some(function (s, i) { return s.k !== STATIONS[i].k; }))
      iss.push({ level: 'error', part: 'circ', msg: 'Il circuito deve avere 5 stazioni nell\'ordine petto, quadricipiti, spalle, glutei, dorso.' });
    st.forEach(function (s, i) { verify(s.id, 'circ', i, s.k, 'Stazione ' + (i + 1) + ' · ' + SLOT_NAMES[s.k]); });
    if (!METHODS[plan.circuito.metodo]) iss.push({ level: 'error', part: 'circ', msg: 'Metodo del circuito non valido.' });
    if (plan.circuito.metodo === 'fisso') {
      var P = plan.circuito.params, slot = Math.floor(P.durata * 60 / (P.giri * 5));
      if (slot < 10) iss.push({ level: 'error', part: 'circ', msg: 'Tempo fisso: con ' + P.giri + ' giri in ' + P.durata + '\' ogni stazione avrebbe solo ' + slot + '". Riduci i giri o aumenta la durata.' });
      else if (slot * P.giri * 5 !== P.durata * 60) iss.push({ level: 'info', part: 'circ', msg: 'Tempo fisso: per dividere in modo uguale le stazioni la durata reale è ' + Math.floor(slot * P.giri * 5 / 60) + '\'' + String(slot * P.giri * 5 % 60).padStart(2, '0') + '".' });
    }
    return iss;
  }
  function blocking(plan) { return (plan.issues || []).some(function (x) { return x.level === 'error'; }); }

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return s ? m + '\'' + String(s).padStart(2, '0') + '"' : m + '\'';
  }

  return {
    CORE_RULES: CORE_RULES, STATIONS: STATIONS, SLOT_NAMES: SLOT_NAMES, METHODS: METHODS, LIM: LIM, BW: BW,
    normalizeArchive: normalizeArchive, eqKey: eqKey, norm: norm, makeCtx: makeCtx, usable: usable, eqOk: eqOk,
    defaultParams: defaultParams, sanitizeParams: sanitizeParams, sanitizeOverride: sanitizeOverride,
    generate: generate, fill: fill, swap: swap, setItem: setItem, options: options, check: check, blocking: blocking,
    expandCore: expandCore, expandCircuit: expandCircuit, stationPlan: stationPlan, durations: durations,
    alternativesFor: alternativesFor, fmt: fmt
  };
});
