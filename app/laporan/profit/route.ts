import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { namaBulan } from '@/lib/units'

const RP = '"Rp" #,##0'

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1)
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } }
  row.alignment = { vertical: 'middle' }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Harus login.', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') {
    return new Response('Hanya pemilik yang dapat mengunduh laporan.', { status: 403 })
  }

  const { data: rows, error } = await supabase
    .from('monthly_profit').select('*')
    .order('year', { ascending: true })
    .order('month', { ascending: true })
  if (error) return new Response(error.message, { status: 500 })

  const data = (rows ?? []).map((r) => ({
    year: r.year as number,
    month: r.month as number,
    revenue: Number(r.revenue),
    cost: Number(r.cost),
    profit: Number(r.profit),
  }))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Kios Pakan Marvin'

  // Sheet 1: per bulan
  const ws = wb.addWorksheet('Profit Bulanan')
  ws.columns = [
    { header: 'Tahun', key: 'year', width: 10 },
    { header: 'Bulan', key: 'month', width: 16 },
    { header: 'Pendapatan', key: 'revenue', width: 20, style: { numFmt: RP } },
    { header: 'Modal (HPP)', key: 'cost', width: 20, style: { numFmt: RP } },
    { header: 'Profit', key: 'profit', width: 20, style: { numFmt: RP } },
  ]
  styleHeader(ws)
  data.forEach((d) => ws.addRow({ ...d, month: namaBulan[d.month - 1] }))

  const sum = (k: 'revenue' | 'cost' | 'profit') => data.reduce((a, d) => a + d[k], 0)
  const total = ws.addRow({
    year: '', month: 'TOTAL',
    revenue: sum('revenue'), cost: sum('cost'), profit: sum('profit'),
  })
  total.font = { bold: true }

  // Sheet 2: per tahun
  const wy = wb.addWorksheet('Profit Tahunan')
  wy.columns = [
    { header: 'Tahun', key: 'year', width: 10 },
    { header: 'Pendapatan', key: 'revenue', width: 20, style: { numFmt: RP } },
    { header: 'Modal (HPP)', key: 'cost', width: 20, style: { numFmt: RP } },
    { header: 'Profit', key: 'profit', width: 20, style: { numFmt: RP } },
  ]
  styleHeader(wy)
  const byYear = new Map<number, { revenue: number; cost: number; profit: number }>()
  data.forEach((d) => {
    const y = byYear.get(d.year) ?? { revenue: 0, cost: 0, profit: 0 }
    y.revenue += d.revenue; y.cost += d.cost; y.profit += d.profit
    byYear.set(d.year, y)
  })
  ;[...byYear.entries()].sort((a, b) => a[0] - b[0])
    .forEach(([year, v]) => wy.addRow({ year, ...v }))

  const buf = await wb.xlsx.writeBuffer()
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="profit-bulanan.xlsx"',
    },
  })
}