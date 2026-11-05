// Formularstruktur – Feldnamen identisch zum PDF-Aufnahmebogen (für die KI-Auswertung)
const JNK = ["ja", "nein", "klären"];
const SCHEMA = [
  { id: "anfrage", title: "Anfrage", fields: [
    { k: "anfrage_nr", l: "Anfrage-Nr.", t: "text", w: 1 },
    { k: "anfrage_datum", l: "Datum", t: "date", w: 1 },
    { k: "anfrage_bearbeiter", l: "Aufgenommen von", t: "text", w: 1, remember: true },
    { k: "anfrage_vorort_termin", l: "Vor-Ort-Termin am", t: "date", w: 1 },
    { k: "anfrage_vorort_uhrzeit", l: "Uhrzeit", t: "time", w: 1 },
    { k: "anfrage_kanal", l: "Eingang über", t: "single", o: ["Telefon", "E-Mail", "Website", "Vor-Ort", "Empfehlung", "Bestandskunde"] },
  ]},
  { id: "kunde", title: "Kunde", fields: [
    { k: "kunde_typ", l: "Kundentyp", t: "single", o: ["Privat", "Gewerbe", "Vermieter", "Hausverwaltung / WEG"] },
    { k: "kunde_name", l: "Vorname, Name / Firma", t: "text", w: 2, req: true, ac: "name" },
    { k: "kunde_ansprechpartner", l: "Ansprechpartner", t: "text", w: 1 },
    { k: "kunde_strasse", l: "Straße, Hausnummer", t: "text", w: 2, ac: "street-address" },
    { k: "kunde_plz_ort", l: "PLZ, Ort", t: "text", w: 1 },
    { k: "kunde_telefon", l: "Telefon", t: "tel", w: 1 },
    { k: "kunde_mobil", l: "Mobil", t: "tel", w: 1 },
    { k: "kunde_email", l: "E-Mail", t: "email", w: 1 },
    { k: "kunde_nr", l: "Kunden-Nr. (Bestand)", t: "text", w: 1 },
    { k: "kunde_rechnungsadresse", l: "Rechnungsadresse (falls abweichend)", t: "text", w: 2 },
    { k: "kunde_kontaktweg", l: "Kontakt bevorzugt", t: "single", o: ["Telefon", "E-Mail", "WhatsApp"] },
    { k: "kunde_rolle", l: "Kunde ist", t: "single", o: ["Eigentümer", "Mieter", "Verwalter"] },
  ]},
  { id: "objekt", title: "Objekt", fields: [
    { k: "objekt_adresse", l: "Objektadresse (falls abweichend)", t: "text", w: 2 },
    { k: "objekt_etage", l: "Etage / Wohnung", t: "text", w: 1 },
    { k: "objekt_art", l: "Gebäudeart", t: "single", o: ["EFH", "DHH / RH", "MFH / Wohnung", "Büro / Praxis", "Gewerbe", "Technikraum"] },
    { k: "objekt_baustandard", l: "Baustandard", t: "single", o: ["Neubau", "saniert", "teilsaniert", "unsaniert"] },
    { k: "objekt_baujahr", l: "Baujahr", t: "number", w: 1, int: true },
    { k: "objekt_dach", l: "Dachform / Dachgeschoss", t: "text", w: 2 },
    { k: "objekt_zufahrt", l: "Zufahrt / Parken", t: "text", w: 1 },
    { k: "objekt_transport", l: "Aufzug / Transportweg", t: "text", w: 2 },
    { k: "objekt", t: "checklist", cols: JNK, items: [
      "Zustimmung Vermieter / WEG erforderlich", "Denkmalschutz / Gestaltungssatzung", "Bestehende Klimaanlage vorhanden",
      "Demontage / Entsorgung Altgerät gewünscht", "Photovoltaikanlage vorhanden"] },
  ]},
  { id: "wunsch", title: "Kundenwunsch", fields: [
    { k: "wunsch_ziel", l: "Ziel", t: "multi", o: ["Kühlen", "Heizen (Übergang)", "Heizen (Hauptheizung)", "Entfeuchten", "Luftreinigung"] },
    { k: "wunsch_bauart", l: "Bauart Innengerät", t: "multi", o: ["Wandgerät", "Truhe", "Kassette", "Kanalgerät", "offen / Beratung"] },
    { k: "wunsch_steuerung", l: "Steuerung", t: "multi", o: ["Fernbedienung", "WLAN / App", "Kabelfernbedienung", "Smart-Home"] },
    { k: "wunsch_hersteller", l: "Wunschhersteller / Modell", t: "text", w: 2 },
    { k: "wunsch_design", l: "Design / Farbe", t: "text", w: 1 },
    { k: "wunsch_budget_eur", l: "Budgetrahmen", unit: "€", t: "number", w: 1 },
    { k: "wunsch_termin", l: "Wunschtermin Ausführung", t: "text", w: 2 },
    { k: "wunsch_anforderungen", l: "Besondere Anforderungen", ph: "z. B. leise im Schlafzimmer, Allergiker, Serverraum 24/7", t: "textarea" },
  ]},
  { id: "raeume", title: "Räume", fields: [
    { k: "raeume", t: "rooms" },
  ]},
  { id: "aussengeraet", title: "Außengerät", fields: [
    { k: "ag_aufstellung", l: "Aufstellung", t: "single", o: ["Wandkonsole", "Bodenkonsole", "Flachdach", "Balkon / Terrasse", "Garage / innen"] },
    { k: "ag_wand", l: "Wandaufbau", t: "single", o: ["Mauerwerk", "Beton", "WDVS", "Holz / Fertighaus", "Klinker"] },
    { k: "ag_montagehoehe_m", l: "Montagehöhe", unit: "m", t: "number", w: 1 },
    { k: "ag_abstand_nachbar_m", l: "Abstand zum Nachbarn", unit: "m", t: "number", w: 1 },
    { k: "ag_schall", l: "Schallempfindliche Räume", ph: "z. B. Schlafzimmer Nachbar", t: "text", w: 2 },
    { k: "ag", t: "checklist", cols: JNK, items: [
      "Gerüst / Hubsteiger erforderlich", "Außengerät vom Boden aus wartbar", "Schneefang / Wetterschutz nötig",
      "Fundament / Sockel muss erstellt werden"] },
  ]},
  { id: "leitung", title: "Leitung & Elektro", fields: [
    { k: "lw_laenge_m", l: "Leitungslänge einfach", unit: "m", t: "number", w: 1 },
    { k: "lw_hoehe_m", l: "Höhenunterschied", unit: "m", t: "number", w: 1 },
    { k: "lw_kernbohrungen", l: "Anzahl Kernbohrungen", t: "number", int: true, w: 1 },
    { k: "lw_wandstaerke_cm", l: "Wandstärke", unit: "cm", t: "number", w: 1 },
    { k: "lw_fuehrung", l: "Leitungsführung", t: "multi", o: ["Kabelkanal außen", "Kabelkanal innen", "Unterputz", "Dachboden / Keller"] },
    { k: "lw_kanal_m", l: "Länge Kabelkanal", unit: "m", t: "number", w: 1 },
    { k: "lw_kanal_farbe", l: "Farbe Kabelkanal", t: "text", w: 1 },
    { k: "el_abstand_m", l: "Abstand zur Unterverteilung", unit: "m", t: "number", w: 1 },
    { k: "el_absicherung", l: "Vorhandene Absicherung", t: "text", w: 1 },
    { k: "el_ausfuehrung", l: "Elektroanschluss durch", t: "single", o: ["Scheible", "Elektro-Partner", "Kunde / eigener Elektriker"] },
    { k: "lw", t: "checklist", cols: JNK, items: [
      "Kondensat im freien Gefälle ableitbar", "Anschluss an Abwasser möglich", "Kondensatpumpe erforderlich",
      "Platz im Zählerschrank / Verteiler frei", "Leitungsweg mit Kunde abgestimmt"] },
  ]},
  { id: "fotos", title: "Fotos", fields: [
    { k: "fotos", t: "photos", cats: [
      ["innen", "Position Innengerät(e)"], ["aussen", "Position Außengerät"], ["fassade", "Fassade / Leitungsweg"],
      ["zaehler", "Zählerschrank / Verteiler"], ["grundriss", "Grundriss / Skizze"], ["altgeraet", "Typenschild Altgerät"]] },
  ]},
  { id: "umfang", title: "Angebotsumfang", fields: [
    { k: "umfang", t: "checklist", cols: JNK, items: [
      "Lieferung Geräte", "Montage Innen- und Außengerät", "Kältemittelleitung, Dämmung, Kabelkanal",
      "Kernbohrung(en)", "Konsole / Sockel", "Kondensatableitung / -pumpe", "Elektroanschluss",
      "Gerüst / Hubsteiger", "Demontage und Entsorgung Altgerät", "Inbetriebnahme, Protokoll, Einweisung",
      "Wartungsvertrag anbieten"] },
  ]},
  { id: "intern", title: "Intern", fields: [
    { k: "intern_varianten", l: "Angebotsvarianten", t: "single", o: ["eine Variante", "Standard + Premium", "nach Hersteller"] },
    { k: "intern_dringlichkeit", l: "Dringlichkeit", t: "single", o: ["normal", "zeitnah", "dringend"] },
    { k: "intern_kuehllast_kw", l: "Geschätzte Kühllast gesamt", unit: "kW", t: "number", w: 1 },
    { k: "intern_montagezeit_h", l: "Geschätzte Montagezeit", unit: "h", t: "number", w: 1 },
    { k: "intern_monteure", l: "Anzahl Monteure", t: "number", int: true, w: 1 },
    { k: "intern_geraetevorschlag", l: "Vorschlag Gerätegröße / Modell", t: "text", w: 3 },
    { k: "intern_erschwernisse", l: "Besondere Erschwernisse", t: "textarea" },
    { k: "intern_ausschluesse", l: "Ausschlüsse / bauseitige Leistungen", t: "textarea" },
    { k: "intern_ki_hinweise", l: "Hinweise für die KI", ph: "Tonalität, Schwerpunkte, Textbausteine", t: "textarea" },
    { k: "intern_bemerkungen", l: "Sonstige Bemerkungen", t: "textarea" },
  ]},
  { id: "abschluss", title: "Abschluss", fields: [
    { k: "bestaetigung", l: "Einverständnis", t: "multi", o: [
      "Fotos der Aufstellorte dürfen zur Angebotserstellung verwendet werden",
      "Zusätzlich Angebot für Wartungsvertrag gewünscht"] },
    { k: "unterschrift_ort", l: "Ort", t: "text", w: 2 },
    { k: "unterschrift_datum", l: "Datum", t: "date", w: 1 },
    { k: "unterschrift_kunde", l: "Unterschrift Kunde", t: "signature" },
    { k: "unterschrift_scheible", l: "Unterschrift Aufnehmender (Scheible)", t: "signature" },
  ]},
];
const ROOM_FIELDS = [
  { k: "bezeichnung", l: "Raumbezeichnung", t: "text", w: 2 },
  { k: "etage", l: "Etage", t: "text", w: 1 },
  { k: "bauart", l: "Bauart Innengerät", t: "single", o: ["Wandgerät", "Truhe", "Kassette", "Kanalgerät", "offen"] },
  { k: "flaeche_m2", l: "Fläche", unit: "m²", t: "number", w: 1 },
  { k: "hoehe_m", l: "Raumhöhe", unit: "m", t: "number", w: 1 },
  { k: "fenster_m2", l: "Fensterfläche", unit: "m²", t: "number", w: 1 },
  { k: "ausrichtung", l: "Ausrichtung", t: "multi", o: ["N", "O", "S", "W"] },
  { k: "personen", l: "Personen", t: "number", int: true, w: 1 },
  { k: "besonderheiten", l: "Wärmequellen / Besonderheiten", ph: "Dachgeschoss, Südfenster, PC, Geräte", t: "text", w: 2 },
];
const COMPANY = {
  name: "Scheible bad & heizung Haustechnik GmbH",
  line: "Bahnhofstraße 23 · 73312 Geislingen · Telefon: 0 73 31 / 206-0 · Fax: 0 73 31 / 206-16",
  line2: "E-Mail: info@scheible-badundheizung.de · Web: https://www.badundheizung.de/scheible/",
};
