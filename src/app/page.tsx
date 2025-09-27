"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CategoryRow = { category: string; total: number; count: number };
type RecentItem = { vendor?: string; invoiceNumber?: string; amount?: number; date?: string; category?: string };
type TimeseriesPoint = { month: string; total: number; count: number };

async function getJSON<T>(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}

export default function DashboardPage() {
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [series, setSeries] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [t, c, cats, rec, ts] = await Promise.all([
          getJSON<{ ok: boolean; totalSpent: number }>("/api/metrics/total"),
          getJSON<{ ok: boolean; invoicesProcessed: number }>("/api/metrics/count"),
          getJSON<{ ok: boolean; categories: CategoryRow[] }>("/api/metrics/categories"),
          getJSON<{ ok: boolean; recent: RecentItem[] }>("/api/metrics/recent?limit=8"),
          getJSON<{ ok: boolean; timeseries: TimeseriesPoint[] }>("/api/metrics/timeseries?months=12"),
        ]);
        setTotalSpent(t.totalSpent || 0);
        setCount(c.invoicesProcessed || 0);
        setCategories(cats.categories || []);
        setRecent(rec.recent || []);
        setSeries(ts.timeseries || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Sparkline path
  const sparkMax = useMemo(() => Math.max(1, ...series.map(s => s.total)), [series]);
  const sparkPath = useMemo(() => {
    if (!series.length) return "";
    const w = 360, h = 80;
    const dx = series.length > 1 ? w / (series.length - 1) : 0;
    const pts = series.map((p, i) => {
      const x = i * dx;
      const y = h - (p.total / sparkMax) * h;
      return `${x},${y}`;
    });
    return `M ${pts[0]} L ${pts.slice(1).join(" ")}`;
  }, [series, sparkMax]);

  // Batch upload
  async function onBatchUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = (e.currentTarget.querySelector('input[type="file"][name="files"]') as HTMLInputElement) ?? null;
    if (!input?.files?.length) return alert("Please choose one or more images/PDFs.");
    const fd = new FormData();
    Array.from(input.files).forEach(f => fd.append("files", f));
    const res = await fetch("/api/invoices/batch", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      alert(data?.error || "Upload failed");
      return;
    }
    // Refresh KPIs & recent after upload
    const [t, c, rec] = await Promise.all([
      getJSON<{ ok: boolean; totalSpent: number }>("/api/metrics/total"),
      getJSON<{ ok: boolean; invoicesProcessed: number }>("/api/metrics/count"),
      getJSON<{ ok: boolean; recent: RecentItem[] }>("/api/metrics/recent?limit=8"),
    ]);
    setTotalSpent(t.totalSpent || 0);
    setCount(c.invoicesProcessed || 0);
    setRecent(rec.recent || []);
    input.value = "";
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Invoices Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track spend, browse recent invoices, and upload in batches.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/voice"
            className="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm sm:text-base bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            🎤 Voice Search
          </Link>
          <a
            href="/swagger"
            className="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm sm:text-base bg-gray-900 text-white hover:bg-black transition"
          >
            API Docs
          </a>
        </div>
      </div>

      {/* KPIs */}
      <section className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI title="Total Spent" value={`$${totalSpent.toFixed(2)}`} loading={loading} />
        <KPI title="Invoices Processed" value={count.toString()} loading={loading} />
        <KPI
          title="Top Category"
          value={categories[0]?.category ?? "—"}
          sub={categories[0] ? `$${categories[0].total.toFixed(2)} • ${categories[0].count} invoices` : "—"}
          loading={loading}
        />
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-gray-500">Last 12 Months (Total)</div>
          <svg viewBox="0 0 360 80" className="w-full h-20 mt-1">
            <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <div className="text-[11px] text-gray-500">
            {series.length ? `${series[0].month} → ${series[series.length - 1].month}` : "No data"}
          </div>
        </div>
      </section>

      {err && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Error loading dashboard: {err}
        </div>
      )}

      {/* Upload (mobile-first: stacked) */}
      <section className="mt-6 rounded-2xl border p-4">
        <h2 className="text-lg font-medium mb-3">Batch Upload Invoices</h2>
        <form onSubmit={onBatchUpload} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="file"
            name="files"
            multiple
            accept="image/*,.pdf"
            className="w-full sm:w-auto text-sm border rounded-xl p-2"
          />
          <button
            type="submit"
            className="w-full sm:w-auto rounded-xl border bg-blue-600 text-white px-4 py-2 text-sm sm:text-base hover:bg-blue-700 transition"
          >
            Upload & Process
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Supported: JPG/PNG/PDF. Parsed with GPT-4o-mini and stored with embeddings for RAG search.
        </p>
      </section>

      {/* Categories + Recent (stack on mobile) */}
      <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Categories */}
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">Category-wise Spending</h2>
          </div>
          <div className="space-y-3">
            {categories.map((c, i) => (
              <div key={c.category} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-sm sm:text-base">{c.category}</div>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-gray-300"
                    style={{
                      width:
                        categories[0]?.total
                          ? `${Math.max(4, Math.round((c.total / categories[0].total) * 100))}%`
                          : "4%",
                    }}
                  />
                </div>
                <div className="w-28 text-right text-sm sm:text-base tabular-nums">
                  ${c.total.toFixed(2)}
                </div>
                <div className="w-12 text-right text-xs text-gray-500">({c.count})</div>
              </div>
            ))}
            {!categories.length && <div className="text-sm text-gray-500">No categorized data yet.</div>}
          </div>
        </div>

        {/* Recent */}
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">Recent Invoices</h2>
            <Link href="/voice" className="text-sm text-emerald-700 hover:underline">
              Try voice search →
            </Link>
          </div>

          {/* Mobile-friendly list; table on md+ */}
          <div className="md:hidden space-y-3">
            {recent.map((r, i) => (
              <div key={`${r.invoiceNumber}-${i}`} className="rounded-xl border p-3">
                <div className="flex justify-between">
                  <div className="font-medium">{r.vendor ?? "—"}</div>
                  <div className="text-xs text-gray-500">{r.date ?? "—"}</div>
                </div>
                <div className="text-sm mt-1">#{r.invoiceNumber ?? "—"}</div>
                <div className="text-sm mt-1">
                  <span className="font-medium">${r.amount?.toFixed?.(2) ?? r.amount ?? "—"}</span>
                  {r.category && <span className="text-xs text-gray-500 ml-2">{r.category}</span>}
                </div>
              </div>
            ))}
            {!recent.length && <div className="text-sm text-gray-500">No recent invoices.</div>}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr className="text-gray-600">
                  <th className="py-2">Vendor</th>
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={`${r.invoiceNumber}-${i}`} className="border-b last:border-0">
                    <td className="py-2">{r.vendor ?? "—"}</td>
                    <td className="py-2">{r.invoiceNumber ?? "—"}</td>
                    <td className="py-2">{r.date ?? "—"}</td>
                    <td className="py-2 text-right">${r.amount?.toFixed?.(2) ?? r.amount ?? "—"}</td>
                    <td className="py-2">{r.category ?? "—"}</td>
                  </tr>
                ))}
                {!recent.length && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No recent invoices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function KPI({ title, value, sub, loading }: { title: string; value: string; sub?: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-2xl sm:text-3xl font-semibold tabular-nums">
        {loading ? <span className="animate-pulse text-gray-400">…</span> : value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
