"use strict";
let LOGO_DATA = null;
async function logoData() {
  if (LOGO_DATA) return LOGO_DATA;
  const b = await (await fetch("./logo-small.jpg")).blob();
  LOGO_DATA = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  return LOGO_DATA;
}
async function buildPDF(rec) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const DB = [0, 60, 119], MB = [0, 86, 164], HB = [217, 237, 248], HG = [229, 229, 229], MG = [102, 102, 102];
  const L = 15, R = 195, CW = R - L, TOP = 42, BOT = 280;
  let y = TOP; const d = rec.data;
  let logo = null; try { logo = await logoData(); } catch (e) {}
  const header = () => {
    if (logo) doc.addImage(logo, "JPEG", L, 10, 42, 42 * 562 / 1141);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...DB);
    doc.text("Aufnahme Kundenwunsch Klimaanlage", R, 17, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MG);
    doc.text(`${d.anfrage_nr || ""} · ${d.kunde_name || ""}`, R, 22.5, { align: "right" });
    doc.setDrawColor(...HG); doc.setLineWidth(0.3); doc.line(L, 35, R, 35);
  };
  const newPage = () => { doc.addPage(); header(); y = TOP; };
  const need = (hh) => { if (y + hh > BOT) newPage(); };
  const section = (t) => {
    need(18); y += 3;
    doc.setFillColor(...HB); doc.rect(L, y, CW, 8, "F"); doc.setFillColor(...MB); doc.rect(L, y, 1.5, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...DB); doc.text(t, L + 4, y + 5.5); y += 11;
  };
  const show = (v) => (v == null || v === "" || (Array.isArray(v) && !v.length)) ? "–" : Array.isArray(v) ? v.join(", ") : String(v);
  const pairs = (list) => { // [label, value] in zwei Spalten
    const colW = (CW - 6) / 2;
    for (let i = 0; i < list.length; i += 2) {
      const cells = [list[i], list[i + 1]].filter(Boolean).map(([l, v]) => ({ l, lines: doc.setFontSize(10) && doc.splitTextToSize(show(v), colW) }));
      const hh = 4 + Math.max(...cells.map((c) => c.lines.length)) * 4.6 + 2;
      need(hh);
      cells.forEach((c, j) => {
        const x = L + j * (colW + 6);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MG); doc.text(c.l, x, y + 3);
        doc.setFontSize(10); doc.setTextColor(...DB); doc.text(c.lines, x, y + 7.5);
      });
      y += hh; doc.setDrawColor(...HG); doc.line(L, y - 1, R, y - 1);
    }
  };
  const full = (l, v) => {
    doc.setFontSize(10); const lines = doc.splitTextToSize(show(v), CW); const hh = 4 + lines.length * 4.6 + 2; need(hh);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MG); doc.text(l, L, y + 3);
    doc.setFontSize(10); doc.setTextColor(...DB); doc.text(lines, L, y + 7.5); y += hh; doc.setDrawColor(...HG); doc.line(L, y - 1, R, y - 1);
  };
  const checklist = (f) => {
    need(14);
    doc.setFillColor(...DB); doc.rect(L, y, CW, 6.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
    doc.text("Prüfpunkt", L + 2, y + 4.4); doc.text("Antwort", L + 102, y + 4.4); doc.text("Bemerkung", L + 125, y + 4.4); y += 6.5;
    f.items.forEach((it, i) => {
      const key = `${f.k}_${String(i + 1).padStart(2, "0")}`; let v = d[key]; if (v === "klaeren") v = "klären";
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const tl = doc.splitTextToSize(it, 96), bl = doc.splitTextToSize(show(d[`${key}_bem`]), CW - 127);
      const hh = Math.max(tl.length, bl.length) * 4.2 + 2.6; need(hh);
      if (i % 2 === 0) { doc.setFillColor(244, 249, 252); doc.rect(L, y, CW, hh, "F"); }
      doc.setTextColor(...DB); doc.text(tl, L + 2, y + 4.3);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...(v === "nein" ? MG : v ? MB : MG)); doc.text(show(v), L + 102, y + 4.3);
      doc.setFont("helvetica", "normal"); doc.setTextColor(...DB); doc.text(bl, L + 125, y + 4.3);
      y += hh; doc.setDrawColor(...HG); doc.line(L, y, R, y);
    });
    y += 3;
  };

  header();
  for (const sec of SCHEMA) {
    if (sec.id === "fotos") continue;
    section(`${SCHEMA.indexOf(sec) + 1}  ${sec.title}`);
    let buf = [];
    const flush = () => { if (buf.length) pairs(buf); buf = []; };
    for (const f of sec.fields) {
      if (f.t === "checklist") { flush(); checklist(f); }
      else if (f.t === "rooms") {
        (d.raeume || []).forEach((r, i) => {
          need(30); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...MB);
          doc.text(`Raum ${i + 1}${r.bezeichnung ? " – " + r.bezeichnung : ""}`, L, y + 4); y += 6;
          pairs(ROOM_FIELDS.filter((rf) => rf.k !== "bezeichnung").map((rf) => [rf.l + (rf.unit ? ` (${rf.unit})` : ""), r[rf.k]]));
        });
      }
      else if (f.t === "signature") {
        flush(); need(38);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MG); doc.text(f.l, L, y + 3);
        doc.setDrawColor(...HG); doc.rect(L, y + 5, 90, 28);
        if (d[f.k]) { try { doc.addImage(d[f.k], "PNG", L + 1, y + 6, 88, 26); } catch (e) {} }
        y += 37;
      }
      else if (f.t === "textarea" || (f.t === "multi" && f.o.some((o) => o.length > 30))) { flush(); full(f.l, d[f.k]); }
      else { let v = d[f.k]; if (f.t === "date") v = fmtDate(v); buf.push([f.l + (f.unit ? ` (${f.unit})` : ""), v]); }
    }
    flush();
  }
  // Fotos
  const cats = SCHEMA.find((s) => s.id === "fotos").fields[0].cats;
  const all = cats.flatMap(([k, l]) => (d.fotos?.[k] || []).map((p, i) => ({ ...p, cap: `${l} ${i + 1}` })));
  if (all.length) newPage();
  section(`${SCHEMA.findIndex((s) => s.id === "fotos") + 1}  Fotos (${all.length})`);
  if (!all.length) { doc.setFontSize(10); doc.setTextColor(...MG); doc.text("Keine Fotos aufgenommen.", L, y + 4); y += 8; }
  const pw = (CW - 6) / 2;
  for (let i = 0; i < all.length; i += 2) {
    const pair = all.slice(i, i + 2);
    const hs = pair.map((p) => Math.min(pw * p.h / p.w, 85));
    const hh = Math.max(...hs) + 8; need(hh);
    pair.forEach((p, j) => {
      const ih = hs[j], iw = ih * p.w / p.h, x = L + j * (pw + 6);
      try { doc.addImage(p.data, "JPEG", x, y, iw, ih); } catch (e) {}
      doc.setFontSize(8); doc.setTextColor(...MG); doc.text(p.cap, x, y + ih + 4);
    });
    y += hh + 2;
  }
  // Fußzeilen
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setDrawColor(...HG); doc.line(L, 284, R, 284);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MG);
    doc.text(`${COMPANY.name} · ${COMPANY.line}`, L, 288); doc.text(COMPANY.line2, L, 291.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...DB); doc.text(`Seite ${i} von ${n}`, R, 291.5, { align: "right" });
  }
  doc.setProperties({ title: `Aufnahme Klimaanlage ${d.anfrage_nr || ""}`, author: COMPANY.name });
  return doc.output("blob");
}
