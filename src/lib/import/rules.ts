import type { TransactionType } from "@/lib/categories";

type Rule = { pattern: RegExp; category: string; type?: TransactionType };

// Einfache Schlüsselwort-Regeln für typische deutsche Händler/Buchungstexte.
// Gelernte Zuordnungen aus früheren Buchungen haben Vorrang (siehe actions/import.ts).
const RULES: Rule[] = [
  { pattern: /gehalt|lohn|bezuege|besoldung/i, category: "Gehalt", type: "INCOME" },
  { pattern: /dividende|ertragsgutschrift|ausschuettung/i, category: "Dividende", type: "INCOME" },
  { pattern: /zinsen|zinsgutschrift|habenzins/i, category: "Zinsen", type: "INCOME" },
  { pattern: /bonus|praemie/i, category: "Bonus", type: "INCOME" },

  { pattern: /miete|mietzahlung|hausverwaltung|wohnungsbau/i, category: "Miete", type: "EXPENSE" },
  { pattern: /netflix|spotify|disney|apple\.com|itunes|google \*|youtube|prime video|amazon prime|dazn|sky deutschland|audible|chatgpt|openai|adobe|microsoft/i, category: "Abo", type: "EXPENSE" },
  { pattern: /rewe|edeka|aldi|lidl|netto|kaufland|penny|globus|tegut|norma|alnatura|denns|bio company|hit markt|marktkauf/i, category: "Lebensmittel", type: "EXPENSE" },
  { pattern: /lieferando|wolt|uber \*?eats|mcdonald|burger king|restaurant|pizzeria|cafe|caf[eé]|starbucks|baeckerei|backhaus|kamps/i, category: "Essen gehen", type: "EXPENSE" },
  { pattern: /versicherung|allianz|huk|ergo|axa|devk|generali|signal iduna|debeka|r\+v/i, category: "Versicherung", type: "EXPENSE" },
  { pattern: /deutsche bahn|db vertrieb|bahn\.de|flixbus|bvg|mvg|hvv|vvs|kvb|rmv|shell|aral|esso|totalenergies|jet tankstelle|tankstelle|sixt|share now|uber /i, category: "Mobilität", type: "EXPENSE" },
  { pattern: /stadtwerke|stromversorg|gasversorg|vattenfall|eon|e\.on|enbw|telekom|vodafone|o2|telefonica|1&1|congstar|rundfunk|ard zdf/i, category: "Nebenkosten", type: "EXPENSE" },
  { pattern: /apotheke|arzt|zahnarzt|klinik|krankenhaus|optiker|fielmann|dm[- ]drogerie|rossmann/i, category: "Gesundheit", type: "EXPENSE" },
  { pattern: /amazon|zalando|otto\.de|otto gmbh|ikea|mediamarkt|saturn|h&m|zara|decathlon|ebay|paypal \*|about you/i, category: "Shopping", type: "EXPENSE" },
  { pattern: /kino|cinemaxx|theater|konzert|eventim|steam|playstation|nintendo|fitness|mcfit|urban sports|museum/i, category: "Freizeit", type: "EXPENSE" },
];

export function suggestCategoryByRule(type: TransactionType, text: string): string | null {
  // Umlaute vereinheitlichen, damit "Bäckerei" auch "baeckerei" trifft
  text = text.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  for (const r of RULES) {
    if (r.type && r.type !== type) continue;
    // nur am Wortanfang treffen ("rewe" ja, "Brewery" nein)
    const atWordStart = new RegExp(`(?:^|[^a-z0-9äöüß])(?:${r.pattern.source})`, "i");
    if (atWordStart.test(text)) return r.category;
  }
  return null;
}
