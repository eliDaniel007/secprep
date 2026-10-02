"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LIENS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/quiz", label: "Quiz libre" },
  { href: "/examen", label: "Examen" },
];

export function NavBar({ nom }: { nom: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function deconnexion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-fg text-sm font-black">
              S+
            </span>
            SecPrep
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LIENS.map((l) => {
              const actif = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    actif
                      ? "bg-surface-2 text-text"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">{nom}</span>
          <button onClick={deconnexion} className="btn-ghost px-3 py-1.5 text-xs">
            Deconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
