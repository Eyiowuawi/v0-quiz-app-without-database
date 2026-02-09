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
  Clock,
  CheckCircle2,
  Share2,
  Play,
  Trophy,
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
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Real-Time Quiz Platform</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
            Quiz Runner
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Create engaging, interactive quizzes with live leaderboards and
            instant results. Perfect for classrooms, events, and team building.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => router.push("/moderator")}
            >
              <Play className="w-5 h-5 mr-2" />
              Start as Moderator
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => {
                document
                  .getElementById("join-quiz")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Users className="w-5 h-5 mr-2" />
              Join a Quiz
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Live Participation
            </h3>
            <p className="text-muted-foreground">
              Unlimited participants can join in real-time. See who's
              participating and track engagement instantly.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Live Leaderboard
            </h3>
            <p className="text-muted-foreground">
              Real-time rankings update automatically. See top performers and
              track progress as the quiz progresses.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Timer Mode
            </h3>
            <p className="text-muted-foreground">
              Auto-advance questions with customizable timers. Perfect for
              time-pressed sessions or competitive quizzes.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Instant Results
            </h3>
            <p className="text-muted-foreground">
              Participants see their scores immediately with detailed answer
              reviews. Know what you got right and what you missed.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Easy Sharing
            </h3>
            <p className="text-muted-foreground">
              Each quiz gets a unique link. Share with participants instantly.
              No accounts needed for participants.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Custom Questions
            </h3>
            <p className="text-muted-foreground">
              Upload your own questions via JSON. Create quizzes tailored to
              your content, subject, or event.
            </p>
          </div>
        </div>

        {/* Join Quiz Section */}
        <div
          id="join-quiz"
          className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-xl"
        >
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Join a Quiz
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Enter the team ID provided by your moderator, or use the shared
              quiz link
            </p>

            <form onSubmit={handleJoinQuiz} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="text"
                  placeholder="Enter Team ID (e.g., abc123def456)"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="h-14 text-lg flex-1"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="h-14 px-8 text-lg"
                  disabled={!teamId.trim()}
                >
                  Join Quiz
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Don't have a team ID? Ask your moderator for the quiz link or
                team ID.
              </p>
            </form>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Moderator Creates Quiz
                  </h3>
                  <p className="text-muted-foreground">
                    Register as a moderator, upload questions (or use
                    defaults), and get your unique quiz link.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Share with Participants
                  </h3>
                  <p className="text-muted-foreground">
                    Share your quiz link or team ID. Participants join with just
                    their email - no passwords needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Run the Quiz
                  </h3>
                  <p className="text-muted-foreground">
                    Start the quiz, control the pace, or use timer mode.
                    Participants answer in real-time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    View Results
                  </h3>
                  <p className="text-muted-foreground">
                    Show results when ready. Participants see scores, grades,
                    and detailed answer reviews instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
