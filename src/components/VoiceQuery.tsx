"use client";

import { useEffect, useRef, useState } from "react";

type Match = {
  _id?: string;
  vendor?: string;
  invoiceNumber?: string;
  amount?: number;
  date?: string;
  category?: string;
  summary?: string;
  tags?: string[];
  score?: number;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function VoiceQuery({
  k = 5,
  placeholder = "Hold mic and say: “invoices below $7000”",
}: { k?: number; placeholder?: string }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Match[]>([]);
  const [filtersEcho, setFiltersEcho] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const recogRef = useRef<any>(null);
  const finalTextRef = useRef<string>("");

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR);
    if (SR) {
      const recog = new SR();
      recog.lang = "en-US";
      recog.interimResults = true;
      recog.maxAlternatives = 1;

      recog.onstart = () => {
        finalTextRef.current = "";
        setErr(null);
        setListening(true);
      };

      recog.onerror = (e: any) => {
        setErr(e?.error || "Speech recognition error");
        setListening(false);
      };

      recog.onend = () => {
        setListening(false);
        // When user stops talking, use the final transcript
        const q = finalTextRef.current.trim();
        if (q) runQuery(q);
      };

      recog.onresult = (event: any) => {
        let interim = "";
        let final = finalTextRef.current;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += transcript;
          else interim += transcript;
        }
        finalTextRef.current = final;
        setQuery((final + " " + interim).trim());
      };

      recogRef.current = recog;
    }
  }, []);

  async function runQuery(text: string) {
    setLoading(true);
    setErr(null);
    setResults([]);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, k }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setResults(data.matches || []);
      setFiltersEcho(data.filters || null); // from your API (NL → filters)
    } catch (e: any) {
      setErr(e?.message || "Query failed");
    } finally {
      setLoading(false);
    }
  }

  function startStop() {
    if (!supported) return;
    const recog = recogRef.current;
    if (!recog) return;
    if (listening) {
      try { recog.stop(); } catch {}
    } else {
      setResults([]);
      setFiltersEcho(null);
      setQuery("");
      try { recog.start(); } catch (e) { setErr("Mic start failed"); }
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {!supported && (
        <div className="rounded-md border p-3 text-sm">
          Your browser doesn’t support on-device speech recognition.
          You can still type a query below.
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={startStop}
          className={`px-4 py-2 rounded-xl border font-bold text-black ${listening ? "bg-red-100" : "bg-blue-100"}`}
          title={listening ? "Stop" : "Hold to speak"}
        >
          {listening ? "⏹ Stop" : "🎤 Speak"}
        </button>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border rounded-xl "
        />

        <button
          onClick={() => query && runQuery(query)}
          disabled={!query || loading}
          className="px-4 py-2 rounded-xl border bg-gray-100 disabled:opacity-50 font-bold text-black"
        >
          Search
        </button>
      </div>

      {loading && <div className="text-sm opacity-70">Searching…</div>}
      {err && <div className="text-sm text-red-600">Error: {err}</div>}

      {filtersEcho && (
        <div className="text-sm text-gray-600">
          Applied filters: <code className="text-xs">{JSON.stringify(filtersEcho)}</code>
        </div>
      )}

      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={r._id ?? i} className="rounded-lg border p-3">
            <div className="flex justify-between">
              <div className="font-medium">{r.vendor ?? "Unknown vendor"}</div>
              {typeof r.score === "number" && (
                <div className="text-xs opacity-70">score: {r.score.toFixed(3)}</div>
              )}
            </div>
            <div className="text-sm">
              #{r.invoiceNumber ?? "—"} • {r.date ?? "—"} • ${r.amount?.toFixed?.(2) ?? r.amount ?? "—"}
            </div>
            {r.category && <div className="text-xs mt-1">Category: {r.category}</div>}
            {r.tags?.length ? (
              <div className="text-xs mt-1">
                {r.tags.map(t => (
                  <span key={t} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-gray-100 rounded-full text-black">{t}</span>
                ))}
              </div>
            ) : null}
            {r.summary && <div className="text-sm mt-1 opacity-80">{r.summary}</div>}
          </div>
        ))}
        {!loading && !err && results.length === 0 && (
          <div className="text-sm opacity-70">No results yet.</div>
        )}
      </div>
    </div>
  );
}
