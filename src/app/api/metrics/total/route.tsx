import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const invoices = db.collection("invoices");

    const result = await invoices.aggregate([
      { $group: { _id: null, totalSpent: { $sum: "$amount" } } }
    ]).toArray();

    return NextResponse.json({
      ok: true,
      totalSpent: result[0]?.totalSpent || 0
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
