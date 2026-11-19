import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from './login/actions'

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