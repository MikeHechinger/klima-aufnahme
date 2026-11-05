"use strict";
/* ---------- Speicher (IndexedDB, Fallback: Arbeitsspeicher) ---------- */
const DB = (() => {
  let dbp = null; const mem = new Map();
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res) => {
      try {
        const r = indexedDB.open("scheible-klima", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("aufnahmen", { keyPath: "id" });
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await open();
    if (!db) return fn(null);
    return new Promise((res, rej) => {
      const t = db.transaction("aufnahmen", mode); const st = t.objectStore("aufnahmen");
      const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  }
  return {
    async all() {
      const db = await open();
      if (!db) return [...mem.values()];
      return new Promise((res) => { const r = db.transaction("aufnahmen").objectStore("aufnahmen").getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); });
    },
    async put(rec) { const db = await open(); if (!db) { mem.set(rec.id, rec); return; } return tx("readwrite", (st) => st.put(rec)); },
    async del(id) { const db = await open(); if (!db) { mem.delete(id); return; } return tx("readwrite", (st) => st.delete(id)); },
  };
})();

/* ---------- Hilfen ---------- */
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v; else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
const pad = (n) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDate = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return d ? `${d}.${m}.${y}` : iso; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}
function confirmDialog(title, text, okLabel = "Löschen") {
  return new Promise((res) => {
    const close = (v) => { ov.remove(); res(v); };
    const ov = h("div", { class: "modal-bg", onclick: (e) => { if (e.target === ov) close(false); } },
      h("div", { class: "modal", role: "dialog", "aria-modal": "true" },
        h("h3", {}, title), h("p", {}, text),
        h("div", { class: "modal-actions" },
          h("button", { class: "btn btn-ghost", onclick: () => close(false) }, "Abbrechen"),
          h("button", { class: "btn btn-danger", onclick: () => close(true) }, okLabel))));
    document.body.append(ov);
  });
}

/* ---------- Zustand ---------- */
let current = null; let step = 0; let saveTimer = null;
function newRecord() {
  const d = new Date();
  return {
    id: uid(), created: d.toISOString(), updated: d.toISOString(), status: "Entwurf",
    data: {
      anfrage_bearbeiter: ls.get("bearbeiter") || "",
      raeume: [{ id: uid() }], fotos: {},
    },
  };
}
function save(immediate) {
  if (!current) return;
  clearTimeout(saveTimer);
  const run = async () => {
    current.updated = new Date().toISOString();
    try { await DB.put(current); setSaveState("Gespeichert"); } catch (e) { setSaveState("Speichern fehlgeschlagen"); }
  };
  setSaveState("Speichert …");
  if (immediate) return run();
  saveTimer = setTimeout(run, 350);
}
function setSaveState(t) { const el = $("#savestate"); if (el) el.textContent = t; }
function setVal(k, v) {
  current.data[k] = v;
  if (k === "anfrage_bearbeiter") ls.set("bearbeiter", v);
  save(); updateProgress();
}

/* ---------- Fortschritt ---------- */
function sectionFilled(sec) {
  const d = current.data;
  return sec.fields.some((f) => {
    if (f.t === "checklist") return f.items.some((_, i) => d[`${f.k}_${pad(i + 1)}`]);
    if (f.t === "rooms") return (d.raeume || []).some((r) => r.bezeichnung || r.flaeche_m2);
    if (f.t === "photos") return Object.values(d.fotos || {}).some((a) => a.length);
    const v = d[f.k]; return Array.isArray(v) ? v.length : !!v;
  });
}
function updateProgress() {
  document.querySelectorAll(".steps button").forEach((b, i) => b.classList.toggle("filled", sectionFilled(SCHEMA[i])));
}

/* ---------- Feld-Renderer ---------- */
function fieldEl(f, get, set, idPrefix = "") {
  const id = idPrefix + f.k;
  const lab = f.l ? h("label", { class: "flabel", for: id }, f.l, f.unit ? h("span", { class: "unit" }, ` (${f.unit})`) : null, f.req ? h("span", { class: "req" }, " *") : null) : null;
  const wrap = h("div", { class: `field w${f.w || 3}` });
  const val = get(f.k);
  if (["text", "tel", "email", "date", "time", "number"].includes(f.t)) {
    const attrs = { id, class: "input", value: val || "", placeholder: f.ph || "", autocomplete: f.ac || "off" };
    if (f.t === "number") Object.assign(attrs, { type: "text", inputmode: f.int ? "numeric" : "decimal", pattern: f.int ? "[0-9]*" : null });
    else attrs.type = f.t;
    if (f.t === "tel") attrs.inputmode = "tel";
    if (f.t === "email") { attrs.inputmode = "email"; attrs.autocapitalize = "off"; }
    const inp = h("input", attrs);
    inp.addEventListener("input", () => {
      if (f.t === "number") { const c = inp.value.replace(/[^0-9,.\-]/g, "").replace(".", ","); if (c !== inp.value) inp.value = c; }
      set(f.k, inp.value);
    });
    if (f.t === "date" || f.t === "time") {
      const nowVal = () => { const n = new Date(); return f.t === "date" ? today() : `${pad(n.getHours())}:${pad(n.getMinutes())}`; };
      const clr = h("button", { type: "button", class: "btn btn-ghost sm", "aria-label": `${f.l} leeren`, onclick: () => { inp.value = ""; set(f.k, ""); } }, "Leeren");
      const now = h("button", { type: "button", class: "btn btn-outline sm", onclick: () => { inp.value = nowVal(); set(f.k, inp.value); } }, f.t === "date" ? "Heute" : "Jetzt");
      inp.addEventListener("change", () => set(f.k, inp.value));
      wrap.append(lab, h("div", { class: "datewrap" }, inp, now, clr));
    } else
    wrap.append(lab, f.unit && f.t === "number" ? h("div", { class: "unitwrap" }, inp, h("span", {}, f.unit)) : inp);
  } else if (f.t === "textarea") {
    const ta = h("textarea", { id, class: "input", rows: 3, placeholder: f.ph || "" }); ta.value = val || "";
    ta.addEventListener("input", () => set(f.k, ta.value));
    wrap.append(lab, ta);
  } else if (f.t === "single" || f.t === "multi") {
    const multi = f.t === "multi";
    const grp = h("div", { class: "chips", role: multi ? "group" : "radiogroup", "aria-label": f.l });
    const sel = () => { const v = get(f.k); return multi ? (Array.isArray(v) ? v : []) : v; };
    const paint = () => grp.querySelectorAll("button").forEach((b) => {
      const on = multi ? sel().includes(b.dataset.v) : sel() === b.dataset.v;
      b.classList.toggle("on", on); b.setAttribute(multi ? "aria-pressed" : "aria-checked", on);
    });
    for (const o of f.o) grp.append(h("button", { type: "button", class: "chip", "data-v": o, role: multi ? null : "radio", onclick: () => {
      if (multi) { const a = [...sel()]; const i = a.indexOf(o); i >= 0 ? a.splice(i, 1) : a.push(o); set(f.k, a); }
      else set(f.k, sel() === o ? "" : o);
      paint();
    } }, h("span", { class: "tick", "aria-hidden": "true" }), o));
    paint();
    wrap.append(h("div", { class: "flabel" }, f.l, h("span", { class: "hint" }, multi ? "  Mehrfachauswahl" : "  eine Auswahl")), grp);
  } else if (f.t === "checklist") {
    wrap.classList.add("checklist");
    f.items.forEach((it, i) => {
      const key = `${f.k}_${pad(i + 1)}`;
      const seg = h("div", { class: "seg", role: "radiogroup", "aria-label": it });
      const paint = () => seg.querySelectorAll("button").forEach((b) => { const on = get(key) === b.dataset.v; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
      f.cols.forEach((cv) => {
        const v = cv.replace("ä", "ae");
        seg.append(h("button", { type: "button", role: "radio", "data-v": v, class: `seg-${v}`, onclick: () => { set(key, get(key) === v ? "" : v); paint(); } }, cv));
      });
      paint();
      const bem = h("input", { class: "input small", placeholder: "Bemerkung", value: get(`${key}_bem`) || "", "aria-label": `Bemerkung zu ${it}` });
      bem.addEventListener("input", () => set(`${key}_bem`, bem.value));
      wrap.append(h("div", { class: "crow" }, h("div", { class: "ctext" }, it), seg, bem));
    });
  } else if (f.t === "rooms") return roomsEl();
  else if (f.t === "photos") return photosEl(f);
  else if (f.t === "signature") return signatureEl(f);
  return wrap;
}

function roomsEl() {
  const box = h("div", { class: "rooms w3" });
  const render = () => {
    box.innerHTML = "";
    const rooms = current.data.raeume || (current.data.raeume = []);
    box.append(h("p", { class: "note" }, "Je Innengerät einen Raum anlegen. Dachgeschoss, große Südfenster oder starke Geräteabwärme unbedingt vermerken – diese Angaben bestimmen Kühllast und Gerätegröße."));
    rooms.forEach((r, idx) => {
      const card = h("div", { class: "card room" },
        h("div", { class: "room-head" }, h("h3", {}, `Raum ${idx + 1}${r.bezeichnung ? " – " + r.bezeichnung : ""}`),
          rooms.length > 1 ? h("button", { type: "button", class: "btn btn-ghost sm", onclick: async () => {
            if (await confirmDialog("Raum entfernen?", `Raum ${idx + 1} und alle Angaben dazu werden gelöscht.`, "Entfernen")) { rooms.splice(idx, 1); save(); render(); }
          } }, "Entfernen") : null));
      const grid = h("div", { class: "grid" });
      ROOM_FIELDS.forEach((f) => grid.append(fieldEl(f, (k) => r[k], (k, v) => { r[k] = v; save(); updateProgress(); if (k === "bezeichnung") card.querySelector("h3").textContent = `Raum ${idx + 1}${v ? " – " + v : ""}`; }, `r${idx}_`)));
      card.append(grid); box.append(card);
    });
    box.append(h("button", { type: "button", class: "btn btn-outline wide", onclick: () => { rooms.push({ id: uid() }); save(); render(); setTimeout(() => box.lastElementChild.previousElementSibling.scrollIntoView({ behavior: "smooth", block: "start" }), 50); } }, "+ Raum hinzufügen"));
  };
  render(); return box;
}

function resizeImage(file, max = 1600, q = 0.8) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      let { width: w, height: hh } = img; const s = Math.min(1, max / Math.max(w, hh)); w = Math.round(w * s); hh = Math.round(hh * s);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
      cv.getContext("2d").drawImage(img, 0, 0, w, hh); URL.revokeObjectURL(url);
      res({ data: cv.toDataURL("image/jpeg", q), w, h: hh });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Bild konnte nicht gelesen werden")); };
    img.src = url;
  });
}
function photosEl(f) {
  const box = h("div", { class: "photos w3" });
  const fotos = current.data.fotos || (current.data.fotos = {});
  box.append(h("p", { class: "note" }, "Foto antippen öffnet Kamera oder Mediathek. Bilder werden verkleinert und nur auf diesem iPad gespeichert."));
  for (const [cat, label] of f.cats) {
    const list = h("div", { class: "thumbs" });
    const paint = () => {
      list.innerHTML = "";
      (fotos[cat] || []).forEach((p, i) => list.append(h("div", { class: "thumb" }, h("img", { src: p.data, alt: `${label} ${i + 1}` }),
        h("button", { type: "button", class: "thumb-del", "aria-label": "Foto löschen", onclick: async () => {
          if (await confirmDialog("Foto löschen?", "Das Foto wird aus dieser Aufnahme entfernt.")) { fotos[cat].splice(i, 1); save(); paint(); updateProgress(); }
        } }, "×"))));
    };
    const inp = h("input", { type: "file", accept: "image/*", multiple: true, class: "sr-only", id: `foto_${cat}` });
    inp.addEventListener("change", async () => {
      const files = [...inp.files]; inp.value = "";
      for (const file of files) {
        try { const r = await resizeImage(file); (fotos[cat] = fotos[cat] || []).push({ id: uid(), ...r }); } catch (e) { toast(e.message); }
      }
      save(); paint(); updateProgress();
    });
    paint();
    box.append(h("div", { class: "card photo-cat" },
      h("div", { class: "room-head" }, h("h3", {}, label), h("label", { class: "btn btn-primary sm", for: `foto_${cat}` }, "Foto hinzufügen")), inp, list));
  }
  return box;
}

function signatureEl(f) {
  const wrap = h("div", { class: "field w3 sig" });
  const cv = h("canvas", { class: "sigpad", "aria-label": f.l });
  const ctx = cv.getContext("2d");
  let drawing = false, dirty = false, last = null;
  const fit = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#003c77";
    const v = current.data[f.k]; if (v) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, r.width, r.height); im.src = v; }
  };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; last = pos(e); ctx.beginPath(); ctx.arc(last[0], last[1], 1, 0, 7); ctx.fillStyle = "#003c77"; ctx.fill(); });
  cv.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; dirty = true; });
  const end = () => { if (!drawing) return; drawing = false; current.data[f.k] = cv.toDataURL("image/png"); save(); updateProgress(); };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  wrap.append(h("div", { class: "flabel" }, f.l), cv,
    h("div", { class: "sig-actions" }, h("span", { class: "hint" }, "Mit Finger oder Pencil unterschreiben"),
      h("button", { type: "button", class: "btn btn-ghost sm", onclick: () => { ctx.clearRect(0, 0, cv.width, cv.height); delete current.data[f.k]; save(); } }, "Löschen")));
  requestAnimationFrame(fit); new ResizeObserver(() => fit()).observe(cv);
  return wrap;
}

/* ---------- Ansichten ---------- */
async function showList() {
  current = null; document.body.dataset.view = "list";
  const main = $("#main"); main.innerHTML = "";
  $("#topbar-actions").innerHTML = "";
  const recs = (await DB.all()).sort((a, b) => b.updated.localeCompare(a.updated));
  main.append(h("section", { class: "list" },
    h("div", { class: "list-head" }, h("div", {}, h("h1", {}, "Aufnahme Kundenwunsch Klimaanlage"), h("p", { class: "muted" }, "Datenerfassung zur Angebotserstellung")),
      h("button", { class: "btn btn-primary lg", onclick: async () => { current = newRecord(); await DB.put(current); openRecord(current, 0); } }, "+ Neue Aufnahme")),
    recs.length ? h("div", { class: "records" }, recs.map((r) => h("div", { class: "card rec" },
      h("button", { class: "rec-main", onclick: () => openRecord(r, 0) },
        h("div", { class: "rec-title" }, r.data.kunde_name || "Ohne Kundenname"),
        h("div", { class: "rec-meta" }, `${r.data.anfrage_nr || ""} · ${r.data.kunde_plz_ort || "Ort offen"} · geändert ${new Date(r.updated).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}`)),
      h("span", { class: `badge ${r.status === "Abgeschlossen" ? "done" : ""}` }, r.status),
      h("button", { class: "btn btn-ghost sm", "aria-label": "Aufnahme löschen", onclick: async () => {
        if (await confirmDialog("Aufnahme löschen?", `„${r.data.kunde_name || r.data.anfrage_nr}“ wird mit allen Fotos und Unterschriften von diesem iPad gelöscht.`)) { await DB.del(r.id); showList(); }
      } }, "Löschen"))))
      : h("div", { class: "empty card" }, h("h3", {}, "Noch keine Aufnahmen"), h("p", {}, "Tippe auf „Neue Aufnahme“, um einen Kundenwunsch zu erfassen. Alle Angaben werden automatisch auf diesem iPad gespeichert – auch ohne Internet.")),
    h("p", { class: "muted small" }, "Daten bleiben ausschließlich auf diesem Gerät, bis sie über „Abschluss → Teilen“ exportiert werden.")));
}

function openRecord(rec, s) {
  current = rec; step = s; document.body.dataset.view = "form";
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  $("#topbar-actions").innerHTML = "";
  $("#topbar-actions").append(h("span", { id: "savestate", class: "muted small" }, "Gespeichert"),
    h("button", { class: "btn btn-ghost sm", onclick: async () => { await save(true); showList(); } }, "Übersicht"));
  renderStep();
}

function renderStep() {
  const main = $("#main"); main.innerHTML = "";
  const sec = SCHEMA[step];
  const steps = h("nav", { class: "steps", "aria-label": "Abschnitte" }, SCHEMA.map((s, i) =>
    h("button", { type: "button", class: i === step ? "active" : "", "aria-current": i === step ? "step" : null, onclick: () => { step = i; renderStep(); } },
      h("span", { class: "num" }, i + 1), s.title)));
  const grid = h("div", { class: "grid" });
  sec.fields.forEach((f) => grid.append(fieldEl(f, (k) => current.data[k], setVal)));
  const body = h("section", { class: "form-sec" }, h("h2", {}, `${step + 1}  ${sec.title}`), grid);
  if (sec.id === "abschluss") body.append(exportPanel());
  const nav = h("div", { class: "bottomnav" },
    h("button", { class: "btn btn-ghost", disabled: step === 0, onclick: () => { step--; renderStep(); } }, "← Zurück"),
    h("span", { class: "muted small" }, `${step + 1} / ${SCHEMA.length}`),
    step < SCHEMA.length - 1 ? h("button", { class: "btn btn-primary", onclick: () => { step++; renderStep(); } }, "Weiter →")
      : h("button", { class: "btn btn-primary", onclick: async () => { await save(true); showList(); } }, "Fertig"));
  main.append(steps, body, nav);
  updateProgress();
  steps.querySelector(".active").scrollIntoView({ inline: "center", block: "nearest" });
  window.scrollTo(0, 0);
}

function exportPanel() {
  const missing = [];
  if (!current.data.kunde_name) missing.push("Kundenname");
  if (!current.data.kunde_telefon && !current.data.kunde_mobil && !current.data.kunde_email) missing.push("Telefon oder E-Mail");
  if (!(current.data.raeume || []).some((r) => r.flaeche_m2)) missing.push("mindestens eine Raumfläche");
  const status = h("p", { class: "muted small", id: "exportstate" });
  return h("div", { class: "card export" },
    h("h3", {}, "Exportieren und teilen"),
    missing.length ? h("p", { class: "warn" }, `Für ein gutes Angebot fehlen noch: ${missing.join(", ")}.`) : h("p", { class: "ok" }, "Alle Kernangaben sind erfasst."),
    h("p", { class: "muted small" }, "Erzeugt ein PDF (für Kunde und Ablage, mit Fotos und Unterschriften) und eine JSON-Datei mit allen Daten für die KI-Angebotserstellung."),
    h("div", { class: "export-actions" },
      h("button", { class: "btn btn-primary lg", onclick: () => doExport("share", status) }, "PDF + KI-Daten teilen"),
      h("button", { class: "btn btn-outline", onclick: () => doExport("pdf", status) }, "Nur PDF herunterladen"),
      h("button", { class: "btn btn-outline", onclick: () => doExport("json", status) }, "Nur KI-Daten herunterladen")),
    h("label", { class: "donebox" }, (() => { const c = h("input", { type: "checkbox" }); c.checked = current.status === "Abgeschlossen"; c.addEventListener("change", () => { current.status = c.checked ? "Abgeschlossen" : "Entwurf"; save(); }); return c; })(), " Aufnahme als abgeschlossen markieren"),
    status);
}

/* ---------- Export ---------- */
function num(v) { if (v == null || v === "") return null; const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? v : n; }
function buildJSON(rec) {
  const d = rec.data; const felder = {}; const abschnitte = [];
  for (const sec of SCHEMA) {
    const eintraege = [];
    for (const f of sec.fields) {
      if (f.t === "checklist") f.items.forEach((it, i) => {
        const key = `${f.k}_${pad(i + 1)}`; const v = d[key] || null; const b = d[`${key}_bem`] || null;
        felder[key] = v; if (b) felder[`${key}_bem`] = b;
        eintraege.push({ schluessel: key, frage: it, antwort: v === "klaeren" ? "klären" : v, bemerkung: b });
      });
      else if (f.t === "rooms" || f.t === "photos") continue;
      else if (f.t === "signature") { felder[f.k] = !!d[f.k]; eintraege.push({ schluessel: f.k, frage: f.l, antwort: d[f.k] ? "unterschrieben" : "fehlt" }); }
      else {
        let v = d[f.k]; if (f.t === "number") v = num(v); if (v === "" || (Array.isArray(v) && !v.length)) v = null; if (v === undefined) v = null;
        felder[f.k] = v; eintraege.push({ schluessel: f.k, frage: f.l + (f.unit ? ` (${f.unit})` : ""), antwort: v });
      }
    }
    if (eintraege.length) abschnitte.push({ titel: sec.title, eintraege });
  }
  const raeume = (d.raeume || []).map((r, i) => { const o = { nr: i + 1 }; ROOM_FIELDS.forEach((f) => { let v = r[f.k]; if (f.t === "number") v = num(v); o[f.k] = v === undefined || v === "" ? null : v; }); return o; });
  const fotos = SCHEMA.find((s) => s.id === "fotos").fields[0].cats.map(([k, l]) => ({ kategorie: l, schluessel: k, anzahl: (d.fotos?.[k] || []).length }));
  return {
    schema: "scheible-klimaanlage-aufnahme/1", firma: COMPANY.name,
    anfrage_nr: d.anfrage_nr, status: rec.status, erstellt: rec.created, aktualisiert: rec.updated,
    hinweis_fuer_ki: "Aufnahme eines Kundenwunsches für eine Klimaanlage. Bitte auf Basis dieser Daten und der hinterlegten Stammdaten (Gerätekatalog, Preise, Textbausteine) ein Angebot vorbereiten. Werte null = nicht erfasst; 'klären' = vor Angebotsabgabe mit Kunde klären.",
    felder, raeume, fotos, abschnitte,
  };
}
function fileBase(rec) { const n = (rec.data.kunde_name || "Kunde").replace(/[^\wäöüÄÖÜß-]+/g, "_").slice(0, 40); return `${rec.data.anfrage_nr || "Aufnahme"}_${n}`; }
function download(blob, name) {
  const a = h("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
async function doExport(mode, statusEl) {
  await save(true);
  statusEl.textContent = "Erstelle Dateien …";
  try {
    const base = fileBase(current);
    const json = new Blob([JSON.stringify(buildJSON(current), null, 2)], { type: "application/json" });
    if (mode === "json") { download(json, `${base}_KI-Daten.json`); statusEl.textContent = "KI-Daten erstellt."; return; }
    const pdf = await buildPDF(current);
    if (mode === "pdf") { download(pdf, `${base}.pdf`); statusEl.textContent = "PDF erstellt."; return; }
    const files = [new File([pdf], `${base}.pdf`, { type: "application/pdf" }), new File([json], `${base}_KI-Daten.json`, { type: "application/json" })];
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title: `Aufnahme Klimaanlage ${current.data.kunde_name || ""}` }); statusEl.textContent = "Geteilt."; }
      catch (e) { statusEl.textContent = e.name === "AbortError" ? "Teilen abgebrochen." : "Teilen nicht möglich – Dateien werden heruntergeladen."; if (e.name !== "AbortError") { download(pdf, files[0].name); download(json, files[1].name); } }
    } else { download(pdf, files[0].name); setTimeout(() => download(json, files[1].name), 600); statusEl.textContent = "Teilen wird hier nicht unterstützt – Dateien wurden heruntergeladen."; }
  } catch (e) { console.error(e); statusEl.textContent = "Fehler beim Erstellen: " + e.message; }
}

/* ---------- Start ---------- */
window.addEventListener("load", () => {
  showList();
  if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("./sw.js").catch(() => {}); } catch (e) {} }
});
