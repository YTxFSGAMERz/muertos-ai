'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Ofrenda {
  id: string;
  name: string;
  birth_year?: number;
  death_year?: number;
  relationship?: string;
  narrative?: string;
  voice_url?: string;
  historical_context?: {
    events: string[];
    songs: string[];
    era_summary: string;
  };
  created_at: string;
}

export default function HomePage() {
  const [ofrendas, setOfrendas] = useState<Ofrenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${API}/api/ofrenda/all`)
      .then(r => r.json())
      .then(d => { setOfrendas(d.ofrendas || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`${API}/api/ofrenda/search?q=${encodeURIComponent(searchQuery)}`);
      const d = await r.json();
      setSearchResults(d.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header / Altar top */}
      <header className="relative border-b border-amber-900/30 bg-gradient-to-b from-[#130d10] to-altar-bg">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          {/* Candles row */}
          <div className="flex justify-center gap-12 mb-8 opacity-70">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="candle-flame" style={{ animationDelay: `${i * 0.3}s` }} />
                <div className="w-2 h-12 bg-gradient-to-b from-amber-100 to-amber-200 rounded-sm opacity-80" />
              </div>
            ))}
          </div>

          <div className="petal-sep text-2xl mb-4">✿ ✦ ✿</div>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-amber-400 mb-3" style={{ fontFamily: 'Playfair Display, serif', textShadow: '0 0 40px rgba(245,158,11,0.4)' }}>
            Muertos.ai
          </h1>
          <p className="text-amber-200/70 text-lg italic mb-2">Digital Ofrenda — Día de los Muertos</p>
          <p className="text-amber-100/50 text-sm max-w-xl mx-auto">
            A sacred space where memories live on. Powered by <span className="text-amber-400">Gemma</span> (open-weight AI) —
            your stories stay private, forever yours.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link href="/create"
              className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              🕯️ Create an Ofrenda
            </Link>
            <a href="#altar"
              className="px-8 py-3 border border-amber-700 hover:border-amber-500 text-amber-300 rounded-full transition-all duration-300">
              View the Altar ↓
            </a>
          </div>
        </div>
      </header>

      {/* Semantic Search — Tiger Data / pgvector */}
      <section className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search memories… (e.g. 'grandmother who loved cooking')"
            className="flex-1 bg-altar-card border border-amber-900/40 rounded-full px-5 py-3 text-amber-100 placeholder-amber-900/60 focus:outline-none focus:border-amber-600 transition-colors"
          />
          <button type="submit" disabled={searching}
            className="px-6 py-3 bg-amber-800 hover:bg-amber-700 rounded-full text-amber-200 transition-colors disabled:opacity-50">
            {searching ? '🔮…' : '🔍 Search'}
          </button>
        </form>
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-amber-600 text-sm">Souls found in memory (semantic search via pgvector):</p>
            {searchResults.map((r: any) => (
              <Link key={r.id} href={`/ofrenda/${r.id}`}
                className="block p-3 bg-altar-card border border-amber-900/30 rounded-xl hover:border-amber-700 transition-colors">
                <span className="text-amber-300 font-semibold">{r.name}</span>
                <span className="text-amber-600/70 text-xs ml-3">similarity: {(r.similarity * 100).toFixed(1)}%</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* The Altar — ofrenda grid */}
      <section id="altar" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="petal-sep text-xl mb-10">✿ ✦ The Altar ✦ ✿</div>

        {loading ? (
          <div className="text-center text-amber-700 py-20 animate-pulse">
            <div className="text-5xl mb-4">🕯️</div>
            <p>Lighting the candles…</p>
          </div>
        ) : ofrendas.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-float">🌼</div>
            <p className="text-amber-700 text-lg">The altar awaits its first tribute.</p>
            <p className="text-amber-900 text-sm mt-2">Be the first to light a candle.</p>
            <Link href="/create" className="mt-6 inline-block text-amber-500 hover:text-amber-400 underline">
              Create the first ofrenda →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ofrendas.map((o, i) => (
              <Link key={o.id} href={`/ofrenda/${o.id}`}
                className="block group bg-altar-card border border-amber-900/30 rounded-2xl p-6 hover:border-amber-600/60 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">🌼</div>
                  <div className="text-amber-800 text-xs">
                    {o.birth_year && o.death_year ? `${o.birth_year} – ${o.death_year}` : ''}
                  </div>
                </div>
                <h3 className="font-display text-xl text-amber-300 mb-1 group-hover:text-amber-200 transition-colors"
                  style={{ fontFamily: 'Playfair Display, serif' }}>
                  {o.name}
                </h3>
                {o.relationship && (
                  <p className="text-amber-700 text-sm italic mb-3">{o.relationship}</p>
                )}
                {o.narrative && (
                  <p className="text-amber-100/60 text-sm line-clamp-3 leading-relaxed">
                    {o.narrative.slice(0, 120)}…
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-amber-600 text-xs">
                  {o.voice_url && <span>🎙️ Audio</span>}
                  {o.historical_context && <span>📜 Era context</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-900/20 text-center py-8 text-amber-900 text-xs">
        <p>Built for Hacktoberfest 2026 · Powered by <a href="https://ai.google.dev/gemma" className="text-amber-700 hover:text-amber-500">Gemma</a> (open-weight) · Ghost in the Machine</p>
        <p className="mt-1">🌼 Que en paz descansen · May they rest in peace 🌼</p>
      </footer>
    </main>
  );
}
