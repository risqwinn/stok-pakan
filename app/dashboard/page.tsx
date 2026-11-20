import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { formatWeight, rupiah, namaBulan } from "@/lib/units";

async function Dashboard() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: products },
    { data: profit },
    { data: monthly },
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("product_stock")
      .select("*")
      .eq("is_active", true)
      .order("name"),
    supabase.from("profit_summary").select("*").single(),
    supabase
      .from("monthly_profit")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12),
  ]);

  const isOwner = profile?.role === "owner";
  const totalProfit = Number(profit?.total_profit ?? 0);
  const monthProfit = Number(profit?.month_profit ?? 0);
  const totalRevenue = Number(profit?.total_revenue ?? 0);

  const list = products ?? [];
  const needRestock = list
    .filter((p) => p.stock_g <= p.min_stock_g)
    .sort((a, b) => a.stock_g - b.stock_g);

  // Perkiraan nilai stok = stok (dalam karung) x harga beli per karung
  const totalValue = list.reduce(
    (sum, p) =>
      sum +
      (Math.max(p.stock_g, 0) / p.sack_weight_g) * Number(p.buy_price_per_sack),
    0,
  );

  return (
    <>
      <p className="mb-4 text-sm text-gray-500">
        Masuk sebagai <b className="text-gray-800">{user.email}</b> (
        {profile?.role === "owner" ? "Pemilik" : "Karyawan"})
      </p>

      <div className={`mb-6 grid grid-cols-2 gap-3 ${isOwner ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {isOwner && (
          <div className="col-span-2 rounded-lg border border-green-300 bg-green-50 p-4 sm:col-span-3">
            <p className="text-sm text-gray-600">Total profit</p>
            <p className="text-3xl font-bold text-green-800">
              {rupiah(totalProfit)}
            </p>
            <p className="text-xs text-gray-500">
              Bulan ini: {rupiah(monthProfit)} · dari {rupiah(totalRevenue)}{" "}
              penjualan
            </p>
          </div>
        )}
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Jenis produk</p>
          <p className="text-2xl font-semibold">{list.length}</p>
        </div>

        <div
          className={`rounded-lg border p-4 ${
            needRestock.length ? "border-yellow-300 bg-yellow-50" : "bg-white"
          }`}
        >
          <p className="text-sm text-gray-500">Perlu restok</p>
          <p className="text-2xl font-semibold">{needRestock.length}</p>
        </div>

        {isOwner && (
          <div className="col-span-2 rounded-lg border bg-white p-4 sm:col-span-1">
            <p className="text-sm text-gray-500">Perkiraan nilai stok</p>
            <p className="text-2xl font-semibold">
              {rupiah(Math.round(totalValue))}
            </p>
            <p className="text-xs text-gray-400">Berdasarkan harga beli</p>
          </div>
        )}
      </div>

      {isOwner && (
        <section className="mb-6 rounded-lg border bg-white">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <h2 className="font-semibold">Profit per bulan</h2>
            <a
              href="/laporan/profit"
              className="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white"
            >
              Unduh Excel
            </a>
          </div>
          {monthly?.length ? (
            <ul className="divide-y text-sm">
              {monthly.map((m) => (
                <li
                  key={`${m.year}-${m.month}`}
                  className="flex justify-between p-4"
                >
                  <span>
                    {namaBulan[m.month - 1]} {m.year}
                  </span>
                  <b>{rupiah(Number(m.profit))}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-gray-500">
              Belum ada penjualan tercatat.
            </p>
          )}
        </section>
      )}

      <h2 className="mb-2 text-lg font-semibold">Perlu direstok</h2>
      {needRestock.length ? (
        <ul className="divide-y rounded-lg border bg-white">
          {needRestock.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-gray-500">
                  Minimum: {formatWeight(p.min_stock_g, p.sack_weight_g)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${p.stock_g <= 0 ? "text-red-700" : "text-yellow-700"}`}
                >
                  {formatWeight(p.stock_g, p.sack_weight_g)}
                </p>
                <p className="text-xs text-gray-500">
                  {p.stock_g <= 0 ? "Habis" : "Menipis"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border bg-white p-6 text-center text-gray-500">
          {list.length ? "Semua stok aman. 👍" : "Belum ada produk."}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/stok"
          className="flex-1 rounded-lg bg-green-700 p-3 text-center text-white"
        >
          Catat stok
        </Link>
        <Link
          href="/produk"
          className="flex-1 rounded-lg border bg-white p-3 text-center"
        >
          Lihat produk
        </Link>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <h1 className="mb-1 text-2xl font-semibold">Beranda</h1>
        <Suspense fallback={<p className="mt-4">Memuat…</p>}>
          <Dashboard />
        </Suspense>
      </main>
    </>
  );
}
