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
          position: { x: 0, y: 0 }, // Will be auto-layouted later if using a layout algorithm
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
      const projectTeam = teams.find((t) => t.id === project.teamId)

      // First-level dependencies (prerequisites)
      const directDependencies = getProjectDependencies(project.id)
      directDependencies.forEach((depId) => {
        const depProject = projects[depId]
        if (depProject) {
          const depTeam = teams.find((t) => t.id === depProject.teamId)
          addNode(depProject, depTeam, "dependency")
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
          addNode(dependentProject, dependentTeam, "dependent")
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

    // Basic layout (simple grid or column for now, can be improved with a layout library)
    // This is a very naive layout. For better results, consider elkjs or dagre.
    const columns = 3 // Dependencies | Team Projects | Dependents
    const nodesPerColumn: Record<string, Node[]> = { team: [], dependency: [], dependent: [] }
    graphNodes.forEach((node) => {
      if (teamProjects.find((p) => p.id === node.id)) nodesPerColumn.team.push(node)
      else if (node.data.isPrerequisite) nodesPerColumn.dependency.push(node)
      else if (node.data.isDependent) nodesPerColumn.dependent.push(node)
      else nodesPerColumn.team.push(node) // Fallback for safety
    })

    const currentX = 50
    const ySpacing = 120
    const xSpacing = 250

    Object.values(nodesPerColumn).forEach((columnNodes, colIndex) => {
      columnNodes.forEach((node, rowIndex) => {
        node.position = { x: currentX + colIndex * xSpacing, y: 50 + rowIndex * ySpacing }
      })
    })

    setNodes(graphNodes)
    setEdges(graphEdges)
  }, [
    teamId,
    teamProjects,
    projects,
    teams,
    getProjectDependencies,
    getProjectDependents,
    dependencies,
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
