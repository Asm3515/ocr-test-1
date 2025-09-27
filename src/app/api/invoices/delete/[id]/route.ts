import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

/**
 * DELETE /api/invoices/delete/:id
 * Deletes the invoice document (including its embedding field)
 */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> } // 👈 params is a Promise in Next 15 types
) {
  try {
    const { id } = await context.params; // 👈 await it

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "Invalid or missing id" }, { status: 400 });
    }

    const db = await getDb();
    const invoices = db.collection("invoices");

    const result = await invoices.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}
