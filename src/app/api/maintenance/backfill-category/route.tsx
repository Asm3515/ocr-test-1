import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { categorizeInvoice } from "@/lib/categorize";

export const runtime = "nodejs";

export async function POST() {
  try {
    const db = await getDb();
    const invoices = db.collection("invoices");

    const cursor = invoices.find(
      { $or: [{ category: { $exists: false } }, { category: null }] },
      { projection: { _id: 1, tags: 1, summary: 1, lineItems: 1 } }
    );

    let updated = 0;
    for await (const doc of cursor) {
      const category = categorizeInvoice({
        tags: doc.tags,
        summary: doc.summary,
        lineItems: doc.lineItems
      }) || "Uncategorized";

      await invoices.updateOne({ _id: doc._id }, { $set: { category } });
      updated++;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
