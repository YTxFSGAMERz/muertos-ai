import { notFound } from 'next/navigation';
import Link from 'next/link';
import OfrendaDisplay from '@/components/OfrendaDisplay';

interface Props {
  params: Promise<{ id: string }>;
}

async function getOfrenda(id: string) {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${API}/api/ofrenda/all`, { cache: 'no-store' });
    const data = await res.json();
    return data.ofrendas?.find((o: any) => o.id === id) || null;
  } catch {
    return null;
  }
}

export default async function OfrendaPage({ params }: Props) {
  const { id } = await params;
  const ofrenda = await getOfrenda(id);
  if (!ofrenda) return notFound();

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-amber-700 hover:text-amber-500 text-sm mb-8 inline-block">← Return to the altar</Link>
        <OfrendaDisplay ofrenda={ofrenda} />
      </div>
    </main>
  );
}
