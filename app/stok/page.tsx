import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatWeight, rupiah } from "@/lib/units";
import { recordMovement } from "./actions";
import Nav from "@/components/Nav";

type Props = {
  searchParams: Promise<{ error?: string; ok?: string; filter?: string }>;
};

const input = "w-full rounded border p-3 text-base";

async function Content({ searchParams }: Props) {
  await connection();
  const { error, ok, filter } = await searchParams;

  // Validasi nilai filter agar aman (default: 'all')
  const activeFilter =
    filter === "in" || filter === "out" ? filter : "all";

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
    .select("id, name, stock_g, sack_weight_g")
    .eq("is_active", true)
    .order("name");

  // Bangun query riwayat stok dengan filter opsional
  let historyQuery = supabase
    .from("stock_movements")
    .select(
      "id, type, qty_g, note, reason, revenue, cost, created_at, products(name, sack_weight_g)",
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (activeFilter !== "all") {
    historyQuery = historyQuery.eq("type", activeFilter);
  }

  const { data: history } = await historyQuery;

  const fmt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });

  const tabs = [
    { key: "all", label: "Semua", href: "/stok" },
    { key: "in", label: "Barang masuk", href: "/stok?filter=in" },
    { key: "out", label: "Barang keluar", href: "/stok?filter=out" },
  ];

  return (
    <>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">
          Stok berhasil dicatat.
        </p>
      )}

      <form
        action={recordMovement}
        className="mb-8 grid gap-3 rounded border p-4 sm:grid-cols-2"
      >
        <select
          name="product_id"
          required
          className={input + " sm:col-span-2"}
          defaultValue=""
        >
          <option value="" disabled>
            Pilih produk
          </option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (stok: {formatWeight(p.stock_g, p.sack_weight_g)})
            </option>
          ))}
        </select>

        <select
          name="type"
          required
          className={input + " sm:col-span-2"}
          defaultValue="in"
        >
          <option value="in">Barang masuk (beli/restok)</option>
          <option value="out">Barang keluar (terjual/dipakai)</option>
        </select>

        <label className="text-sm sm:col-span-2">
          Alasan barang keluar
          <select name="reason" defaultValue="sale" className={input}>
            <option value="sale">Terjual (dihitung ke profit)</option>
            <option value="other">
              Dipakai / rusak / lainnya (tanpa profit)
            </option>
          </select>
        </label>

        <label className="text-sm">
          Karung
          <input
            name="sacks"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
            className={input}
          />
        </label>
        <label className="text-sm">
          Kilogram
          <input
            name="kg"
            type="number"
            min="0"
            step="any"
            defaultValue="0"
            className={input}
          />
        </label>
        <label className="text-sm">
          Gram
          <input
            name="grams"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
            className={input}
          />
        </label>
        <label className="text-sm">
          Catatan (opsional)
          <input
            name="note"
            placeholder="Misal: dari supplier A"
            className={input}
          />
        </label>

        <button className="rounded bg-green-700 p-2 text-white sm:col-span-2">
          Catat stok
        </button>
      </form>

      {/* Header & Tab Filter Riwayat */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Riwayat terbaru</h2>
        <div className="flex gap-1 rounded-lg border bg-gray-50 p-1 text-xs font-medium">
          {tabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                scroll={false}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  isActive
                    ? "bg-green-700 text-white shadow-xs"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <ul className="divide-y rounded border text-sm">
        {history?.length ? (
          history.map((m) => {
            const prod = Array.isArray(m.products) ? m.products[0] : m.products;
            return (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div>
                  {prod?.name}
                  <div className="text-xs text-gray-500">
                    {fmt.format(new Date(m.created_at))}
                    {m.note ? " · " + m.note : ""}
                    {m.reason === "sale"
                      ? " · Terjual" +
                        (isOwner
                          ? ", profit " +
                            rupiah(Number(m.revenue) - Number(m.cost))
                          : "")
                      : ""}
                  </div>
                </div>
                <b
                  className={
                    m.type === "in" ? "text-green-700" : "text-red-700"
                  }
                >
                  {m.type === "in" ? "+" : "−"}
                  {formatWeight(m.qty_g, prod?.sack_weight_g ?? 1)}
                </b>
              </li>
            );
          })
        ) : (
          <li className="p-6 text-center text-gray-500">
            {activeFilter === "in"
              ? "Belum ada catatan barang masuk."
              : activeFilter === "out"
                ? "Belum ada catatan barang keluar."
                : "Belum ada catatan stok."}
          </li>
        )}
      </ul>
    </>
  );
}

export default function StokPage({ searchParams }: Props) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Catat stok</h1>
        </div>
        <Suspense fallback={<p>Memuat…</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}