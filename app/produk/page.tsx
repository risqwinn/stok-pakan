import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { formatWeight, rupiah } from "@/lib/units";
import { addProduct } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

const input = "w-full rounded border p-3 text-base";

function Badge({ stock, min }: { stock: number; min: number }) {
  const [label, cls] =
    stock <= 0
      ? ["Habis", "bg-red-100 text-red-800"]
      : stock <= min
        ? ["Menipis", "bg-yellow-100 text-yellow-800"]
        : ["Aman", "bg-green-100 text-green-800"];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

async function Content({ searchParams }: Props) {
  await connection();
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isOwner = profile?.role === "owner";

  const { data: products } = await supabase
    .from("product_stock")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {isOwner && (
        <details className="mb-6 rounded-lg border bg-white p-4">
          <summary className="cursor-pointer font-medium">
            Tambah produk
          </summary>
          <form action={addProduct} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Nama produk"
              required
              className={input}
            />
            <input
              name="sku"
              placeholder="Kode/SKU (opsional)"
              className={input}
            />
            <input
              name="category"
              placeholder="Kategori (misal: Ayam)"
              className={input}
            />
            <input
              name="sack_kg"
              type="number"
              step="any"
              min="0.001"
              required
              placeholder="Isi 1 karung (kg)"
              className={input}
            />
            <input
              name="buy_price_per_sack"
              type="number"
              min="0"
              required
              placeholder="Harga beli per karung (Rp)"
              className={input}
            />
            <input
              name="sell_price_per_sack"
              type="number"
              min="0"
              required
              placeholder="Harga jual per karung (Rp)"
              className={input}
            />
            <input
              name="sell_price_per_kg"
              type="number"
              min="0"
              required
              placeholder="Harga jual per kg (Rp)"
              className={input}
            />
            <input
              name="min_kg"
              type="number"
              step="any"
              min="0"
              required
              placeholder="Stok minimum (kg)"
              className={input}
            />
            <button className="rounded bg-green-700 p-3 text-white sm:col-span-2">
              Simpan produk
            </button>
          </form>
        </details>
      )}

      {!products?.length && (
        <p className="rounded-lg border bg-white p-6 text-center text-gray-500">
          Belum ada produk.
          {isOwner ? " Buka “Tambah produk” di atas untuk mulai." : ""}
        </p>
      )}

      {/* Tampilan HP: kartu */}
      <ul className="space-y-3 md:hidden">
        {products?.map((p) => (
          <li key={p.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {[p.sku, p.category].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Badge stock={p.stock_g} min={p.min_stock_g} />
            </div>
            <p className="mt-2 text-lg font-semibold">
              {formatWeight(p.stock_g, p.sack_weight_g)}
            </p>
            <dl
              className={`mt-2 grid gap-2 text-xs text-gray-600 ${isOwner ? "grid-cols-3" : "grid-cols-2"}`}
            >
              <div>
                <dt>Jual/kg</dt>
                <dd className="font-medium text-gray-900">
                  {rupiah(p.sell_price_per_kg)}
                </dd>
              </div>
              <div>
                <dt>Jual/karung</dt>
                <dd className="font-medium text-gray-900">
                  {rupiah(p.sell_price_per_sack)}
                </dd>
              </div>
              {isOwner && (
                <div>
                  <dt>Beli/karung</dt>
                  <dd className="font-medium text-gray-900">
                    {rupiah(p.buy_price_per_sack)}
                  </dd>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>

      {/* Tampilan layar besar: tabel */}
      {!!products?.length && (
        <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3">Produk</th>
                <th className="p-3">Stok</th>
                <th className="p-3">Jual/kg</th>
                <th className="p-3">Jual/karung</th>
                {isOwner && <th className="p-3">Beli/karung</th>}
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">
                    {p.name}
                    <div className="text-xs text-gray-500">
                      {[p.sku, p.category].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td className="p-3">
                    {formatWeight(p.stock_g, p.sack_weight_g)}
                  </td>
                  <td className="p-3">{rupiah(p.sell_price_per_kg)}</td>
                  <td className="p-3">{rupiah(p.sell_price_per_sack)}</td>
                  {isOwner && <td className="p-3">{rupiah(p.buy_price_per_sack)}</td>}
                  <td className="p-3">
                    <Badge stock={p.stock_g} min={p.min_stock_g} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ProdukPage({ searchParams }: Props) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        <h1 className="mb-4 text-2xl font-semibold">Produk</h1>
        <Suspense fallback={<p>Memuat…</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
