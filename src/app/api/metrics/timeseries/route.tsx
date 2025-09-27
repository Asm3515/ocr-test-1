import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

/**
 * Returns aggregated spend per month (default: last 12 months)
 * Query params:
 *   ?months=12   -> number of months back
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const months = parseInt(url.searchParams.get("months") || "12", 10);

  try {
    const db = await getDb();
    const invoices = db.collection("invoices");

    // Group by year+month from "date" (string YYYY-MM-DD)
    const pipeline = [
      {
        $addFields: {
          yearMonth: { $substr: ["$date", 0, 7] } // e.g., "2013-04"
        }
      },
      {
        $group: {
          _id: "$yearMonth",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: months }
    ];

    const results = await invoices.aggregate(pipeline).toArray();

    return NextResponse.json({
      ok: true,
      timeseries: results.map(r => ({
        month: r._id,
        total: r.total,
        count: r.count
      }))
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
