"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users,
  Database,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
  Shield,
} from "lucide-react";

interface TeamData {
  teamId: string;
  moderator: {
    email: string;
    name: string;
    createdAt: number;
  };
  quizState: {
    isActive: boolean;
    currentQuestionIndex: number;
    showResults: boolean;
  } | null;
  participantCount: number;
  totalAnswers: number;
  activeSessions: number;
  hasCustomQuestions: boolean;
  customQuestionCount: number;
}

interface AdminData {
  summary: {
    totalModerators: number;
    totalTeams: number;
    totalParticipants: number;
    totalAnswers: number;
    activeQuizzes: number;
  };
  teams: TeamData[];
}

const fetcher = (url: string, sessionId: string) =>
  fetch(url, {
    headers: { "x-admin-session-id": sessionId },
  }).then((res) => res.json());

export function AdminDashboard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clearingTeam, setClearingTeam] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  // Load session from localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem("admin-session-id");
    if (savedSessionId) {
      // Verify session is still valid
      fetch("/api/admin/auth", {
        headers: { "x-admin-session-id": savedSessionId },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            setSessionId(savedSessionId);
          } else {
            localStorage.removeItem("admin-session-id");
          }
        })
        .catch(() => {
          localStorage.removeItem("admin-session-id");
        });
    }
  }, []);

  const { data, mutate, isLoading: dataLoading } = useSWR<AdminData>(
    sessionId ? ["/api/admin/data", sessionId] : null,
    ([url, sid]) => fetcher(url, sid),
    { refreshInterval: 5000 },
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });

      const result = await res.json();

      if (res.ok) {
        setSessionId(result.sessionId);
        localStorage.setItem("admin-session-id", result.sessionId);
        toast.success("Admin login successful");
      } else {
        toast.error(result.error || "Login failed");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin-session-id");
    setSessionId(null);
    toast.success("Logged out");
  };

  const handleClearTeam = async (teamId: string) => {
    if (
      !confirm(
        `Are you sure you want to clear all data for team ${teamId}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setClearingTeam(teamId);

    try {
      const res = await fetch("/api/admin/clear", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-session-id": sessionId!,
        },
        body: JSON.stringify({ teamId }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(result.message);
        mutate();
      } else {
        toast.error(result.error || "Failed to clear team data");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setClearingTeam(null);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        "⚠️ WARNING: This will delete ALL data from the entire database including all moderators, teams, participants, and answers. This action CANNOT be undone. Are you absolutely sure?",
      )
    ) {
      return;
    }

    // Double confirmation
    if (
      !confirm(
        "This is your last chance. Type 'DELETE ALL' in the next prompt to confirm.",
      )
    ) {
      return;
    }

    setClearingAll(true);

    try {
      const res = await fetch("/api/admin/clear", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-session-id": sessionId!,
        },
        body: JSON.stringify({ clearAll: true }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(result.message);
        mutate();
        // Logout after clearing all
        handleLogout();
      } else {
        toast.error(result.error || "Failed to clear database");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setClearingAll(false);
    }
  };

  // Login form
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Enter admin key to access system overview
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Admin Key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required
                className="h-12 text-lg"
                disabled={isLoading}
              />

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={isLoading || !adminKey}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/")}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-6 h-6 text-destructive" />
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={dataLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${dataLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
              Home
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        {data && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  Total Moderators
                </h3>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {data.summary.totalModerators}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  Total Participants
                </h3>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {data.summary.totalParticipants}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  Total Answers
                </h3>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {data.summary.totalAnswers}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  Active Quizzes
                </h3>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {data.summary.activeQuizzes}
              </p>
            </div>
          </div>
        )}

        {/* Clear All Database */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground">
                Clear the entire database. This will delete all moderators, teams,
                participants, and answers. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearingAll}
            >
              {clearingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Entire Database
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Teams List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">All Teams</h2>

          {dataLoading && !data ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-4">Loading data...</p>
            </div>
          ) : !data || data.teams.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No teams found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.teams.map((team) => (
                <div
                  key={team.teamId}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {team.moderator.name}
                        </h3>
                        {team.quizState?.isActive && (
                          <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            Active
                          </span>
                        )}
                        {team.quizState?.showResults && (
                          <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
                            Results Shown
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {team.moderator.email}
                      </p>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        Team ID: {team.teamId}
                      </code>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleClearTeam(team.teamId)}
                      disabled={clearingTeam === team.teamId}
                    >
                      {clearingTeam === team.teamId ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear Team
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Participants
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {team.participantCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Total Answers
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {team.totalAnswers}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Active Sessions
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {team.activeSessions}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Questions
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {team.hasCustomQuestions
                          ? team.customQuestionCount
                          : "Default"}
                      </p>
                    </div>
                  </div>

                  {team.quizState && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">
                        Quiz State
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          Question: {team.quizState.currentQuestionIndex + 1}
                        </span>
                        <span
                          className={
                            team.quizState.isActive
                              ? "text-green-500"
                              : "text-muted-foreground"
                          }
                        >
                          {team.quizState.isActive ? "Active" : "Paused"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
