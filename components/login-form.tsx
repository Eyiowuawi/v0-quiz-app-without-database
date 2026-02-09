"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Users, ArrowRight } from "lucide-react"

interface LoginFormProps {
  onLogin: (email: string) => void
  teamId?: string | null
}

export function LoginForm({ onLogin, teamId }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [manualTeamId, setManualTeamId] = useState("")
  const [showTeamIdInput, setShowTeamIdInput] = useState(!teamId)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  
  const effectiveTeamId = teamId || manualTeamId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!effectiveTeamId) {
      setError("Please enter a team ID")
      toast.error("Team ID is required")
      return
    }
    
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, teamId: effectiveTeamId }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg = data.error || "Login failed"
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      if (effectiveTeamId) {
        localStorage.setItem(`quiz-email-${effectiveTeamId}`, data.email)
      }
      toast.success(`Welcome! Joined as ${data.email}`)
      onLogin(data.email)
    } catch {
      const errorMsg = "Something went wrong. Please try again."
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleEnterTeamId = () => {
    if (manualTeamId.trim()) {
      router.push(`/quiz/${manualTeamId.trim()}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Join Quiz</h1>
            <p className="text-muted-foreground">
              {teamId 
                ? "Enter your email to participate" 
                : "Enter your team ID and email to join"}
            </p>
          </div>

          {!teamId && (
            <div className="mb-6 space-y-2">
              <label className="text-sm font-medium text-foreground">
                Team ID
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter team ID"
                  value={manualTeamId}
                  onChange={(e) => setManualTeamId(e.target.value)}
                  className="h-12 text-lg font-mono"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  onClick={handleEnterTeamId}
                  disabled={!manualTeamId.trim() || isLoading}
                  className="h-12 px-6"
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get this from your moderator or use the quiz link
              </p>
            </div>
          )}

          {effectiveTeamId && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Your Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-lg"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
                disabled={isLoading || !email}
              >
                {isLoading ? "Joining..." : "Join Quiz"}
              </Button>
            </form>
          )}

          {effectiveTeamId && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              No password required. Just enter your email to participate.
            </p>
          )}

          {!teamId && (
            <div className="mt-6 pt-6 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Back to Home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
