"use client"

import { TeamDashboard } from "@/components/team-dashboard"
import { DependencyDrawer } from "@/components/dependency-drawer"
import { useAppStore } from "@/lib/store"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface TeamPageProps {
  params: {
    teamId: string
  }
}

export default function TeamPage({ params }: TeamPageProps) {
  const { teamId } = params
  const { teams, initialized, initializeStore, selectTeam } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (!initialized) {
      initializeStore()
    }
  }, [initialized, initializeStore])

  useEffect(() => {
    if (initialized) {
      const teamExists = teams.some((t) => t.id === teamId)
      if (!teamExists) {
        // If team doesn't exist (e.g., after deletion or invalid URL), redirect
        router.replace("/global")
      } else {
        // Optionally, ensure the store's selectedTeamId is synced if needed by other components
        // This might be redundant if components primarily rely on URL params
        useAppStore.setState({ selectedTeamId: teamId, showGlobalView: false })
      }
    }
  }, [initialized, teamId, teams, router, selectTeam])

  if (!initialized || !teams.some((t) => t.id === teamId)) {
    // Show loader or redirect if team not found yet or store not ready
    return <div>Loading team data or team not found...</div>
  }

  return (
    <>
      <TeamDashboard teamId={teamId} />
      <DependencyDrawer />
    </>
  )
}
