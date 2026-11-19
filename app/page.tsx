import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from './login/actions'
import Link from 'next/link'

async function UserInfo() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  return (
    <>
      <p>Masuk sebagai <b>{user.email}</b></p>
      <p>Peran: <b>{profile?.role ?? '(tidak terbaca)'}</b></p>
      <form action={logout} className="mt-4">
        <button className="rounded border px-3 py-1">Keluar</button>
        <p className="mt-4"><Link href="/produk" className="underline">Lihat produk →</Link></p> <p className="mt-2"><Link href="/stok" className="underline">Catat stok →</Link></p>
      </form>
    </>
  )
}

export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <UserInfo />
      </Suspense>
    </main>
  )
} 