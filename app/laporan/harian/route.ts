import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { formatWeight } from "@/lib/units";

const RP = '"Rp" #,##0';

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF15803D" },
  };
  row.alignment = { vertical: "middle" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function todayWIB() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Harus login.", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isOwner = profile?.role === "owner";

  const { searchParams } = new URL(request.url);
  const rawTanggal = searchParams.get("tanggal");
  const tanggal =
    rawTanggal && /^\d{4}-\d{2}-\d{2}$/.test(rawTanggal)
      ? rawTanggal
      : todayWIB();

  const startOfDay = `${tanggal}T00:00:00+07:00`;
  const endOfDay = `${tanggal}T23:59:59.999+07:00`;

  const { data: rows, error } = await supabase
    .from("stock_movements")
    .select(
      "id, type, qty_g, note, reason, revenue, cost, created_at, products(name, sack_weight_g)"
    )
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay)
    .order("created_at", { ascending: true });

  if (error) return new Response(error.message, { status: 500 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kios Pakan Marvin";

  const ws = wb.addWorksheet(`Catatan ${tanggal}`);

  const baseColumns: Partial<ExcelJS.Column>[] = [
    { header: "Jam (WIB)", key: "time", width: 12 },
    { header: "Produk", key: "product", width: 26 },
    { header: "Jenis", key: "type", width: 16 },
    { header: "Keterangan", key: "reason", width: 20 },
    { header: "Jumlah", key: "qty", width: 18 },
    { header: "Catatan", key: "note", width: 28 },
  ];

  if (isOwner) {
    baseColumns.push(
      { header: "Pendapatan", key: "revenue", width: 18, style: { numFmt: RP } },
      { header: "Modal (HPP)", key: "cost", width: 18, style: { numFmt: RP } },
      { header: "Profit", key: "profit", width: 18, style: { numFmt: RP } }
    );
  }

  ws.columns = baseColumns;
  styleHeader(ws);

  const timeFmt = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  (rows ?? []).forEach((m) => {
    const prod = Array.isArray(m.products) ? m.products[0] : m.products;
    const rev = m.type === "out" && m.reason === "sale" ? Number(m.revenue ?? 0) : 0;
    const cost = m.type === "out" && m.reason === "sale" ? Number(m.cost ?? 0) : 0;
    const profit = rev - cost;

    totalRevenue += rev;
    totalCost += cost;
    totalProfit += profit;

    const rowData: Record<string, string | number> = {
      time: timeFmt.format(new Date(m.created_at)),
      product: prod?.name ?? "-",
      type: m.type === "in" ? "Barang Masuk" : "Barang Keluar",
      reason:
        m.type === "in"
          ? "Restok"
          : m.reason === "sale"
            ? "Terjual"
            : "Lainnya",
      qty: `${m.type === "in" ? "+" : "-"}${formatWeight(m.qty_g, prod?.sack_weight_g ?? 1)}`,
      note: m.note || "-",
    };

    if (isOwner) {
      rowData.revenue = rev;
      rowData.cost = cost;
      rowData.profit = profit;
    }

    ws.addRow(rowData);
  });

  if (isOwner && (rows ?? []).length > 0) {
    const totalRow = ws.addRow({
      time: "",
      product: "TOTAL",
      type: "",
      reason: "",
      qty: "",
      note: "",
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalProfit,
    });
    totalRow.font = { bold: true };
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="catatan-harian-${tanggal}.xlsx"`,
    },
  });
}