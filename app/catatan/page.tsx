import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { formatWeight, rupiah } from "@/lib/units";

type Props = { searchParams: Promise<{ tanggal?: string }> };

function todayWIB() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date()); // Hasil format: YYYY-MM-DD
}

async function Content({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const tanggal =
    params.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(params.tanggal)
      ? params.tanggal
      : todayWIB();

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

  // Rentang waktu 1 hari penuh sesuai WIB (+07:00)
  const startOfDay = `${tanggal}T00:00:00+07:00`;
  const endOfDay = `${tanggal}T23:59:59.999+07:00`;

  const { data: rows } = await supabase
    .from("stock_movements")
    .select(
      "id, type, qty_g, note, reason, revenue, cost, created_at, products(name, sack_weight_g)"
    )
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay)
    .order("created_at", { ascending: false });

  const movements = rows ?? [];

  // Hitung ringkasan harian
  const totalMasuk = movements.filter((m) => m.type === "in").length;
  const totalKeluar = movements.filter((m) => m.type === "out").length;
  const profitHarian = movements.reduce((sum, m) => {
    if (m.type === "out" && m.reason === "sale") {
      return sum + (Number(m.revenue ?? 0) - Number(m.cost ?? 0));
    }
    return sum;
  }, 0);

  const timeFmt = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  const dateFmt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  });

  return (
    <>
      {/* Filter Tanggal & Tombol Unduh Excel */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-white p-4">
        <form method="GET" className="flex flex-1 items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Pilih tanggal</span>
            <input
              type="date"
              name="tanggal"
              defaultValue={tanggal}
              className="rounded border px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white"
          >
            Tampilkan
          </button>
        </form>

        <a
          href={`/laporan/harian?tanggal=${tanggal}`}
          className="rounded-lg border border-green-700 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
        >
          Unduh Excel
        </a>
      </div>

      <p className="mb-3 text-sm text-gray-600">
        Menampilkan catatan untuk:{" "}
        <b className="text-gray-900">
          {dateFmt.format(new Date(`${tanggal}T12:00:00+07:00`))}
        </b>
      </p>

      {/* Kartu Ringkasan Harian */}
      <div
        className={`mb-6 grid grid-cols-2 gap-3 ${isOwner ? "sm:grid-cols-3" : ""}`}
      >
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Barang masuk</p>
          <p className="text-xl font-semibold text-green-700">
            {totalMasuk} kali
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">Barang keluar</p>
          <p className="text-xl font-semibold text-red-700">
            {totalKeluar} kali
          </p>
        </div>
        {isOwner && (
          <div className="col-span-2 rounded-lg border border-green-300 bg-green-50 p-4 sm:col-span-1">
            <p className="text-xs text-gray-600">Profit hari ini</p>
            <p className="text-xl font-bold text-green-800">
              {rupiah(profitHarian)}
            </p>
          </div>
        )}
      </div>

      {/* Daftar Transaksi Harian */}
      <ul className="divide-y rounded-lg border bg-white text-sm">
        {movements.length ? (
          movements.map((m) => {
            const prod = Array.isArray(m.products) ? m.products[0] : m.products;
            const itemProfit = Number(m.revenue ?? 0) - Number(m.cost ?? 0);

            return (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {prod?.name ?? "Produk dihapus"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Pukul {timeFmt.format(new Date(m.created_at))} WIB
                    {m.type === "in"
                      ? " · Masuk (Restok)"
                      : m.reason === "sale"
                        ? " · Terjual"
                        : " · Keluar (Non-penjualan)"}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                  {isOwner && m.type === "out" && m.reason === "sale" && (
                    <p className="mt-0.5 text-xs text-green-700">
                      Omzet: {rupiah(Number(m.revenue ?? 0))} · Profit:{" "}
                      {rupiah(itemProfit)}
                    </p>
                  )}
                </div>

                <b
                  className={`shrink-0 ${
                    m.type === "in" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {m.type === "in" ? "+" : "−"}
                  {formatWeight(m.qty_g, prod?.sack_weight_g ?? 1)}
                </b>
              </li>
            );
          })
        ) : (
          <li className="p-8 text-center text-gray-500">
            Tidak ada catatan keluar-masuk pakan pada tanggal ini.
          </li>
        )}
      </ul>
    </>
  );
}

export default function CatatanHarianPage({ searchParams }: Props) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <h1 className="mb-4 text-2xl font-semibold">Catatan harian</h1>
        <Suspense fallback={<p>Memuat catatan…</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}