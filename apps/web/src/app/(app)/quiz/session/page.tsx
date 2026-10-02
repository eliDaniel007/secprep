import { Suspense } from "react";
import { QuizRunner } from "@/components/QuizRunner";
import type { Difficulte } from "@/lib/quiz-api";

export default function QuizSessionPage({
  searchParams,
}: {
  searchParams: {
    domaine?: string;
    difficulte?: string;
    nombre?: string;
    ids?: string;
  };
}) {
  const domaine = searchParams.domaine ? Number(searchParams.domaine) : undefined;
  const difficulte = (searchParams.difficulte as Difficulte) || undefined;
  const nombre = searchParams.nombre ? Number(searchParams.nombre) : 10;
  const ids = searchParams.ids ? searchParams.ids.split(",").filter(Boolean) : undefined;

  return (
    <Suspense fallback={<p className="text-muted">Chargement…</p>}>
      <QuizRunner
        domaine={domaine}
        difficulte={difficulte}
        nombre={nombre}
        ids={ids}
      />
    </Suspense>
  );
}
