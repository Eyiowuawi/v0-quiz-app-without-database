import { QuizClient } from "@/components/quiz-client";

export default async function TeamQuizPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return <QuizClient teamId={teamId} />;
}
