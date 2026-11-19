import { Suspense } from 'react'
import Link from 'next/link'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatWeight, rupiah } from '@/lib/units'
import { addProduct } from './actions'

type Props = { searchParams: Promise<{ error?: string }> }

const input = 'w-full rounded border p-2'

async function Content({ searchParams }: Props) {
  await connection()
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const isOwner = profile?.role === 'owner'

  const { data: products } = await supabase
    .from('product_stock').select('*').eq('is_active', true).order('name')

  return (
    <>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {isOwner && (
        <details className="mb-6 rounded border p-4">
          <summary className="cursor-pointer font-medium">Tambah produk</summary>
          <form action={addProduct} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" placeholder="Nama produk" required className={input} />
            <input name="sku" placeholder="Kode/SKU (opsional)" className={input} />
            <input name="category" placeholder="Kategori (misal: Ayam)" className={input} />
            <input name="sack_kg" type="number" step="any" min="0.001" required
              placeholder="Isi 1 karung (kg)" className={input} />
            <input name="buy_price_per_sack" type="number" min="0" required
              placeholder="Harga beli per karung (Rp)" className={input} />
            <input name="sell_price_per_sack" type="number" min="0" required
              placeholder="Harga jual per karung (Rp)" className={input} />
            <input name="sell_price_per_kg" type="number" min="0" required
              placeholder="Harga jual per kg (Rp)" className={input} />
            <input name="min_kg" type="number" step="any" min="0" required
              placeholder="Stok minimum (kg)" className={input} />
            <button className="rounded bg-green-700 p-2 text-white sm:col-span-2">
              Simpan produk
            </button>
          </form>
        </details>
      )}

      <div className="overflow-x-auto rounded border">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">Produk</th>
              <th className="p-3">Stok</th>
              <th className="p-3">Jual/kg</th>
              <th className="p-3">Jual/karung</th>
              <th className="p-3">Beli/karung</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {products?.length ? products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3">
                  {p.name}
                  <div className="text-xs text-gray-500">
                    {[p.sku, p.category].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="p-3">{formatWeight(p.stock_g, p.sack_weight_g)}</td>
                <td className="p-3">{rupiah(p.sell_price_per_kg)}</td>
                <td className="p-3">{rupiah(p.sell_price_per_sack)}</td>
                <td className="p-3">{rupiah(p.buy_price_per_sack)}</td>
                <td className="p-3">
                  {p.stock_g <= 0 ? 'Habis' : p.stock_g <= p.min_stock_g ? 'Menipis' : 'Aman'}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">
                Belum ada produk.{isOwner ? ' Klik “Tambah produk” untuk mulai.' : ''}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function ProdukPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produk</h1>
        <Link href="/" className="text-sm underline">Beranda</Link>
      </div>
      <Suspense fallback={<p>Memuat…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  )
}   