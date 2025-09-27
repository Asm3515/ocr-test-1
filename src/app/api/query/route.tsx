import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { embedText1536 } from "@/lib/embeddings";
import { extractFilters } from "@/lib/nlFilters"; // next section

export const runtime = "nodejs";

/**
 * POST /api/query
 * Body:
 *  {
 *    "query": "electronics under $100 in 2013",
 *    "k": 5,
 *    // optional explicit filters override NL extraction:
 *    "filters": { "amount": { "$lte": 100 }, "date": { "$gte": "2013-01-01", "$lte": "2013-12-31" }, "category": "Electronics" }
 *  }
 */
export async function POST(req: Request) {
  try {
    const { query, k = 5, filters } = await req.json();

    if (!query && !filters) {
      return NextResponse.json({ ok: false, error: "Provide 'query' or 'filters'." }, { status: 400 });
    }

    // Build vector for semantic search when query text exists
    const queryEmbedding = query ? await embedText1536(query) : undefined;

    // Build Mongo filter (from NL if not explicitly passed)
    const mongoFilter = filters ?? (await extractFilters(query || ""));

    const db = await getDb();
    const invoices = db.collection("invoices");

    const pipeline: any[] = [];

    // Use $vectorSearch with filter when we have a semantic query
    if (queryEmbedding) {
      pipeline.push({
        $vectorSearch: {
          index: "embedding_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 200,
          limit: k,
          // 👇 THIS is the key: pre-filter by structured constraints
          ...(mongoFilter && Object.keys(mongoFilter).length > 0 ? { filter: mongoFilter } : {}),
          similarity: "cosine"
        }
      });
    } else {
      // If no semantic query, just do a structured find
      pipeline.push({ $match: mongoFilter || {} }, { $limit: k });
    }

    pipeline.push({
      $project: {
        vendor: 1,
        invoiceNumber: 1,
        amount: 1,
        date: 1,
        category: 1,
        summary: 1,
        tags: 1,
        score: { $meta: "vectorSearchScore" }
      }
    });

    const results = await invoices.aggregate(pipeline).toArray();

    return NextResponse.json({ ok: true, filters: mongoFilter, matches: results });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
