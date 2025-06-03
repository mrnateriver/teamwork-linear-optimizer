"use client"

import { useCallback, useEffect, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeTypes,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
  MarkerType,
} from "reactflow"
import "reactflow/dist/style.css"
import { useAppStore } from "@/lib/store"
import { ProjectNode } from "@/components/project-node"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Link, ArrowRight } from "lucide-react"

const nodeTypes: NodeTypes = {
  project: ProjectNode,
}

function DependencyGraph({ selectedProjectId }: { selectedProjectId: string | null }) {
  const { projects, teams, getProjectDependencies, getProjectDependents, dependencies } = useAppStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Build the graph when the selected project changes or dependencies change
  useEffect(() => {
    if (!selectedProjectId) return

    const project = projects[selectedProjectId]
    if (!project) return

    const projectDependencies = getProjectDependencies(selectedProjectId)
    const dependents = getProjectDependents(selectedProjectId)

    // Create nodes
    const graphNodes: Node[] = [
      {
        id: project.id,
        type: "project",
        data: {
          project,
          team: teams.find((t) => t.id === project.teamId),
          isSelected: true,
        },
        position: { x: 250, y: 150 },
      },
    ]

    // Add dependency nodes (prerequisites)
    projectDependencies.forEach((depId, index) => {
      const depProject = projects[depId]
      if (depProject) {
        graphNodes.push({
          id: depProject.id,
          type: "project",
          data: {
            project: depProject,
            team: teams.find((t) => t.id === depProject.teamId),
            isPrerequisite: true,
          },
          position: { x: 50, y: 50 + index * 100 },
        })
      }
    })

    // Add dependent nodes (projects that depend on this)
    dependents.forEach((depId, index) => {
      const depProject = projects[depId]
      if (depProject) {
        graphNodes.push({
          id: depProject.id,
          type: "project",
          data: {
            project: depProject,
            team: teams.find((t) => t.id === depProject.teamId),
            isDependent: true,
          },
          position: { x: 450, y: 50 + index * 100 },
        })
      }
    })

    // Create edges
    const graphEdges: Edge[] = []

    // Edges from prerequisites to selected project
    projectDependencies.forEach((depId) => {
      graphEdges.push({
        id: `${depId}-${project.id}`,
        source: depId,
        target: project.id,
        animated: true,
        style: { stroke: "#888" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: "#888",
        },
      })
    })

    // Edges from selected project to dependents
    dependents.forEach((depId) => {
      graphEdges.push({
        id: `${project.id}-${depId}`,
        source: project.id,
        target: depId,
        animated: true,
        style: { stroke: "#888" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: "#888",
        },
      })
    })

    setNodes(graphNodes)
    setEdges(graphEdges)
  }, [selectedProjectId, projects, teams, getProjectDependencies, getProjectDependents, dependencies])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}

export function DependencyDrawer() {
  const {
    selectedProjectId,
    selectProject,
    projects,
    teams,
    addDependency,
    addProject,
    duplicateProjectAsLinked,
    checkForCyclicDependency,
    getProjectDependencies,
    getProjectDependents,
    showGlobalView,
  } = useAppStore()

  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<string | null>(null)
  const [targetProjectId, setTargetProjectId] = useState<string>("")
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [error, setError] = useState<string | null>(null)

  const selectedProject = selectedProjectId ? projects[selectedProjectId] : null

  // Get current dependencies to filter out already linked projects
  const currentDependencies = selectedProjectId ? getProjectDependencies(selectedProjectId) : []
  const dependentTeams = currentDependencies.map((depId) => projects[depId]?.teamId).filter(Boolean)

  // Filter out projects that are already linked to the selected project or the selected project itself
  const selectedTeamProjects = Object.values(projects).filter(
    (project) =>
      project.teamId === selectedTeamId &&
      !currentDependencies.includes(project.id) &&
      project.id !== selectedProjectId,
  )

  // Determine if we're in readonly mode (when opened from Global View)
  const isReadonly = showGlobalView

  // Reset state when panel is closed and reopened
  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedTeamId("")
      setShowAdvancedOptions(null)
      setTargetProjectId("")
      setNewProjectTitle("")
      setError(null)
    }
  }, [selectedProjectId])

  const handleLinkToTeam = useCallback(() => {
    if (!selectedProjectId || !selectedTeamId || !selectedProject || isReadonly) return

    setError(null)

    // If linking to the same team, we need to create a new project or link to existing
    if (selectedTeamId === selectedProject.teamId) {
      setError("Please use 'Link to existing project' or 'Create new project' for same-team dependencies")
      return
    }

    // Create a linked duplicate project in the target team
    const newProjectId = duplicateProjectAsLinked(selectedProjectId, selectedTeamId)

    // Create dependency (new project is prerequisite for selected)
    addDependency(newProjectId, selectedProjectId)

    // Reset form
    setSelectedTeamId("")
    setShowAdvancedOptions(null)
  }, [selectedProjectId, selectedTeamId, selectedProject, duplicateProjectAsLinked, addDependency, isReadonly])

  const handleLinkToProject = useCallback(() => {
    if (!selectedProjectId || !targetProjectId || isReadonly) return

    setError(null)

    // Check for cyclic dependency
    if (checkForCyclicDependency(targetProjectId, selectedProjectId)) {
      setError("Cannot create a circular dependency")
      return
    }

    // Create the dependency (target is prerequisite for selected)
    addDependency(targetProjectId, selectedProjectId)

    // Reset selection
    setTargetProjectId("")
    setShowAdvancedOptions(null)
  }, [selectedProjectId, targetProjectId, addDependency, checkForCyclicDependency, isReadonly])

  const handleCreateNewProject = useCallback(() => {
    if (!selectedProjectId || !selectedTeamId || !newProjectTitle.trim() || isReadonly) return

    setError(null)

    // Create new project in target team
    const newProjectId = addProject(selectedTeamId, newProjectTitle.trim())

    // Create dependency (new project is prerequisite for selected)
    addDependency(newProjectId, selectedProjectId)

    // Reset form
    setNewProjectTitle("")
    setShowAdvancedOptions(null)
  }, [selectedProjectId, selectedTeamId, newProjectTitle, addProject, addDependency, isReadonly])

  const resetAdvancedOptions = () => {
    setShowAdvancedOptions(null)
    setTargetProjectId("")
    setNewProjectTitle("")
    setError(null)
  }

  if (!selectedProject) return null

  // Check if the selected team is already linked
  const isTeamAlreadyLinked = selectedTeamId && dependentTeams.includes(selectedTeamId)
  const isSameTeam = selectedTeamId === selectedProject.teamId

  return (
    <Sheet open={!!selectedProjectId} onOpenChange={(open) => !open && selectProject(null)}>
      <SheetContent className="sm:max-w-xl md:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Dependencies: {selectedProject.title}</SheetTitle>
          <SheetDescription>
            {isReadonly ? "View project dependencies" : "Manage dependencies between projects"}
          </SheetDescription>
        </SheetHeader>

        <div className="h-[300px] border rounded-md mb-6">
          <ReactFlowProvider>
            <DependencyGraph selectedProjectId={selectedProjectId} />
          </ReactFlowProvider>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {!isReadonly && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Add Project Dependencies</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a team to add dependencies from. You can create dependencies within the same team or across
                different teams.
              </p>

              <div className="space-y-4">
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                        {team.id === selectedProject.teamId && (
                          <span className="ml-2 text-muted-foreground">(Current)</span>
                        )}
                        {dependentTeams.includes(team.id) && (
                          <Badge variant="outline" className="ml-2">
                            Already linked
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTeamId && (
                  <div className="space-y-3">
                    {!isSameTeam && (
                      <Button
                        onClick={handleLinkToTeam}
                        className="w-full flex items-center gap-2"
                        disabled={isTeamAlreadyLinked}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Link to {teams.find((t) => t.id === selectedTeamId)?.name}
                      </Button>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedOptions(showAdvancedOptions === "existing" ? null : "existing")}
                        className="flex items-center gap-1"
                      >
                        <Link className="h-4 w-4" />
                        Link to existing project
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedOptions(showAdvancedOptions === "new" ? null : "new")}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Create new project
                      </Button>
                    </div>

                    {showAdvancedOptions === "existing" && (
                      <div className="border rounded-md p-4 space-y-3">
                        <h4 className="font-medium">Link to Existing Project</h4>
                        <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select existing project" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTeamProjects.length > 0 ? (
                              selectedTeamProjects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.title}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No available projects to link
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button onClick={handleLinkToProject} disabled={!targetProjectId} size="sm">
                            Link Project
                          </Button>
                          <Button variant="ghost" size="sm" onClick={resetAdvancedOptions}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {showAdvancedOptions === "new" && (
                      <div className="border rounded-md p-4 space-y-3">
                        <h4 className="font-medium">Create New Project</h4>
                        <Input
                          placeholder="New project title"
                          value={newProjectTitle}
                          onChange={(e) => setNewProjectTitle(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleCreateNewProject} disabled={!newProjectTitle.trim()} size="sm">
                            Create & Link
                          </Button>
                          <Button variant="ghost" size="sm" onClick={resetAdvancedOptions}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isReadonly && <Separator />}

          <div>
            <h4 className="text-sm font-medium mb-2">Legend</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>Current project</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span>Projects this depends on</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span>Projects that depend on this</span>
              </div>
              <p className="mt-2">Arrows indicate dependency direction (A → B means A must be completed before B)</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
