import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const invoices = db.collection("invoices");

    const pipeline = [
      {
        $project: {
          cat: { $ifNull: ["$category", "Uncategorized"] },
          amount: 1
        }
      },
      {
        $group: {
          _id: "$cat",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ];

    const rows = await invoices.aggregate(pipeline).toArray();
    return NextResponse.json({
      ok: true,
      categories: rows.map(r => ({ category: r._id, total: r.total, count: r.count }))
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
