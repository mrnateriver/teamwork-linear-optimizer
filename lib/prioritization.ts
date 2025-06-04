import type { Project, Team, TeamSummary } from "@/lib/types";
import GLPK, { LP, Options, Result } from "glpk.js";

// Define the structure for the optimization algorithm
interface OptimizationProject {
  id: string; // Unique project ID
  team: string; // Assigned team name
  value: number; // Business value of the project
  effort: number; // Effort required from the team
  dependencies: string[]; // IDs of projects that this project depends on
}

interface PrioritizationResult {
  selectedProjects: Project[];
  unselectedProjects: Project[];
  teamSummaries: Record<string, TeamSummary>;
}

/**
 * Perform a topological sort on the DAG of projects.
 * Returns an array of projects in an order such that each project comes
 * after all of its dependencies. Uses Kahn's algorithm.
 */
function topologicalSort(
  projects: OptimizationProject[],
): OptimizationProject[] {
  // Build adjacency list and indegree count for each project
  const adjList: { [id: string]: string[] } = {};
  const indegree: { [id: string]: number } = {};
  const projectIds = new Set(projects.map((p) => p.id));

  for (const proj of projects) {
    // Filter out invalid dependencies (projects that don't exist)
    const validDependencies = proj.dependencies.filter((depId) =>
      projectIds.has(depId),
    );
    indegree[proj.id] = validDependencies.length;
    adjList[proj.id] = []; // initialize adjacency list

    // Update the project's dependencies to only include valid ones
    proj.dependencies = validDependencies;
  }

  for (const proj of projects) {
    for (const dep of proj.dependencies) {
      // dep -> proj (i.e., proj is a neighbor of dep in the DAG)
      // We know dep exists because we filtered invalid dependencies above
      adjList[dep].push(proj.id);
    }
  }

  // Use a queue to perform Kahn's algorithm
  const order: OptimizationProject[] = [];
  const ready: OptimizationProject[] = [];

  // Start with all projects that have no dependencies (indegree 0)
  for (const proj of projects) {
    if (indegree[proj.id] === 0) {
      ready.push(proj);
    }
  }
  // Optionally sort initial ready list to have deterministic order (by ID)
  ready.sort((a, b) => a.id.localeCompare(b.id));

  while (ready.length > 0) {
    // Take the next available project
    const current = ready.shift()!;
    order.push(current);
    // Decrease indegree of all neighbors (dependent projects)
    for (const neighborId of adjList[current.id]) {
      indegree[neighborId] -= 1;
      if (indegree[neighborId] === 0) {
        // All dependencies of this neighbor are now satisfied
        // Find the project object for neighborId and push it to ready list
        const neighborProj = projects.find((p) => p.id === neighborId)!;
        ready.push(neighborProj);
        // Keep the ready list sorted for stable ordering
        ready.sort((a, b) => a.id.localeCompare(b.id));
      }
    }
  }

  return order;
}

/**
 * Optimized planner: uses backtracking (DFS) to find the combination of projects that
 * maximizes total value without exceeding capacities. Ensures that a project is only
 * taken if all its dependencies are taken.
 */
function planProjectsBruteforce(
  teamCapacities: { [team: string]: number },
  projects: OptimizationProject[],
): { sequence: string[]; value: number } {
  // First get a topologically sorted order of projects (so deps come before dependents)
  const topoOrder = topologicalSort(projects);
  const n = topoOrder.length;

  // Set up tracking for the best solution found
  let bestValue = 0;
  let bestSelectedSet: Set<string> = new Set();

  // Recursive DFS to explore include/exclude decisions
  function dfs(
    index: number,
    currentValue: number,
    remainingCap: { [team: string]: number },
    selected: Set<string>,
  ) {
    if (index === n) {
      // Reached the end of the project list, evaluate solution
      if (currentValue > bestValue) {
        bestValue = currentValue;
        bestSelectedSet = new Set(selected);
      }
      return;
    }

    const proj = topoOrder[index];
    // Check if all dependencies of this project are satisfied (i.e., all deps are in the selected set)
    const deps = proj.dependencies;
    const depsSatisfied = deps.every((depId) => selected.has(depId));
    if (!depsSatisfied) {
      // Cannot select this project because a dependency was not selected
      dfs(index + 1, currentValue, remainingCap, selected);
    } else {
      // Option 1: Skip this project
      dfs(index + 1, currentValue, remainingCap, selected);

      // Option 2: Include this project (if capacity allows)
      if (remainingCap[proj.team] >= proj.effort) {
        // Take the project
        const newCap = { ...remainingCap };
        newCap[proj.team] -= proj.effort;
        const newSelected = new Set(selected);
        newSelected.add(proj.id);

        dfs(index + 1, currentValue + proj.value, newCap, newSelected);
        // (No explicit "undo" needed since we passed copies of state)
      }
    }
  }

  // Start DFS with no projects selected
  const initialCap = { ...teamCapacities };
  dfs(0, 0, initialCap, new Set());

  // Prepare the resulting sequence in topologically sorted order
  const bestSequence: string[] = topoOrder
    .filter((p) => bestSelectedSet.has(p.id))
    .map((p) => p.id);
  return { sequence: bestSequence, value: bestValue };
}

/**
 * Naive greedy planner: selects projects based on highest value/effort ratio first.
 * Respects dependency ordering (won't select a project until its deps are selected),
 * but does not reconsider earlier choices, so it may produce a suboptimal set.
 */
function planProjectsNaive(
  teamCapacities: { [team: string]: number },
  projects: OptimizationProject[],
): { sequence: string[]; value: number } {
  // Copy capacities so we don't modify the original object
  const remainingCap: { [team: string]: number } = { ...teamCapacities };

  // Build adjacency list and a mutable indegree map for projects (to track remaining dependencies)
  const adjList: { [id: string]: string[] } = {};
  const indegree: { [id: string]: number } = {};
  for (const proj of projects) {
    indegree[proj.id] = proj.dependencies.length;
    adjList[proj.id] = [];
  }
  for (const proj of projects) {
    for (const dep of proj.dependencies) {
      adjList[dep]?.push(proj.id);
    }
  }

  const resultSequence: string[] = [];
  let totalValue = 0;

  // Start with all independent projects (no dependencies)
  let available = projects.filter((p) => indegree[p.id] === 0);
  // Function to compute value/effort ratio for sorting
  const ratio = (p: OptimizationProject) => (p.value ?? 0) / (p.effort ?? 0);

  while (true) {
    // Among available projects, find the one with the highest value/effort ratio that fits in capacity
    available.sort((a, b) => ratio(b) - ratio(a)); // sort descending by ratio
    let chosenProj: OptimizationProject | undefined = undefined;
    for (const proj of available) {
      if (remainingCap[proj.team] >= proj.effort) {
        chosenProj = proj;
        break;
      }
    }
    if (!chosenProj) {
      // No available project can fit in the remaining capacity (or none available)
      break;
    }

    // "Select" this project
    resultSequence.push(chosenProj.id);
    totalValue += chosenProj.value;
    remainingCap[chosenProj.team] -= chosenProj.effort;

    // Mark the project as done and update the indegrees of its dependents
    available = available.filter((p) => p.id !== chosenProj!.id);
    for (const neighId of adjList[chosenProj.id]) {
      indegree[neighId] -= 1;
      if (indegree[neighId] === 0) {
        // Neighbor's all dependencies are now completed, it becomes available
        const neighborProj = projects.find((p) => p.id === neighId)!;
        available.push(neighborProj);
      }
    }
    // Loop continues to pick the next project
  }

  return { sequence: resultSequence, value: totalValue };
}

async function planProjectsMIP(
  teamCapacities: { [team: string]: number },
  projects: OptimizationProject[],
) {
  // 1. Initialize GLPK.js solver (loads WebAssembly)
  const glpk = await (
    GLPK as unknown as () => Promise<ReturnType<typeof GLPK>>
  )(); // Typings are wrong

  // 2. Define the LP/MIP model in GLPK.js JSON format
  const lpModel: LP = {
    name: "ProjectSelection",
    objective: {
      direction: glpk.GLP_MAX, // maximize objective
      name: "obj",
      vars: projects.map((proj) => ({ name: proj.id, coef: proj.value })),
    },
    subjectTo: [] as any[],
    binaries: projects.map((proj) => proj.id), // treat all project vars as binary [oai_citation:8‡github.com](https://github.com/jvail/glpk.js/#:~:text=%2F,x1%27%2C%20%27x2)
  };

  // 3. Add team capacity constraints
  for (const [team, cap] of Object.entries(teamCapacities)) {
    lpModel.subjectTo.push({
      name: `cap_${team}`,
      vars: projects
        .filter((proj) => proj.team === team)
        .map((proj) => ({ name: proj.id, coef: proj.effort ?? 0 })),
      bnds: { type: glpk.GLP_UP, ub: cap, lb: 0 }, // sum of effort <= capacity
    });
  }

  // 4. Add dependency constraints (x_i - x_dep <= 0 for each dep)
  for (const proj of projects) {
    for (const dep of proj.dependencies) {
      lpModel.subjectTo.push({
        name: `dep_${proj.id}_requires_${dep}`,
        vars: [
          { name: proj.id, coef: 1 },
          { name: dep, coef: -1 },
        ],
        bnds: { type: glpk.GLP_UP, ub: 0, lb: 0 }, // <= 0 (lb 0 ensures no negative infinite bound)
      });
    }
  }

  // 5. Solve the ILP model
  const result = await (
    glpk.solve as unknown as (
      lp: LP,
      options?: number | Options,
    ) => Promise<Result>
  )(lpModel, {
    msglev: glpk.GLP_MSG_OFF,
    presol: true,
    mipgap: 0.005,
  });
  if (
    result.result.status === glpk.GLP_OPT ||
    result.result.status === glpk.GLP_FEAS
  ) {
    console.debug(
      `${result.result.status === glpk.GLP_OPT ? "Optimal" : "Feasible"} total value = ${result.result.z}`,
    );

    const sequence = Array.from(
      new Set(
        Object.entries(result.result.vars)
          .filter(([, x_val]) => x_val === 1)
          .map(([projId]) => projId),
      ),
    );

    const value = result.result.z;

    return { sequence, value };
  } else {
    console.error(
      "No optimal solution found (status:",
      result.result.status,
      ")",
    );

    // Resort to naive optimisation
    return planProjectsNaive(teamCapacities, projects);
  }
}

function planProjectsSequential(
  teamCapacities: { [team: string]: number },
  projects: OptimizationProject[],
): { sequence: string[]; value: number } {
  const sortedProjects = projects.slice().sort((a, b) => b.value - a.value);

  const remainingCap: { [team: string]: number } = { ...teamCapacities };
  const sequence: OptimizationProject[] = [];

  let project: OptimizationProject | undefined;
  while ((project = sortedProjects.shift())) {
    const { team, effort } = project;
    if (remainingCap[team] >= effort) {
      remainingCap[team] -= effort;
      sequence.push(project);
    }
  }

  return {
    sequence: sequence.map((p) => p.id),
    value: sequence.reduce((a, b) => a + b.value, 0),
  };
}

export async function prioritizeProjects(
  mode: "naive" | "naive-deps" | "optimized",
  inputProjects: Project[],
  inputTeams: Team[],
  dependencies: { sourceId: string; targetId: string }[] = [], // Default to empty array
): Promise<PrioritizationResult> {
  const allProjects = inputProjects.map((p) => {
    let effort = Number(p.effort);
    let value = Number(p.value);

    effort = Number.isNaN(effort) ? 0 : effort;
    value = Number.isNaN(value) ? 0 : value;

    return { ...p, effort, value };
  });

  const teams = inputTeams.map((team) => {
    let capacity = Number(team.capacity);
    capacity = Number.isNaN(capacity) ? 0 : capacity;
    return { ...team, capacity };
  });

  // Filter out projects with missing effort or value, or zero value.
  // Allow projects with zero effort if they have non-zero value.
  const validProjects = allProjects.filter(
    (project) =>
      project.effort !== null &&
      project.value !== null &&
      project.effort >= 0 && // Allow zero effort
      project.value > 0, // Must have some value
  );

  const actionableProjectIds = new Set(
    allProjects
      .filter(
        (project) =>
          project.effort !== null &&
          project.value !== null &&
          project.effort >= 0,
      )
      .map((p) => p.id),
  );

  // Transform data structures for the optimization algorithm
  const teamCapacities: { [team: string]: number } = {};
  const teamIdToName: { [id: string]: string } = {};

  teams.forEach((team) => {
    teamCapacities[team.name] = team.capacity;
    teamIdToName[team.id] = team.name;
  });

  // Transform projects to the optimization format
  const optimizationProjects: OptimizationProject[] = validProjects.map(
    (project) => {
      // Get dependencies for this project, filtering out non-actionable projects (thus their dependants will become unblocked)
      const projectDependencies = dependencies
        .filter(
          (dep) =>
            dep.targetId === project.id &&
            actionableProjectIds.has(dep.sourceId),
        )
        .map((dep) => dep.sourceId);

      return {
        id: project.id,
        team: teamIdToName[project.teamId],
        value: project.value!,
        effort: project.effort!,
        dependencies: projectDependencies,
      };
    },
  );

  // Run the optimization algorithm
  let result: ReturnType<typeof planProjectsNaive>;
  switch (mode) {
    case "naive":
      result = planProjectsSequential(teamCapacities, optimizationProjects);
      break;
    case "naive-deps":
      result = planProjectsNaive(teamCapacities, optimizationProjects);
      break;
    case "optimized":
      result = await planProjectsMIP(teamCapacities, optimizationProjects);
      break;
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }

  // Transform results back to the expected format
  const selectedProjectIds = new Set(result.sequence);
  const selectedProjects: Project[] = [];
  const unselectedProjects: Project[] = [];

  // Separate selected and unselected projects, maintaining the optimized order for selected ones
  result.sequence.forEach((projectId) => {
    const project = allProjects.find((p) => p.id === projectId);
    if (project) {
      selectedProjects.push(project);
    }
  });

  // Add unselected projects (both invalid and not chosen by algorithm)
  allProjects.forEach((project) => {
    if (!selectedProjectIds.has(project.id)) {
      unselectedProjects.push(project);
    }
  });

  // Calculate team summaries
  const teamSummaries: Record<string, TeamSummary> = {};
  teams.forEach((team) => {
    teamSummaries[team.id] = {
      allocated: 0,
      value: 0,
    };
  });

  // Update team summaries based on selected projects
  selectedProjects.forEach((project) => {
    if (project.effort !== null && project.value !== null) {
      const teamSummary = teamSummaries[project.teamId];
      if (teamSummary) {
        teamSummary.allocated += project.effort;
        teamSummary.value += project.value;
      }
    }
  });

  return {
    selectedProjects,
    unselectedProjects,
    teamSummaries,
  };
}
