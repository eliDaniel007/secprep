import { QuizConfigForm } from "@/components/QuizConfigForm";

export default function QuizConfigPage({
  searchParams,
}: {
  searchParams: { domaine?: string };
}) {
  const domaine = searchParams.domaine ? Number(searchParams.domaine) : undefined;
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Quiz libre</h1>
      <p className="mt-1 text-muted">
        Choisis un domaine, une difficulte et un nombre de questions.
      </p>
      <div className="mt-6">
        <QuizConfigForm defaultDomaine={domaine} />
      </div>
    </div>
  );
}
