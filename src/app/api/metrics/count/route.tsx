import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const invoices = db.collection("invoices");

    const count = await invoices.countDocuments();

    return NextResponse.json({ ok: true, invoicesProcessed: count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
