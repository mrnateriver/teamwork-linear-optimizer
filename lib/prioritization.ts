import type { Project, Team, TeamSummary } from "@/lib/types"

interface PrioritizationResult {
  selectedProjects: Project[]
  unselectedProjects: Project[]
  teamSummaries: Record<string, TeamSummary>
}

export function prioritizeProjects(allProjects: Project[], teams: Team[]): PrioritizationResult {
  // Create a map of team capacities
  const teamCapacities: Record<string, number> = {}
  teams.forEach((team) => {
    teamCapacities[team.id] = team.capacity
  })

  // Sort projects by value/effort ratio (descending)
  const sortedProjects = [...allProjects].sort((a, b) => {
    // Handle zero effort cases
    if (a.effort === 0 && b.effort === 0) return b.value - a.value
    if (a.effort === 0) return -1 // a comes first (infinite value/effort)
    if (b.effort === 0) return 1 // b comes first (infinite value/effort)

    // Normal case: compare value/effort ratios
    const ratioA = a.value / a.effort
    const ratioB = b.value / b.effort
    return ratioB - ratioA
  })

  // Initialize result structures
  const selectedProjects: Project[] = []
  const unselectedProjects: Project[] = []
  const teamSummaries: Record<string, TeamSummary> = {}

  // Initialize team summaries
  teams.forEach((team) => {
    teamSummaries[team.id] = {
      allocated: 0,
      value: 0,
    }
  })

  // Greedy algorithm: select projects until capacity is reached
  for (const project of sortedProjects) {
    const teamId = project.teamId
    const teamCapacity = teamCapacities[teamId] || 0
    const teamSummary = teamSummaries[teamId] || { allocated: 0, value: 0 }

    // Skip projects with no effort or value
    if (project.effort <= 0 || project.value <= 0) {
      unselectedProjects.push(project)
      continue
    }

    // Check if adding this project would exceed team capacity
    if (teamSummary.allocated + project.effort <= teamCapacity) {
      // Add project to selected list
      selectedProjects.push(project)

      // Update team summary
      teamSummaries[teamId] = {
        allocated: teamSummary.allocated + project.effort,
        value: teamSummary.value + project.value,
      }
    } else {
      // Project doesn't fit within capacity
      unselectedProjects.push(project)
    }
  }

  return {
    selectedProjects,
    unselectedProjects,
    teamSummaries,
  }
}
