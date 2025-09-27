// Very lightweight heuristics to turn NL into Mongo filters.
// You can extend this (or swap to an LLM extractor if you want).

type MongoFilter = {
  amount?: { $gte?: number; $lte?: number };
  date?: { $gte?: string; $lte?: string };
  category?: string;
  vendor?: string;
  tags?: { $in?: string[] };
};

const monthMap: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function clamp2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

export async function extractFilters(q: string): Promise<MongoFilter> {
  const text = (q || "").toLowerCase();
  const filter: MongoFilter = {};

  // amount under/below/less than $X
  let m = text.match(/(?:under|below|less\s+than)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (m) {
    filter.amount = { ...(filter.amount || {}), $lte: Number(m[1]) };
  }

  // amount over/above/greater than $X
  m = text.match(/(?:over|above|greater\s+than|more\s+than)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (m) {
    filter.amount = { ...(filter.amount || {}), $gte: Number(m[1]) };
  }

  // between $A and $B
  m = text.match(/between\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (m) {
    filter.amount = { $gte: Number(m[1]), $lte: Number(m[2]) };
  }

  // year only "in 2013" or "2013"
  m = text.match(/\b(19|20)\d{2}\b/);
  if (m) {
    const year = m[0];
    filter.date = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
  }

  // specific month/year "april 2013", "apr 2013"
  m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(19|20)\d{2}\b/);
  if (m) {
    const mon = monthMap[m[1].slice(0,3)];
    const year = m[2];
    filter.date = { $gte: `${year}-${mon}-01`, $lte: `${year}-${mon}-31` };
  }

  // category hints (add your own domain terms)
  if (/\belectronic(s)?\b/.test(text)) filter.category = "Electronics";
  if (/\bhospital\b/.test(text)) filter.category = "Hospital";
  if (/\btech\b/.test(text)) filter.category = "Tech";
  if (/\bparts?\b/.test(text)) filter.category = "Parts";
  if (/\bservice(s)?\b/.test(text)) filter.category = "Service";

  // tags inclusion simple capture: quotes list e.g., tags: "dell", "console"
  const tagMatches = [...text.matchAll(/"([^"]+)"/g)].map(g => g[1]);
  if (tagMatches.length) filter.tags = { $in: tagMatches };

  return filter;
}
