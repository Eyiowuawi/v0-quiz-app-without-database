"use client"

interface WaitingScreenProps {
  message: string
  email: string
}

export function WaitingScreen({ message, email }: WaitingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">{message}</h2>
          <p className="text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{email}</span>
          </p>

          <div className="mt-6 flex items-center justify-center gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  )
}
