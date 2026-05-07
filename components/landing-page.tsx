"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Zap,
  BarChart3,
  CheckCircle2,
  Share2,
  Trophy,
  Timer,
  ArrowRight,
  Plus,
} from "lucide-react";

export function LandingPage() {
  const [teamId, setTeamId] = useState("");
  const router = useRouter();

  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId.trim()) {
      toast.error("Please enter a team ID");
      return;
    }
    router.push(`/quiz/${teamId.trim()}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-grid">
      <div className="pointer-events-none absolute -left-20 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-[500px] w-[500px] animate-pulse rounded-full bg-purple-600/20 blur-[120px]" />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-32 pt-12">
        <nav className="mb-16 flex items-center justify-between md:mb-24">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-black italic text-white shadow-lg shadow-indigo-600/20">
              Q
            </div>
            <span className="font-display text-2xl font-black uppercase tracking-tighter">
              QuizPulse
            </span>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push("/moderator")}
            className="rounded-xl font-bold hover:bg-white/5"
          >
            Moderator login
          </Button>
        </nav>

        <div className="grid items-center gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-400">
              <Zap className="h-3 w-3 fill-current" />
              Real-time quizzing
            </div>
            <h1 className="mb-8 text-5xl font-black uppercase italic leading-[0.9] tracking-tighter sm:text-7xl md:text-8xl">
              Ignite the <br />
              <span className="gradient-text">competition</span>
            </h1>
            <p className="mb-12 max-w-xl text-lg font-medium leading-relaxed text-zinc-400 sm:text-xl">
              Host live quizzes with instant scoring, leaderboards, and a
              moderator console—built for classrooms, events, and teams.
            </p>

            <div className="mb-16 flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => router.push("/moderator")}
                className="h-14 rounded-2xl bg-white px-8 text-lg font-black text-black shadow-xl shadow-white/10 hover:bg-zinc-200 sm:h-16"
              >
                <Plus className="mr-2 h-5 w-5" />
                Start as moderator
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 rounded-2xl border-zinc-700 px-8 text-lg font-black sm:h-16"
                onClick={() =>
                  document
                    .getElementById("join-quiz")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Join a quiz
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-10 sm:grid-cols-4">
              <StatItem label="Live flow" value="Real-time" />
              <StatItem label="Players" value="Unlimited" />
              <StatItem label="Timer" value="Optional" />
              <StatItem label="Results" value="Instant" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div
              id="join-quiz"
              className="glass-card group relative overflow-hidden rounded-[2.5rem] p-8 sm:p-10"
            >
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-indigo-600/10 blur-3xl transition-colors group-hover:bg-indigo-600/20" />

              <div className="relative mb-10">
                <h2 className="mb-2 text-3xl font-black uppercase italic tracking-tighter sm:text-4xl">
                  Join arena
                </h2>
                <p className="font-medium text-zinc-400">
                  Enter the team ID from your host to jump in.
                </p>
              </div>

              <form onSubmit={handleJoinQuiz} className="relative space-y-6">
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Team ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Paste or type team ID"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="h-14 border-white/10 bg-white/5 text-lg font-bold placeholder:text-zinc-600 sm:h-16"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!teamId.trim()}
                  className="h-16 w-full rounded-[2rem] text-xl font-black shadow-2xl shadow-indigo-600/40 group/btn sm:h-20 sm:text-2xl"
                >
                  Enter arena
                  <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover/btn:translate-x-1" />
                </Button>
                <p className="text-center text-sm text-zinc-500">
                  No account needed—your host shares the link or ID.
                </p>
              </form>
            </div>
          </div>
        </div>

        <section className="mt-32 md:mt-48">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Live participation"
              desc="Participants join with a link or team ID. The moderator drives the pace."
              color="indigo"
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Leaderboard"
              desc="Rankings update as answers come in—perfect for competitive sessions."
              color="purple"
            />
            <FeatureCard
              icon={<Timer className="h-8 w-8" />}
              title="Timer mode"
              desc="Optional auto-advance per question when you want the clock to add pressure."
              color="pink"
            />
            <FeatureCard
              icon={<CheckCircle2 className="h-8 w-8" />}
              title="Instant results"
              desc="Unlock the scoreboard when you are ready; players see how they did."
              color="indigo"
            />
            <FeatureCard
              icon={<Share2 className="h-8 w-8" />}
              title="Easy sharing"
              desc="One quiz link per session—copy and share with your group in seconds."
              color="purple"
            />
            <FeatureCard
              icon={<Trophy className="h-8 w-8" />}
              title="Your questions"
              desc="Upload JSON or use the built-in builder to craft your own quiz content."
              color="pink"
            />
          </div>
        </section>

        <div className="mt-24 text-center md:mt-32">
          <h2 className="mb-10 font-display text-3xl font-black uppercase italic tracking-tighter text-foreground md:text-4xl">
            How it works
          </h2>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2 md:gap-10">
            <Step
              n={1}
              title="Moderator sets up"
              body="Sign in, add questions, and grab your shareable quiz link."
            />
            <Step
              n={2}
              title="Players join"
              body="They open the link or enter the team ID and sign in with name and email."
            />
            <Step
              n={3}
              title="Run the quiz"
              body="Start, pause, advance, or use timer mode—full control from the console."
            />
            <Step
              n={4}
              title="Show results"
              body="Reveal scores when you are ready; everyone sees their breakdown."
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="text-xl font-black text-white sm:text-2xl">{value}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: "indigo" | "purple" | "pink";
}) {
  const colors: Record<string, string> = {
    indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-400",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-400",
    pink: "border-pink-500/20 bg-pink-500/10 text-pink-400",
  };

  return (
    <div className="glass-card rounded-[2rem] p-8 transition-transform duration-300 hover:-translate-y-2 md:p-10">
      <div
        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border ${colors[color]}`}
      >
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-black uppercase italic tracking-tighter">
        {title}
      </h3>
      <p className="font-medium leading-relaxed text-zinc-400">{desc}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white shadow-lg shadow-indigo-600/30">
        {n}
      </div>
      <div>
        <h3 className="mb-1 font-black text-foreground">{title}</h3>
        <p className="text-sm font-medium text-zinc-400">{body}</p>
      </div>
    </div>
  );
}
