"use client"

import { TeamDashboard } from "@/components/team-dashboard"
import { DependencyDrawer } from "@/components/dependency-drawer"
import { useAppStore } from "@/lib/store"
import { useEffect, use, useMemo } from "react" // Import useMemo
import { useRouter } from "next/navigation"

// Define the expected shape of the params object
interface TeamPageResolvedParams {
  teamId: string
}

// Props for the page component.
interface TeamPageProps {
  params: TeamPageResolvedParams // Assuming params is passed as a plain object
}

export default function TeamPage(props: TeamPageProps) {
  // Memoize the promise created from props.params.
  // This ensures that React.use() receives a stable promise instance
  // across re-renders, as long as props.params itself is stable.
  // Next.js route params objects are generally stable for a given route.
  const paramsPromise = useMemo(() => Promise.resolve(props.params), [props.params])
  const resolvedParams = use(paramsPromise) // use() unwraps the stable promise
  const { teamId } = resolvedParams // Destructure teamId from the resolved object

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
      }
      // No need to call useAppStore.setState for selectedTeamId here,
      // as the view is primarily driven by the URL.
      // Other components (like AppHeader) read the pathname to determine current view.
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
