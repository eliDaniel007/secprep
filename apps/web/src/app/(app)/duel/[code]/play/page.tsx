import { Suspense } from "react";
import { DuelRunner } from "@/components/DuelRunner";

export default function DuelPlayPage({ params }: { params: { code: string } }) {
  return (
    <Suspense fallback={<p className="text-muted">Chargement…</p>}>
      <DuelRunner code={params.code} />
    </Suspense>
  );
}
