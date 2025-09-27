import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getDb } from "@/lib/mongodb";
import { categorizeInvoice } from "@/lib/categorize";
import { embedText1536 } from "@/lib/embeddings";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No files uploaded" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const invoices = db.collection("invoices");

    const results: any[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      // 1. OCR + summarize with GPT-4o-mini
      const gptResp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an invoice parser. Extract structured JSON with fields:
            - vendor
            - invoiceNumber
            - date (YYYY-MM-DD)
            - amount (number)
            - currency ("USD")
            - lineItems: [{ item, quantity, unitPrice, currency }]
            Also generate:
            - summary (short plain text)
            - tags (array of 3–6 keywords, lowercase, no spaces—use kebab-case).
            Always enforce strict JSON output.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract invoice details from this image:" },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${base64}` }
              }
            ]
          }
        ],
        temperature: 0,
        response_format: { type: "json_object" } // 👈 force pure JSON
      });

      const raw = gptResp.choices[0].message?.content;
      let parsed;

      try {
        parsed = JSON.parse(raw ?? "{}");
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: "Failed to parse GPT output", raw },
          { status: 500 }
        );
      }

      // 2. Build embedding for semantic search
      const embedInput = `${parsed.vendor}\n${parsed.summary}\n${parsed.tags?.join(" ") ?? ""}`;
      const embedding = await embedText1536(embedInput);

      // 3. Check duplicates (vendor+invoiceNumber)
      const exists = parsed.invoiceNumber
        ? await invoices.findOne({
            vendor: parsed.vendor,
            invoiceNumber: parsed.invoiceNumber
          })
        : null;
      if (exists) {
        results.push({
          file: file.name,
          skipped: true,
          reason: "Duplicate invoice",
          raw, // also return GPT raw output for inspection
          parsed
        });
        continue;
      }
      // 4. Categorize invoice
      const category = categorizeInvoice({
        tags: parsed.tags,
        summary: parsed.summary,
        lineItems: parsed.lineItems
      });
      // 5. Insert into MongoDB
      const doc = {
        ...parsed,
        category,   
        embedding,
        filename: file.name,
        uploadedAt: new Date(),
        processed: true
      };

      const insertResult = await invoices.insertOne(doc);
      results.push({
        file: file.name,
        insertedId: insertResult.insertedId,
        raw,
        parsed
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
