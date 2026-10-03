import { exigerUtilisateur } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await exigerUtilisateur();
  return (
    <div className="min-h-screen">
      <NavBar nom={u.nom} role={u.role} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
