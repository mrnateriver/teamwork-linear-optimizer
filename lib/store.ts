"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Team,
  Project,
  Dependency,
  ImportedJsonFile,
  TeamSummary,
} from "@/lib/types";
import { prioritizeProjects } from "./prioritization";

interface AppState {
  // Data
  teams: Team[];
  projects: Record<string, Project>;
  dependencies: Dependency[];

  // Prioritization results
  selectedProjects: Project[];
  unselectedProjects: Project[];
  teamSummaries: Record<string, TeamSummary>;

  // UI state
  selectedTeamId: string | null; // Still useful for non-route related selections or default states
  selectedProjectId: string | null;
  showGlobalView: boolean; // Can be deprecated or used for other UI toggles if needed
  initialized: boolean;

  // Actions
  initializeStore: () => void;
  importData: (data: ImportedJsonFile) => void;
  prioritizeProjects: () => Promise<void>;

  // Team actions
  addTeam: (name: string, capacity?: number) => string; // Returns new team ID
  updateTeamName: (id: string, name: string) => void;
  updateTeamCapacity: (id: string, capacity: number) => void;
  deleteTeam: (
    id: string,
    currentPathname?: string,
    navigate?: (path: string) => void,
  ) => void; // Added params for navigation
  selectTeam: (id: string | null) => void; // May become less critical for view rendering

  // Project actions
  addProject: (teamId: string, title: string) => string;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string | null) => void;
  duplicateProject: (id: string, targetTeamId: string) => string;
  duplicateProjectAsLinked: (id: string, targetTeamId: string) => string;

  // Dependency actions
  addDependency: (sourceId: string, targetId: string) => void;
  removeDependency: (sourceId: string, targetId: string) => void;
  checkForCyclicDependency: (sourceId: string, targetId: string) => boolean;
  getProjectDependencies: (projectId: string) => string[];
  getProjectDependents: (projectId: string) => string[];
  getDependencies: () => Dependency[];

  // View actions
  setShowGlobalView: (show: boolean) => void; // May be deprecated
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      teams: [],
      projects: {},
      dependencies: [],
      selectedTeamId: null,
      selectedProjectId: null,
      showGlobalView: false, // Default, routing will override
      initialized: false,
      selectedProjects: [],
      unselectedProjects: [],
      teamSummaries: {},

      initializeStore: () => {
        if (!get().initialized) {
          set({ initialized: true });
        }
      },

      importData: (data: ImportedJsonFile) => {
        if (
          !data ||
          !Array.isArray(data.teams) ||
          typeof data.projects !== "object" ||
          !Array.isArray(data.dependencies)
        ) {
          console.error("Invalid data format for import.");
          return;
        }
        set({
          teams: data.teams,
          projects: data.projects,
          dependencies: data.dependencies,
          selectedTeamId: data.teams.length > 0 ? data.teams[0].id : null,
          selectedProjectId: null,
          showGlobalView: data.teams.length === 0, // This might be less relevant now
          initialized: true,
        });
        void get().prioritizeProjects();
      },

      prioritizeProjects: async () => {
        const { projects, teams, dependencies } = get();
        const prioritizedProjects = await prioritizeProjects(
          Object.values(projects),
          teams,
          dependencies,
        );
        set({ ...prioritizedProjects });
      },

      addTeam: (name, capacity = 0) => {
        const id = crypto.randomUUID();
        set((state) => ({
          teams: [...state.teams, { id, name, capacity }],
          // selectedTeamId: id, // Navigation will handle setting the view
          // showGlobalView: false,
        }));
        void get().prioritizeProjects();
        return id; // Return new team ID for navigation
      },

      updateTeamName: (id, name) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, name } : team,
          ),
        }));
      },

      updateTeamCapacity: (id, capacity) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, capacity } : team,
          ),
        }));
        void get().prioritizeProjects();
      },

      deleteTeam: (id, currentPathname, navigate) => {
        set((state) => {
          const teamToDelete = state.teams.find((team) => team.id === id);
          if (!teamToDelete) return state;

          const projectsToDeleteIds = Object.values(state.projects)
            .filter((p) => p.teamId === id)
            .map((p) => p.id);
          const remainingProjects: Record<string, Project> = {
            ...state.projects,
          };
          projectsToDeleteIds.forEach(
            (projectId) => delete remainingProjects[projectId],
          );

          Object.values(remainingProjects).forEach((project) => {
            if (
              project.isLinkedCopy &&
              project.sourceProjectId &&
              projectsToDeleteIds.includes(project.sourceProjectId)
            ) {
              remainingProjects[project.id] = {
                ...project,
                isLinkedCopy: false,
                sourceProjectId: undefined,
              };
            }
          });

          const remainingDependencies = state.dependencies.filter(
            (dep) =>
              !projectsToDeleteIds.includes(dep.sourceId) &&
              !projectsToDeleteIds.includes(dep.targetId),
          );
          const remainingTeams = state.teams.filter((team) => team.id !== id);

          let nextSelectedTeamId = state.selectedTeamId;
          let shouldNavigate = false;
          let navigationPath = "/global";

          if (currentPathname && currentPathname === `/team/${id}`) {
            shouldNavigate = true;
            if (remainingTeams.length > 0) {
              navigationPath = `/team/${remainingTeams[0].id}`;
              nextSelectedTeamId = remainingTeams[0].id;
            } else {
              // navigationPath remains "/global"
              nextSelectedTeamId = null;
            }
          } else if (state.selectedTeamId === id) {
            // If selected team in store was deleted but not current view
            nextSelectedTeamId =
              remainingTeams.length > 0 ? remainingTeams[0].id : null;
          }

          if (shouldNavigate && navigate) {
            navigate(navigationPath);
          }

          return {
            teams: remainingTeams,
            projects: remainingProjects,
            dependencies: remainingDependencies,
            selectedTeamId: nextSelectedTeamId,
            showGlobalView: nextSelectedTeamId === null, // if no teams left, maybe show global or welcome
            selectedProjectId: projectsToDeleteIds.includes(
              state.selectedProjectId || "",
            )
              ? null
              : state.selectedProjectId,
          };
        });
        void get().prioritizeProjects();
      },

      selectTeam: (id) => {
        // This action might be called by TeamPage to sync store if needed
        set({ selectedTeamId: id, showGlobalView: false });
      },

      addProject: (teamId, title) => {
        const id = crypto.randomUUID();
        const newProject: Project = {
          id,
          teamId,
          title,
          effort: null,
          value: null,
        };
        set((state) => ({ projects: { ...state.projects, [id]: newProject } }));
        void get().prioritizeProjects();
        return id;
      },

      updateProject: (id, data) => {
        set((state) => {
          const project = state.projects[id];
          if (!project) return state;
          const updatedProject = { ...project, ...data };
          const updatedProjects = { ...state.projects, [id]: updatedProject };
          if (
            !project.isLinkedCopy &&
            (data.title !== undefined || data.value !== undefined)
          ) {
            Object.values(state.projects).forEach((p) => {
              if (p.sourceProjectId === id) {
                const updates: Partial<Project> = {};
                if (data.title !== undefined) updates.title = data.title;
                if (data.value !== undefined) updates.value = data.value;
                updatedProjects[p.id] = { ...p, ...updates };
              }
            });
          }
          return { projects: updatedProjects };
        });
        void get().prioritizeProjects();
      },

      deleteProject: (id) => {
        set((state) => {
          const project = state.projects[id];
          if (!project) return state;
          const projectsToDelete = new Set([id]);
          if (!project.isLinkedCopy) {
            Object.values(state.projects).forEach((p) => {
              if (p.sourceProjectId === id) projectsToDelete.add(p.id);
            });
          } else {
            const sourceId = project.sourceProjectId;
            if (sourceId) {
              projectsToDelete.add(sourceId);
              Object.values(state.projects).forEach((p) => {
                if (p.sourceProjectId === sourceId) projectsToDelete.add(p.id);
              });
            }
          }
          const remainingProjects = { ...state.projects };
          projectsToDelete.forEach(
            (projectId) => delete remainingProjects[projectId],
          );
          const dependencies = state.dependencies.filter(
            (dep) =>
              !projectsToDelete.has(dep.sourceId) &&
              !projectsToDelete.has(dep.targetId),
          );
          return {
            projects: remainingProjects,
            dependencies,
            selectedProjectId: projectsToDelete.has(
              state.selectedProjectId || "",
            )
              ? null
              : state.selectedProjectId,
          };
        });
        void get().prioritizeProjects();
      },

      selectProject: (id) => {
        set({ selectedProjectId: id });
      },

      duplicateProject: (id, targetTeamId) => {
        const { projects } = get();
        const sourceProject = projects[id];
        if (!sourceProject) return "";
        const newId = crypto.randomUUID();
        const newProject: Project = {
          id: newId,
          teamId: targetTeamId,
          title: sourceProject.title,
          effort: sourceProject.effort,
          value: sourceProject.value,
        };
        set((state) => ({
          projects: { ...state.projects, [newId]: newProject },
        }));
        void get().prioritizeProjects();
        return newId;
      },

      duplicateProjectAsLinked: (id, targetTeamId) => {
        const { projects } = get();
        const sourceProject = projects[id];
        if (!sourceProject) return "";
        const newId = crypto.randomUUID();
        const sourceId = sourceProject.sourceProjectId || id;
        const newProject: Project = {
          id: newId,
          teamId: targetTeamId,
          title: sourceProject.title,
          effort: null,
          value: sourceProject.value,
          sourceProjectId: sourceId,
          isLinkedCopy: true,
        };
        set((state) => ({
          projects: { ...state.projects, [newId]: newProject },
        }));
        return newId;
      },

      addDependency: (sourceId, targetId) => {
        const { dependencies } = get();
        const exists = dependencies.some(
          (dep) => dep.sourceId === sourceId && dep.targetId === targetId,
        );
        if (exists) return;
        set((state) => ({
          dependencies: [...state.dependencies, { sourceId, targetId }],
        }));
        void get().prioritizeProjects();
      },

      removeDependency: (sourceId, targetId) => {
        set((state) => ({
          dependencies: state.dependencies.filter(
            (dep) => !(dep.sourceId === sourceId && dep.targetId === targetId),
          ),
        }));
        void get().prioritizeProjects();
      },

      checkForCyclicDependency: (sourceId, targetId) => {
        const { dependencies } = get();
        const canReach = (
          from: string,
          to: string,
          visited = new Set<string>(),
        ): boolean => {
          if (from === to) return true;
          if (visited.has(from)) return false;
          visited.add(from);
          const dependents = dependencies
            .filter((dep) => dep.sourceId === from)
            .map((dep) => dep.targetId);
          return dependents.some((dep) => canReach(dep, to, visited));
        };
        return canReach(targetId, sourceId);
      },

      getProjectDependencies: (projectId) => {
        const { dependencies } = get();
        return dependencies
          .filter((dep) => dep.targetId === projectId)
          .map((dep) => dep.sourceId);
      },

      getProjectDependents: (projectId) => {
        const { dependencies } = get();
        return dependencies
          .filter((dep) => dep.sourceId === projectId)
          .map((dep) => dep.targetId);
      },

      getDependencies: () => {
        return get().dependencies;
      },

      setShowGlobalView: (show) => {
        // This might be used for other UI purposes or deprecated
        set({ showGlobalView: show });
      },
    }),
    {
      name: "team-prioritization-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initialized = true;
        }
      },
    },
  ),
);
