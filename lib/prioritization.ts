import type { Project, Team, TeamSummary } from "@/lib/types"

// Define the structure for the optimization algorithm
interface OptimizationProject {
  id: string // Unique project ID
  team: string // Assigned team name
  value: number // Business value of the project
  effort: number // Effort required from the team
  dependencies: string[] // IDs of projects that this project depends on
}

interface PrioritizationResult {
  selectedProjects: Project[]
  unselectedProjects: Project[]
  teamSummaries: Record<string, TeamSummary>
}

/**
 * Perform a topological sort on the DAG of projects.
 * Returns an array of projects in an order such that each project comes
 * after all of its dependencies. Uses Kahn's algorithm.
 */
function topologicalSort(projects: OptimizationProject[]): OptimizationProject[] {
  // Build adjacency list and indegree count for each project
  const adjList: { [id: string]: string[] } = {}
  const indegree: { [id: string]: number } = {}
  for (const proj of projects) {
    indegree[proj.id] = proj.dependencies.length
    adjList[proj.id] = [] // initialize adjacency list
  }
  for (const proj of projects) {
    for (const dep of proj.dependencies) {
      // dep -> proj (i.e., proj is a neighbor of dep in the DAG)
      adjList[dep].push(proj.id)
    }
  }

  // Use a queue to perform Kahn's algorithm
  const order: OptimizationProject[] = []
  const ready: OptimizationProject[] = []

  // Start with all projects that have no dependencies (indegree 0)
  for (const proj of projects) {
    if (indegree[proj.id] === 0) {
      ready.push(proj)
    }
  }
  // Optionally sort initial ready list to have deterministic order (by ID)
  ready.sort((a, b) => a.id.localeCompare(b.id))

  while (ready.length > 0) {
    // Take the next available project
    const current = ready.shift()!
    order.push(current)
    // Decrease indegree of all neighbors (dependent projects)
    for (const neighborId of adjList[current.id]) {
      indegree[neighborId] -= 1
      if (indegree[neighborId] === 0) {
        // All dependencies of this neighbor are now satisfied
        // Find the project object for neighborId and push it to ready list
        const neighborProj = projects.find((p) => p.id === neighborId)!
        ready.push(neighborProj)
        // Keep the ready list sorted for stable ordering
        ready.sort((a, b) => a.id.localeCompare(b.id))
      }
    }
  }

  return order
}

/**
 * Optimized planner: uses backtracking (DFS) to find the combination of projects that
 * maximizes total value without exceeding capacities. Ensures that a project is only
 * taken if all its dependencies are taken.
 */
function planProjectsOptimized(
  teamCapacities: { [team: string]: number },
  projects: OptimizationProject[],
): { sequence: string[]; value: number } {
  // First get a topologically sorted order of projects (so deps come before dependents)
  const topoOrder = topologicalSort(projects)
  const n = topoOrder.length

  // Set up tracking for the best solution found
  let bestValue = 0
  let bestSelectedSet: Set<string> = new Set()

  // Recursive DFS to explore include/exclude decisions
  function dfs(index: number, currentValue: number, remainingCap: { [team: string]: number }, selected: Set<string>) {
    if (index === n) {
      // Reached the end of the project list, evaluate solution
      if (currentValue > bestValue) {
        bestValue = currentValue
        bestSelectedSet = new Set(selected)
      }
      return
    }

    const proj = topoOrder[index]
    // Check if all dependencies of this project are satisfied (i.e., all deps are in the selected set)
    const deps = proj.dependencies
    const depsSatisfied = deps.every((depId) => selected.has(depId))
    if (!depsSatisfied) {
      // Cannot select this project because a dependency was not selected
      dfs(index + 1, currentValue, remainingCap, selected)
    } else {
      // Option 1: Skip this project
      dfs(index + 1, currentValue, remainingCap, selected)

      // Option 2: Include this project (if capacity allows)
      if (remainingCap[proj.team] >= proj.effort) {
        // Take the project
        const newCap = { ...remainingCap }
        newCap[proj.team] -= proj.effort
        const newSelected = new Set(selected)
        newSelected.add(proj.id)

        dfs(index + 1, currentValue + proj.value, newCap, newSelected)
        // (No explicit "undo" needed since we passed copies of state)
      }
    }
  }

  // Start DFS with no projects selected
  const initialCap = { ...teamCapacities }
  dfs(0, 0, initialCap, new Set())

  // Prepare the resulting sequence in topologically sorted order
  const bestSequence: string[] = topoOrder.filter((p) => bestSelectedSet.has(p.id)).map((p) => p.id)
  return { sequence: bestSequence, value: bestValue }
}

export function prioritizeProjects(
  allProjects: Project[],
  teams: Team[],
  dependencies: { sourceId: string; targetId: string }[],
): PrioritizationResult {
  // Filter out projects with missing effort or value
  const validProjects = allProjects.filter(
    (project) => project.effort !== null && project.value !== null && project.effort > 0 && project.value > 0,
  )

  // Transform data structures for the optimization algorithm
  const teamCapacities: { [team: string]: number } = {}
  const teamIdToName: { [id: string]: string } = {}

  teams.forEach((team) => {
    teamCapacities[team.name] = team.capacity
    teamIdToName[team.id] = team.name
  })

  // Transform projects to the optimization format
  const optimizationProjects: OptimizationProject[] = validProjects.map((project) => {
    // Get dependencies for this project
    const projectDependencies = dependencies.filter((dep) => dep.targetId === project.id).map((dep) => dep.sourceId)

    return {
      id: project.id,
      team: teamIdToName[project.teamId],
      value: project.value!,
      effort: project.effort!,
      dependencies: projectDependencies,
    }
  })

  // Run the optimization algorithm
  const result = planProjectsOptimized(teamCapacities, optimizationProjects)

  // Transform results back to the expected format
  const selectedProjectIds = new Set(result.sequence)
  const selectedProjects: Project[] = []
  const unselectedProjects: Project[] = []

  // Separate selected and unselected projects, maintaining the optimized order for selected ones
  result.sequence.forEach((projectId) => {
    const project = allProjects.find((p) => p.id === projectId)
    if (project) {
      selectedProjects.push(project)
    }
  })

  // Add unselected projects (both invalid and not chosen by algorithm)
  allProjects.forEach((project) => {
    if (!selectedProjectIds.has(project.id)) {
      unselectedProjects.push(project)
    }
  })

  // Calculate team summaries
  const teamSummaries: Record<string, TeamSummary> = {}
  teams.forEach((team) => {
    teamSummaries[team.id] = {
      allocated: 0,
      value: 0,
    }
  })

  // Update team summaries based on selected projects
  selectedProjects.forEach((project) => {
    if (project.effort !== null && project.value !== null) {
      const teamSummary = teamSummaries[project.teamId]
      if (teamSummary) {
        teamSummary.allocated += project.effort
        teamSummary.value += project.value
      }
    }
  })

  return {
    selectedProjects,
    unselectedProjects,
    teamSummaries,
  }
}
