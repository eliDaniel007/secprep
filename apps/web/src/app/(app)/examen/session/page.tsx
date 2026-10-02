import { Suspense } from "react";
import { ExamRunner } from "@/components/ExamRunner";

export default function ExamenSessionPage() {
  return (
    <Suspense fallback={<p className="text-muted">Preparation de l'examen…</p>}>
      <ExamRunner />
    </Suspense>
  );
}
