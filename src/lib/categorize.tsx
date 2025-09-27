export function categorizeInvoice(input: {
  tags?: string[];
  summary?: string;
  lineItems?: { item: string }[];
}) {
  const tags = (input.tags || []).map(t => t.toLowerCase());
  const text = [
    ...(input.lineItems || []).map(li => li.item?.toLowerCase() || ""),
    input.summary?.toLowerCase() || "",
    tags.join(" ")
  ].join(" ");

  const has = (kw: string | RegExp) =>
    typeof kw === "string" ? text.includes(kw.toLowerCase()) : kw.test(text);

  if (has(/hospital|clinic|pharma|medical/)) return "Hospital";
  if (has(/laptop|desktop|computer|server|cpu|gpu|ram|ssd|electronics?|console|gaming/)) return "Electronics";
  if (has(/parts?|spare|component|adapter|cable|accessor(y|ies)/)) return "Parts";
  if (has(/service|maintenance|support|subscription|renewal|license/)) return "Service";
  if (has(/software|saas|cloud|api|subscription/)) return "Tech";

  // fallback: guess from tags explicitly if present
  if (tags.includes("electronics")) return "Electronics";
  if (tags.includes("hospital")) return "Hospital";
  if (tags.includes("parts")) return "Parts";
  if (tags.includes("service")) return "Service";
  if (tags.includes("tech")) return "Tech";

  return undefined; 
}
