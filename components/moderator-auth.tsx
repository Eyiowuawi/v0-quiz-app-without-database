"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ModeratorAuthProps {
  onAuth: (sessionId: string, teamId: string, email: string, name: string) => void;
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
      const url = isLogin
        ? "/api/moderator/auth"
        : "/api/moderator/auth";
      const method = isLogin ? "PUT" : "POST";

      const body = isLogin
        ? { email, password }
        : { email, password, name };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `${isLogin ? "Login" : "Registration"} failed`);
        toast.error(data.error || `${isLogin ? "Login" : "Registration"} failed`);
        return;
      }

      toast.success(
        isLogin
          ? `Welcome back, ${data.name}!`
          : `Account created! Welcome, ${data.name}!`
      );
      onAuth(data.sessionId, data.teamId, data.email, data.name);
    } catch (err) {
      const errorMsg = "Something went wrong. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border-2 border-border rounded-3xl p-8 shadow-xl shadow-chart-2/12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? "Moderator Login" : "Create Account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Sign in to manage your quiz"
                : "Register to create your quiz session"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="h-12"
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading}
            >
              {isLoading
                ? isLogin
                  ? "Logging in..."
                  : "Creating account..."
                : isLogin
                ? "Login"
                : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
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
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isLogin
                  ? "Don't have an account? Register"
                  : "Already have an account? Login"}
              </button>
            </div>
            <div className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
