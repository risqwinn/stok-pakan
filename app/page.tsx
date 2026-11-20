import { Suspense } from 'react'
import Link from 'next/link'
import { connection } from 'next/server'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { rupiah } from '@/lib/units'
import { site, waLink, mapEmbed, mapLink } from '@/lib/site'

async function Catalog() {
  await connection()
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('public_catalog').select('*').order('name')

  if (!items?.length) {
    return (
      <p className="rounded-lg border bg-white p-6 text-center text-gray-500">
        Katalog segera hadir.
      </p>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <li key={p.id} className="flex flex-col rounded-lg border bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{p.name}</h3>
              {p.category && <p className="text-xs text-gray-500">{p.category}</p>}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              p.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {p.in_stock ? 'Tersedia' : 'Habis'}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Per kg</dt>
              <dd className="font-semibold">{rupiah(p.sell_price_per_kg)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Per karung</dt>
              <dd className="font-semibold">{rupiah(p.sell_price_per_sack)}</dd>
            </div>
          </dl>
          <a
            href={waLink(`Halo ${site.name}, saya ingin ${p.in_stock ? 'memesan' : 'menanyakan ketersediaan'} ${p.name}.`)}
            target="_blank" rel="noopener noreferrer"
            className="mt-4 rounded-lg bg-green-700 p-3 text-center text-sm font-medium text-white"
          >
            {p.in_stock ? 'Pesan via WhatsApp' : 'Tanya ketersediaan'}
          </a>
        </li>
      ))}
    </ul>
  )
}

async function QrCode() {
  const src = await QRCode.toDataURL(site.url, { width: 240, margin: 1 })
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`QR Code menuju ${site.url}`} width={160} height={160}
      className="rounded border bg-white p-2" />
  )
}

export default function Landing() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
          <span className="font-semibold text-green-800">{site.name}</span>
          <nav className="flex flex-1 justify-end gap-1 text-sm">
            <a href="#katalog" className="rounded px-3 py-2 hover:bg-green-50">Katalog</a>
            <a href="#lokasi" className="rounded px-3 py-2 hover:bg-green-50">Lokasi</a>
            <Link href="/login" className="rounded border px-3 py-2">Masuk</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-green-800 px-4 py-14 text-white sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-3xl font-bold sm:text-5xl">{site.name}</h1>
            <p className="mt-3 max-w-xl text-lg text-green-50">{site.tagline}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={waLink(`Halo ${site.name}, saya ingin memesan pakan.`)}
                target="_blank" rel="noopener noreferrer"
                className="rounded-lg bg-white px-5 py-3 text-center font-semibold text-green-800"
              >
                Pesan via WhatsApp
              </a>
              <a href="#katalog"
                className="rounded-lg border border-white/60 px-5 py-3 text-center font-semibold">
                Lihat Katalog
              </a>
            </div>
          </div>
        </section>

        <section id="katalog" className="mx-auto w-full max-w-5xl scroll-mt-16 px-4 py-10">
          <h2 className="mb-1 text-2xl font-semibold">Katalog produk</h2>
          <p className="mb-5 text-sm text-gray-600">
            Harga dan ketersediaan mengikuti stok terbaru di kios kami.
          </p>
          <Suspense fallback={<p className="text-gray-500">Memuat katalog…</p>}>
            <Catalog />
          </Suspense>
        </section>

        <section id="lokasi" className="scroll-mt-16 bg-white px-4 py-10">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold">Lokasi &amp; kontak</h2>
              <p className="mt-3">{site.address}</p>
              <p className="mt-2 text-sm text-gray-600">Patokan: {site.landmark}</p>
              <p className="mt-2 text-sm text-gray-600">Jam buka: {site.hours}</p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <a
                  href={waLink(`Halo ${site.name}, saya ingin bertanya.`)}
                  target="_blank" rel="noopener noreferrer"
                  className="rounded-lg bg-green-700 px-5 py-3 text-center font-medium text-white"
                >
                  Hubungi via WhatsApp
                </a>
                <a href={mapLink} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border px-5 py-3 text-center font-medium">
                  Buka di Google Maps
                </a>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <Suspense fallback={<div className="h-40 w-40 rounded bg-gray-100" />}>
                  <QrCode />
                </Suspense>
                <p className="text-sm text-gray-600">
                  Pindai kode QR ini untuk membuka website kami di ponsel Anda.
                </p>
              </div>
            </div>

            <iframe
              title={`Peta lokasi ${site.name}`}
              src={mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full rounded-lg border md:h-full md:min-h-80"
            />
          </div>
        </section>
      </main>

      <footer className="border-t bg-white px-4 py-6 text-center text-sm text-gray-500">
        © {site.name}
      </footer>
    </>
  )
}