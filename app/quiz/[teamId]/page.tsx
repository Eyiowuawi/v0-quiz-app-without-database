import { QuizClient } from "@/components/quiz-client";

export default function TeamQuizPage({
  params,
}: {
  params: { teamId: string };
}) {
  return <QuizClient teamId={params.teamId} />;
}
