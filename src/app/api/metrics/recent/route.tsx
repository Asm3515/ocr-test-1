// src/app/api/metrics/recent/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const limit = Math.max(1, Math.min(100, Number(limitRaw ?? 10))) || 10;

    const db = await getDb();
    const invoices = db.collection("invoices");

    const results = await invoices
      .aggregate([
        { $sort: { date: -1 } },
        { $limit: limit },
        {
          $project: {
            vendor: 1,
            amount: 1,
            date: 1,
            category: 1,
            invoiceNumber: 1,
          },
        },
      ])
      .toArray();

    return NextResponse.json({ ok: true, recent: results });
  } catch (e: any) {
    console.error("[/api/metrics/recent] error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
