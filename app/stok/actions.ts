'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function recordMovement(formData: FormData) {
  const supabase = await createClient()
  const num = (k: string) => Number(formData.get(k) || 0)
  const fail = (msg: string): never =>
    redirect('/stok?error=' + encodeURIComponent(msg))

  const productId = Number(formData.get('product_id'))
  const type = String(formData.get('type'))
  if (!productId || !['in', 'out'].includes(type)) fail('Pilih produk dan jenis catatan.')

  const { data: product } = await supabase
    .from('products').select('sack_weight_g').eq('id', productId).single()
  if (!product) fail('Produk tidak ditemukan.')

  const sacks = Math.max(0, Math.floor(num('sacks')))
  const qtyG = Math.round(
    sacks * product!.sack_weight_g + num('kg') * 1000 + num('grams')
  )
  if (!(qtyG > 0)) fail('Jumlah harus lebih dari 0.')

  const isSale = type === 'out' && String(formData.get('reason')) !== 'other'

  const { error } = await supabase.from('stock_movements').insert({
    product_id: productId,
    type,
    qty_g: qtyG,
    reason: isSale ? 'sale' : 'other',
    sold_sacks: isSale ? sacks : 0,
    note: String(formData.get('note') || '').trim() || null,
  })
  if (error) fail(error.message)

  revalidatePath('/stok')
  revalidatePath('/produk')
  revalidatePath('/dashboard')
  redirect('/stok?ok=1')
}