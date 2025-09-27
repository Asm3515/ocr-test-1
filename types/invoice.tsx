export type CurrencyCode = "USD";

/** One line item on the invoice */
export interface LineItem {
  item: string;              // e.g., "Nintendo 64 Console"
  quantity: number;          // integer >= 1
  unitPrice: number;         // numeric, e.g., 120.00
  currency: CurrencyCode;    // "USD"
  // Optional derived helpers (not required in DB)
  totalPrice?: number;       // quantity * unitPrice
}

/** Main invoice document */
export interface InvoiceDoc {
  _id?: string;

  vendor: string;            // "Wood-Kim"
  amount: number;            // 164.97 (numeric total)
  currency: CurrencyCode;    // "USD"
  date: string;              // "YYYY-MM-DD"
  invoiceNumber?: string;    // "18999056"

  description?: string;      // long raw OCR text
  summary?: string;          // short LLM summary

  tags: string[];            // ["Nintendo 64","console","games","electronics"]
  category?: string;         // "Electronics"

  lineItems?: LineItem[];    // per-item breakdown (optional)

  embedding?: number[];      // length 1536 vector for ANN search

  filename?: string;         // "batch1-0501.jpg"
  uploadedAt: Date;          // ISODate
  processed: boolean;        // true/false
}
