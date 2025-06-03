"use client"

import { useEffect, useMemo } from "react"
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
import type { Project as ProjectType, Team } from "@/lib/types"

const nodeTypes: NodeTypes = {
  project: ProjectNode,
}

interface TeamDependencyGraphProps {
  teamId: string
}

export function TeamDependencyGraph({ teamId }: TeamDependencyGraphProps) {
  const { projects, teams, getProjectDependencies, getProjectDependents, dependencies } = useAppStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const teamProjects = useMemo(() => {
    return Object.values(projects).filter((p) => p.teamId === teamId)
  }, [projects, teamId])

  useEffect(() => {
    if (!teamId || teamProjects.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    const graphNodes: Node[] = []
    const graphEdges: Edge[] = []
    const addedNodeIds = new Set<string>()

    // Function to add a node if not already added
    const addNode = (project: ProjectType, team: Team | undefined, type?: "team" | "dependency" | "dependent") => {
      if (!addedNodeIds.has(project.id)) {
        let nodeTypeStyle: Partial<Node["data"]> = {}
        if (type === "team") {
          // Main team projects
        } else if (type === "dependency") {
          nodeTypeStyle = { isPrerequisite: true }
        } else if (type === "dependent") {
          nodeTypeStyle = { isDependent: true }
        }

        graphNodes.push({
          id: project.id,
          type: "project",
          data: {
            project,
            team,
            ...nodeTypeStyle,
          },
          position: { x: 0, y: 0 }, // Will be auto-layouted
        })
        addedNodeIds.add(project.id)
      }
    }

    // Add all projects of the current team as main nodes
    teamProjects.forEach((project) => {
      const team = teams.find((t) => t.id === project.teamId)
      addNode(project, team, "team")
    })

    // For each team project, find its 1st level dependencies and dependents
    teamProjects.forEach((project) => {
      // First-level dependencies (prerequisites)
      const directDependencies = getProjectDependencies(project.id)
      directDependencies.forEach((depId) => {
        const depProject = projects[depId]
        if (depProject) {
          const depTeam = teams.find((t) => t.id === depProject.teamId)
          addNode(depProject, depTeam, "dependency") // Mark as dependency
          graphEdges.push({
            id: `${depId}-${project.id}`,
            source: depId,
            target: project.id,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#888" },
            style: { stroke: "#888" },
          })
        }
      })

      // First-level dependents (projects that depend on this one)
      const directDependents = getProjectDependents(project.id)
      directDependents.forEach((dependentId) => {
        const dependentProject = projects[dependentId]
        if (dependentProject) {
          const dependentTeam = teams.find((t) => t.id === dependentProject.teamId)
          addNode(dependentProject, dependentTeam, "dependent") // Mark as dependent
          graphEdges.push({
            id: `${project.id}-${dependentId}`,
            source: project.id,
            target: dependentId,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#888" },
            style: { stroke: "#888" },
          })
        }
      })
    })

    // Layout logic: Predecessors (Dependencies) | Team Projects | Successors (Dependents)
    const columnNodes: {
      dependencies: Node[]
      team: Node[]
      dependents: Node[]
    } = {
      dependencies: [],
      team: [],
      dependents: [],
    }

    graphNodes.forEach((node) => {
      if (node.data.isPrerequisite) {
        columnNodes.dependencies.push(node)
      } else if (node.data.isDependent) {
        columnNodes.dependents.push(node)
      } else {
        // Assume it's a team project if not explicitly a dependency or dependent
        columnNodes.team.push(node)
      }
    })

    const ySpacing = 120
    const xSpacing = 300 // Increased spacing between columns
    const initialX = 50

    // Layout dependencies (Column 1 - Left)
    columnNodes.dependencies.forEach((node, rowIndex) => {
      node.position = { x: initialX, y: 50 + rowIndex * ySpacing }
    })

    // Layout team projects (Column 2 - Middle)
    columnNodes.team.forEach((node, rowIndex) => {
      node.position = { x: initialX + xSpacing, y: 50 + rowIndex * ySpacing }
    })

    // Layout dependents (Column 3 - Right)
    columnNodes.dependents.forEach((node, rowIndex) => {
      node.position = { x: initialX + 2 * xSpacing, y: 50 + rowIndex * ySpacing }
    })

    setNodes([...graphNodes]) // Trigger re-render with new positions
    setEdges(graphEdges)
  }, [
    teamId,
    teamProjects,
    projects,
    teams,
    getProjectDependencies,
    getProjectDependents,
    dependencies, // Keep dependencies in the dependency array for ReactFlow updates
    setNodes,
    setEdges,
  ])

  if (teamProjects.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">No projects in this team to display dependencies for.</div>
    )
  }

  return (
    <div className="h-[600px] w-full border rounded-md">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
