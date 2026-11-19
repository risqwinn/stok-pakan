'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addProduct(formData: FormData) {
  const supabase = await createClient()
  const num = (k: string) => Number(formData.get(k) || 0)
  const text = (k: string) => String(formData.get(k) || '').trim()

  const { error } = await supabase.from('products').insert({
    name: text('name'),
    sku: text('sku') || null,
    category: text('category') || null,
    sack_weight_g: Math.round(num('sack_kg') * 1000),
    buy_price_per_sack: num('buy_price_per_sack'),
    sell_price_per_sack: num('sell_price_per_sack'),
    sell_price_per_kg: num('sell_price_per_kg'),
    min_stock_g: Math.round(num('min_kg') * 1000),
  })

  if (error) redirect('/produk?error=' + encodeURIComponent(error.message))
  revalidatePath('/produk')
  redirect('/produk')
}