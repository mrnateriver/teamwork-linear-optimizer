"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { TeamDashboard } from "@/components/team-dashboard"
import { GlobalView } from "@/components/global-view"
import { AppHeader } from "@/components/app-header"
import { ThemeProvider } from "@/components/theme-provider"

export default function App() {
  const { selectedTeamId, showGlobalView, teams, initializeStore, initialized } = useAppStore()

  useEffect(() => {
    // Initialize the store if not already done
    if (!initialized) {
      initializeStore()
    }
  }, [initialized, initializeStore])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto p-4 md:p-6">
          {showGlobalView ? (
            <GlobalView />
          ) : selectedTeamId ? (
            <TeamDashboard teamId={selectedTeamId} />
          ) : teams.length > 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh]">
              <h2 className="text-2xl font-bold mb-4">Select a team to get started</h2>
              <p className="text-muted-foreground">Choose a team from the header or create a new one</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh]">
              <h2 className="text-2xl font-bold mb-4">Welcome to Team Prioritization</h2>
              <p className="text-muted-foreground mb-6">Get started by creating your first team</p>
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  )
}
