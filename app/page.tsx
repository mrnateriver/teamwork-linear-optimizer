"use client"
// This is the new root page.tsx
// It will handle initial loading and redirection.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { teams, initialized, initializeStore } = useAppStore()

  useEffect(() => {
    if (!initialized) {
      initializeStore()
    }
  }, [initialized, initializeStore])

  useEffect(() => {
    if (initialized) {
      if (teams.length > 0) {
        // If teams exist, redirect to the global view by default or last selected team.
        // For simplicity, let's always go to global view first.
        router.replace("/global")
      }
      // If no teams, user stays on this page which will show "Welcome" message.
    }
  }, [initialized, teams, router])

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)]">
        <h2 className="text-2xl font-bold mb-4">Welcome to Team Prioritization</h2>
        <p className="text-muted-foreground mb-6">
          Get started by creating your first team using the "New Team" button in the header.
        </p>
      </div>
    )
  }

  // Fallback loading state while redirecting
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Initializing...</p>
    </div>
  )
}
