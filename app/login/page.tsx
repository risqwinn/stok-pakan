import { Suspense } from 'react'
import { login } from './actions'

type Props = { searchParams: Promise<{ error?: string }> }

async function ErrorMessage({ searchParams }: Props) {
  const { error } = await searchParams
  if (!error) return null
  return <p className="text-sm text-red-600">Email atau kata sandi salah.</p>
}

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className="mx-auto mt-24 max-w-sm p-4">
      <h1 className="mb-6 text-2xl font-semibold">Masuk</h1>
      <form action={login} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" required
          className="rounded border p-2" />
        <input name="password" type="password" placeholder="Kata sandi" required
          className="rounded border p-2" />
        <Suspense>
          <ErrorMessage searchParams={searchParams} />
        </Suspense>
        <button className="rounded bg-green-700 p-2 text-white">Masuk</button>
      </form>
    </main>
  )
}