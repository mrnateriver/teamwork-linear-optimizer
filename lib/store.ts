"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Team, Project, Dependency } from "@/lib/types"

interface AppState {
  // Data
  teams: Team[]
  projects: Record<string, Project>
  dependencies: Dependency[]

  // UI state
  selectedTeamId: string | null
  selectedProjectId: string | null
  showGlobalView: boolean
  initialized: boolean

  // Actions
  initializeStore: () => void

  // Team actions
  addTeam: (name: string) => string
  updateTeamCapacity: (id: string, capacity: number) => void
  selectTeam: (id: string | null) => void

  // Project actions
  addProject: (teamId: string, title: string) => string
  updateProject: (id: string, data: Partial<Project>) => void
  deleteProject: (id: string) => void
  selectProject: (id: string | null) => void
  duplicateProject: (id: string, targetTeamId: string) => string
  duplicateProjectAsLinked: (id: string, targetTeamId: string) => string

  // Dependency actions
  addDependency: (sourceId: string, targetId: string) => void
  removeDependency: (sourceId: string, targetId: string) => void
  checkForCyclicDependency: (sourceId: string, targetId: string) => boolean
  getProjectDependencies: (projectId: string) => string[]
  getProjectDependents: (projectId: string) => string[]
  getDependencies: () => Dependency[]

  // View actions
  setShowGlobalView: (show: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      teams: [],
      projects: {},
      dependencies: [],
      selectedTeamId: null,
      selectedProjectId: null,
      showGlobalView: false,
      initialized: false,

      // Initialize the store with sample data if empty
      initializeStore: () => {
        const { teams } = get()

        if (teams.length === 0) {
          set({ initialized: true })
        } else {
          set({ initialized: true })
        }
      },

      // Team actions
      addTeam: (name) => {
        const id = crypto.randomUUID()

        set((state) => ({
          teams: [...state.teams, { id, name, capacity: 0 }],
          selectedTeamId: id,
        }))

        return id
      },

      updateTeamCapacity: (id, capacity) => {
        set((state) => ({
          teams: state.teams.map((team) => (team.id === id ? { ...team, capacity } : team)),
        }))
      },

      selectTeam: (id) => {
        set({ selectedTeamId: id })
      },

      // Project actions
      addProject: (teamId, title) => {
        const id = crypto.randomUUID()
        const newProject: Project = {
          id,
          teamId,
          title,
          effort: 0,
          value: 0,
        }

        set((state) => ({
          projects: { ...state.projects, [id]: newProject },
        }))

        return id
      },

      updateProject: (id, data) => {
        set((state) => {
          const project = state.projects[id]
          if (!project) return state

          const updatedProject = { ...project, ...data }
          const updatedProjects = { ...state.projects, [id]: updatedProject }

          // If this is the source project and title/value changed, update all linked copies
          if (!project.isLinkedCopy && (data.title !== undefined || data.value !== undefined)) {
            Object.values(state.projects).forEach((p) => {
              if (p.sourceProjectId === id) {
                const updates: Partial<Project> = {}
                if (data.title !== undefined) updates.title = data.title
                if (data.value !== undefined) updates.value = data.value
                updatedProjects[p.id] = { ...p, ...updates }
              }
            })
          }

          return { projects: updatedProjects }
        })
      },

      deleteProject: (id) => {
        set((state) => {
          const project = state.projects[id]
          if (!project) return state

          // Collect all projects to delete (original + all linked copies)
          const projectsToDelete = new Set([id])

          // If deleting the original, find all its copies
          if (!project.isLinkedCopy) {
            Object.values(state.projects).forEach((p) => {
              if (p.sourceProjectId === id) {
                projectsToDelete.add(p.id)
              }
            })
          } else {
            // If deleting a copy, also delete the original and all other copies
            const sourceId = project.sourceProjectId
            if (sourceId) {
              projectsToDelete.add(sourceId)
              Object.values(state.projects).forEach((p) => {
                if (p.sourceProjectId === sourceId) {
                  projectsToDelete.add(p.id)
                }
              })
            }
          }

          // Remove all projects to delete
          const remainingProjects = { ...state.projects }
          projectsToDelete.forEach((projectId) => {
            delete remainingProjects[projectId]
          })

          // Remove any dependencies involving deleted projects
          const dependencies = state.dependencies.filter(
            (dep) => !projectsToDelete.has(dep.sourceId) && !projectsToDelete.has(dep.targetId),
          )

          return {
            projects: remainingProjects,
            dependencies,
            // If any deleted project was selected, deselect it
            selectedProjectId: projectsToDelete.has(state.selectedProjectId || "") ? null : state.selectedProjectId,
          }
        })
      },

      selectProject: (id) => {
        set({ selectedProjectId: id })
      },

      duplicateProject: (id, targetTeamId) => {
        const { projects } = get()
        const sourceProject = projects[id]

        if (!sourceProject) return ""

        const newId = crypto.randomUUID()
        const newProject: Project = {
          id: newId,
          teamId: targetTeamId,
          title: `${sourceProject.title} (Copy)`,
          effort: sourceProject.effort,
          value: sourceProject.value,
        }

        set((state) => ({
          projects: { ...state.projects, [newId]: newProject },
        }))

        return newId
      },

      duplicateProjectAsLinked: (id, targetTeamId) => {
        const { projects } = get()
        const sourceProject = projects[id]

        if (!sourceProject) return ""

        const newId = crypto.randomUUID()
        const sourceId = sourceProject.sourceProjectId || id // If source is already a copy, link to the original

        const newProject: Project = {
          id: newId,
          teamId: targetTeamId,
          title: sourceProject.title, // Use original name without suffix
          effort: 0, // Reset effort for the new team to estimate
          value: sourceProject.value, // Keep the same business value
          sourceProjectId: sourceId,
          isLinkedCopy: true,
        }

        set((state) => ({
          projects: { ...state.projects, [newId]: newProject },
        }))

        return newId
      },

      // Dependency actions
      addDependency: (sourceId, targetId) => {
        // Don't add duplicate dependencies
        const { dependencies } = get()
        const exists = dependencies.some((dep) => dep.sourceId === sourceId && dep.targetId === targetId)

        if (exists) return

        set((state) => ({
          dependencies: [...state.dependencies, { sourceId, targetId }],
        }))
      },

      removeDependency: (sourceId, targetId) => {
        set((state) => ({
          dependencies: state.dependencies.filter((dep) => !(dep.sourceId === sourceId && dep.targetId === targetId)),
        }))
      },

      checkForCyclicDependency: (sourceId, targetId) => {
        // Check if adding a dependency from source to target would create a cycle
        const { dependencies } = get()

        // Helper function to check if target can reach source through existing dependencies
        const canReach = (from: string, to: string, visited = new Set<string>()): boolean => {
          if (from === to) return true
          if (visited.has(from)) return false

          visited.add(from)

          // Find all projects that depend on 'from'
          const dependents = dependencies.filter((dep) => dep.sourceId === from).map((dep) => dep.targetId)

          // Check if any of these dependents can reach 'to'
          return dependents.some((dep) => canReach(dep, to, visited))
        }

        // If target can already reach source, adding source -> target would create a cycle
        return canReach(targetId, sourceId)
      },

      getProjectDependencies: (projectId) => {
        // Get all projects that this project depends on (prerequisites)
        const { dependencies } = get()
        return dependencies.filter((dep) => dep.targetId === projectId).map((dep) => dep.sourceId)
      },

      getProjectDependents: (projectId) => {
        // Get all projects that depend on this project
        const { dependencies } = get()
        return dependencies.filter((dep) => dep.sourceId === projectId).map((dep) => dep.targetId)
      },

      getDependencies: () => {
        return get().dependencies
      },

      // View actions
      setShowGlobalView: (show) => {
        set({ showGlobalView: show })
      },
    }),
    {
      name: "team-prioritization-storage",
    },
  ),
)
