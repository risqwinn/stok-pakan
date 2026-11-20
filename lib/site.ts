export const site = {
  name: 'Kios Pakan Marvin',
  tagline: 'Pakan ayam, ikan, dan udang. Tersedia eceran per kg maupun per karung.',
  whatsapp: '6281310989226',
  address:
    '9R4Q+HGQ, RT.01/RW.07, Muarasari, Kec. Bogor Sel., Kota Bogor, Jawa Barat 16137',
  landmark:
    'Dekat Ramayana Tajur, Jl. Raya Tajur, Muarasari, Kec. Bogor Sel., Kota Bogor',
  hours: 'Setiap hari, 08.00–17.00 WIB', // TODO: sesuaikan dengan jam buka sebenarnya
  url: 'https://stok-pakan.netlify.app', // TODO: ganti dengan alamat Netlify Anda
}

export const waLink = (text: string) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`

const mapQuery = '9R4Q+HGQ Bogor, Indonesia'
export const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=17&output=embed`
export const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`