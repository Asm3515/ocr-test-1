import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { invoiceCollectionValidator } from "@/lib/invoiceValidator";

export const runtime = "nodejs";

export async function POST() {
  try {
    const db = await getDb();
    const coll = "invoices";

    const exists = await db.listCollections({ name: coll }).toArray();
    if (exists.length === 0) {
      await db.createCollection(coll, {
        validator: invoiceCollectionValidator,
        validationLevel: "strict",
        validationAction: "error"
      });
    } else {
      await db.command({
        collMod: coll,
        validator: invoiceCollectionValidator,
        validationLevel: "strict",
        validationAction: "error"
      });
    }

    const invoices = db.collection(coll);
    await invoices.createIndex({ vendor: 1 });
    await invoices.createIndex({ date: 1 });
    await invoices.createIndex({ category: 1 });
    await invoices.createIndex({ tags: 1 });
    await invoices.createIndex({ amount: 1 });
    await invoices.createIndex({ vendor: 1, invoiceNumber: 1 }, { unique: true, sparse: true });

    // Atlas Vector Search index
    try {
      await db.command({
        createSearchIndexes: coll,
        indexes: [
          {
            name: "embedding_index",
            definition: {
              fields: [
                {
                  type: "vector",
                  path: "embedding",
                  numDimensions: 1536,
                  similarity: "cosine"
                }
              ]
            }
          }
        ]
      });
    } catch (e: any) {
      console.warn("Vector index create (non-fatal):", e?.message);
    }

    return NextResponse.json({ ok: true, message: "DB/collection ready; validator & indexes applied." });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
