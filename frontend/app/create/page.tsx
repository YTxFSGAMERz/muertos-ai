'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 'form' | 'processing' | 'done' | 'error';

interface FormData {
  name: string;
  birth_year: string;
  death_year: string;
  relationship: string;
  story: string;
}

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>({ name: '', birth_year: '', death_year: '', relationship: '', story: '' });
  const [workflowId, setWorkflowId] = useState('');
  const [mongoId, setMongoId] = useState('');
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [status, setStatus] = useState('Preparing the altar…');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setStep('processing');
    setStatus('Lighting the first candle… 🕯️');

    try {
      const res = await fetch(`${API}/api/ofrenda/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          birth_year: form.birth_year ? Number(form.birth_year) : undefined,
          death_year: form.death_year ? Number(form.death_year) : undefined,
          relationship: form.relationship.trim() || undefined,
          story: form.story.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setWorkflowId(data.workflow_id);
      setMongoId(data.mongo_id);

      // Poll for completion (Temporal workflow)
      pollStatus(data.workflow_id, data.mongo_id);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStep('error');
    }
  };

  const pollStatus = async (wfId: string, mId: string, attempt = 0) => {
    const messages = [
      'Searching for memories from their era… 🔍',
      'SerpApi is finding historical context… 📜',
      'Gemma is writing the memorial narrative… ✍️',
      'The open-weight model is choosing its words… 🌙',
      'ElevenLabs is giving the words a voice… 🎙️',
      'Storing your tribute in Tiger Data + MongoDB… 💾',
      'The candles are almost fully lit… 🕯️🕯️🕯️',
      'Nearly ready — your ofrenda is taking form… 🌼',
    ];

    setStatus(messages[Math.min(attempt, messages.length - 1)]);
    setPollCount(attempt);

    try {
      const res = await fetch(`${API}/api/ofrenda/${wfId}/status`);
      const data = await res.json();

      if (data.status === 'complete') {
        setStep('done');
        setTimeout(() => router.push(`/ofrenda/${mId}`), 1500);
        return;
      }
      if (data.status === 'error') {
        setError(data.error || 'The spirits could not be reached');
        setStep('error');
        return;
      }
    } catch (err) {
      // Network blip — keep polling
    }

    if (attempt < 60) {
      setTimeout(() => pollStatus(wfId, mId, attempt + 1), 3000);
    } else {
      // Timeout — redirect to ofrenda page anyway; it may just be slow
      router.push(`/ofrenda/${mId}`);
    }
  };

  if (step === 'processing' || step === 'done') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="flex justify-center gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="candle-flame" style={{ animationDelay: `${i * 0.4}s` }} />
                <div className="w-2 h-16 bg-gradient-to-b from-amber-100 to-amber-200 rounded-sm opacity-80" />
              </div>
            ))}
          </div>

          {step === 'done' ? (
            <>
              <div className="text-5xl mb-4 animate-bounce">🌼</div>
              <h2 className="font-display text-3xl text-amber-400 mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                The ofrenda is ready
              </h2>
              <p className="text-amber-600">Opening the altar…</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4 animate-pulse">🕯️</div>
              <h2 className="font-display text-2xl text-amber-400 mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                Preparing the ofrenda
              </h2>
              <p className="text-amber-300/70 mb-6">{status}</p>

              {/* Pipeline progress */}
              <div className="space-y-2 text-left bg-altar-card border border-amber-900/30 rounded-xl p-4">
                {[
                  { label: 'Historical context (SerpApi)', done: pollCount >= 2 },
                  { label: 'Narrative (Gemma open-weight AI)', done: pollCount >= 5 },
                  { label: 'Voice narration (ElevenLabs)', done: pollCount >= 7 },
                  { label: 'Memory storage (Tiger Data + MongoDB)', done: pollCount >= 8 },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className={done ? 'text-amber-400' : 'text-amber-900'}>{done ? '✓' : '○'}</span>
                    <span className={done ? 'text-amber-300' : 'text-amber-800 text-sm'}>{label}</span>
                  </div>
                ))}
              </div>

              <p className="text-amber-900 text-xs mt-4">
                Temporal ensures your tribute is never lost — even if a service hiccups
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  if (step === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">💀</div>
          <h2 className="font-display text-2xl text-rose-400 mb-3">The spirits couldn't be reached</h2>
          <p className="text-amber-700 mb-6">{error}</p>
          <button onClick={() => setStep('form')} className="px-6 py-3 bg-amber-800 hover:bg-amber-700 rounded-full text-amber-200">
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-amber-700 hover:text-amber-500 text-sm mb-8 inline-block">← Back to the altar</Link>

        <div className="text-center mb-10">
          <div className="petal-sep text-xl mb-4">✿ ✦ ✿</div>
          <h1 className="font-display text-4xl text-amber-400 mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            Create an Ofrenda
          </h1>
          <p className="text-amber-600 italic">
            Tell us about your loved one. Our open-source AI will craft a memorial tribute — private, forever yours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-altar-card border border-amber-900/30 rounded-2xl p-8">
          {/* Name */}
          <div>
            <label className="block text-amber-400 text-sm font-semibold mb-2">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="María Guadalupe Hernández"
              className="w-full bg-altar-bg border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-900/50 focus:outline-none focus:border-amber-600 transition-colors"
            />
          </div>

          {/* Years */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-amber-400 text-sm font-semibold mb-2">Birth Year</label>
              <input
                type="number"
                min="1800" max="2026"
                value={form.birth_year}
                onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                placeholder="1945"
                className="w-full bg-altar-bg border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-900/50 focus:outline-none focus:border-amber-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-amber-400 text-sm font-semibold mb-2">Year of Passing</label>
              <input
                type="number"
                min="1800" max="2026"
                value={form.death_year}
                onChange={e => setForm(f => ({ ...f, death_year: e.target.value }))}
                placeholder="2023"
                className="w-full bg-altar-bg border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-900/50 focus:outline-none focus:border-amber-600 transition-colors"
              />
            </div>
          </div>

          {/* Relationship */}
          <div>
            <label className="block text-amber-400 text-sm font-semibold mb-2">Relationship</label>
            <input
              type="text"
              value={form.relationship}
              onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
              placeholder="My grandmother, beloved mother of five…"
              className="w-full bg-altar-bg border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-900/50 focus:outline-none focus:border-amber-600 transition-colors"
            />
          </div>

          {/* Story */}
          <div>
            <label className="block text-amber-400 text-sm font-semibold mb-2">Their Story</label>
            <textarea
              value={form.story}
              onChange={e => setForm(f => ({ ...f, story: e.target.value }))}
              placeholder="She used to wake before the sun to make tortillas by hand. She survived hardship with grace, always with a song on her lips…"
              rows={6}
              className="w-full bg-altar-bg border border-amber-900/40 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-900/50 focus:outline-none focus:border-amber-600 transition-colors resize-none"
            />
            <p className="text-amber-900 text-xs mt-1">The more you share, the more personal the tribute will be.</p>
          </div>

          <div className="bg-altar-bg border border-amber-900/20 rounded-xl p-4 text-amber-900 text-xs space-y-1">
            <p>🔒 <strong className="text-amber-800">Privacy first:</strong> Powered by Gemma (open-weight AI). Your story stays on our server — never shared with a closed AI API.</p>
            <p>⏱️ <strong className="text-amber-800">Temporal-backed:</strong> If anything fails, the workflow retries automatically. Your tribute will never be lost.</p>
          </div>

          <button type="submit"
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-lg">
            🕯️ Light the Candle — Create Ofrenda
          </button>
        </form>
      </div>
    </main>
  );
}
