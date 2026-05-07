"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

interface ModeratorAuthProps {
  onAuth: (
    sessionId: string,
    teamId: string,
    email: string,
    name: string,
  ) => void;
}

export function ModeratorAuth({ onAuth }: ModeratorAuthProps) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const url = "/api/moderator/auth";
      const method = isLogin ? "PUT" : "POST";

      const body = isLogin ? { email, password } : { email, password, name };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || `${isLogin ? "Login" : "Registration"} failed`,
        );
        toast.error(
          data.error || `${isLogin ? "Login" : "Registration"} failed`,
        );
        return;
      }

      toast.success(
        isLogin
          ? `Welcome back, ${data.name}!`
          : `Account created! Welcome, ${data.name}!`,
      );
      onAuth(data.sessionId, data.teamId, data.email, data.name);
    } catch {
      const errorMsg = "Something went wrong. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background bg-grid p-4">
      <div className="pointer-events-none absolute left-0 top-1/3 h-72 w-72 rounded-full bg-indigo-600/15 blur-[100px]" />
      <div className="relative w-full max-w-md">
        <div className="glass-card rounded-[2rem] p-8 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/25">
              <LayoutDashboard className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-display text-3xl font-black uppercase italic tracking-tighter text-foreground">
              {isLogin ? "Moderator login" : "Create account"}
            </h1>
            <p className="mt-2 text-sm font-medium text-zinc-400">
              {isLogin
                ? "Sign in to your QuizPulse console"
                : "Register to host your first session"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Name
                </label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="h-12 font-bold"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Email
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 font-bold"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 font-bold"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl font-black"
              disabled={isLoading}
            >
              {isLoading
                ? isLogin
                  ? "Logging in…"
                  : "Creating account…"
                : isLogin
                  ? "Login"
                  : "Create account"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setEmail("");
                  setPassword("");
                  setName("");
                }}
                className="text-sm font-medium text-zinc-400 hover:text-foreground"
              >
                {isLogin
                  ? "Need an account? Register"
                  : "Already registered? Login"}
              </button>
            </div>
            <div className="border-t border-white/5 pt-6">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-2xl font-bold"
                onClick={() => router.push("/")}
              >
                Back to home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
