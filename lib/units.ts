export function formatWeight(g: number, sackG: number) {
  const neg = g < 0
  let rest = Math.abs(g)
  const sacks = Math.floor(rest / sackG)
  rest -= sacks * sackG
  const kg = Math.floor(rest / 1000)
  const gr = rest % 1000

  const parts: string[] = []
  if (sacks) parts.push(`${sacks} karung`)
  if (kg) parts.push(`${kg} kg`)
  if (gr) parts.push(`${gr} g`)
  return (neg ? '-' : '') + (parts.join(' ') || '0')
}

export const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')

export const namaBulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]