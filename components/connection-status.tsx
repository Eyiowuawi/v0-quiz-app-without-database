"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] border-b border-red-500/30 bg-red-950/95 px-4 py-2.5 text-center text-red-100 shadow-lg backdrop-blur-md">
      <p className="text-sm font-semibold">
        You’re offline — check your connection and try again.
      </p>
    </div>
  )
}
