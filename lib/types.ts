export interface Team {
  id: string
  name: string
  capacity: number
}

export interface Project {
  id: string
  teamId: string
  title: string
  effort: number | null
  value: number | null
  sourceProjectId?: string // For linked copies, points to the original project
  isLinkedCopy?: boolean // True if this is a copy of another project
}

export interface Dependency {
  sourceId: string // Source project is a prerequisite for target
  targetId: string // Target project depends on source
}

export interface TeamSummary {
  allocated: number
  value: number
}
