import Link from "next/link";
import { logout } from "@/app/login/actions";

const links = [
  { href: "/dashboard", label: "Beranda" },
  { href: "/produk", label: "Produk" },
  { href: "/stok", label: "Catat stok" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2">
        <span className="mr-2 font-semibold text-green-800">Stok Pakan</span>
        <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded px-3 py-2 hover:bg-green-50"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <button className="rounded border px-3 py-2 text-sm">Keluar</button>
        </form>
      </div>
    </header>
  );
}
