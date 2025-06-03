"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import { useAppStore } from "@/lib/store";
import { ProjectNode } from "@/components/project-node";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Plus, Link, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const nodeTypes: NodeTypes = {
  project: ProjectNode,
};

function DependencyGraph({
  selectedProjectId,
}: {
  selectedProjectId: string | null;
}) {
  const {
    projects,
    teams,
    getProjectDependencies,
    getProjectDependents,
    dependencies,
  } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!selectedProjectId) return;

    const project = projects[selectedProjectId];
    if (!project) return;

    const projectDependencies = getProjectDependencies(selectedProjectId);
    const dependents = getProjectDependents(selectedProjectId);

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
    ];

    projectDependencies.forEach((depId, index) => {
      const depProject = projects[depId];
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
        });
      }
    });

    dependents.forEach((depId, index) => {
      const depProject = projects[depId];
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
        });
      }
    });

    const graphEdges: Edge[] = [];
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
      });
    });

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
      });
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [
    selectedProjectId,
    projects,
    teams,
    getProjectDependencies,
    getProjectDependents,
    dependencies,
  ]);

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
  );
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
    showGlobalView,
  } = useAppStore();

  const [selectedTeamIdForLink, setSelectedTeamIdForLink] =
    useState<string>(""); // Renamed for clarity
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<string | null>(
    null,
  );
  const [targetProjectIdForExistingLink, setTargetProjectIdForExistingLink] =
    useState<string>(""); // Renamed
  const [newProjectTitleForNewLink, setNewProjectTitleForNewLink] =
    useState(""); // Renamed
  const [error, setError] = useState<string | null>(null);

  const selectedProject = selectedProjectId
    ? projects[selectedProjectId]
    : null;

  const currentDependencies = selectedProjectId
    ? getProjectDependencies(selectedProjectId)
    : [];

  const selectedTeamProjectsForExistingLink = Object.values(projects).filter(
    (project) =>
      project.teamId === selectedTeamIdForLink &&
      !currentDependencies.includes(project.id) &&
      project.id !== selectedProjectId,
  );

  const isReadonly = showGlobalView;

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedTeamIdForLink("");
      setShowAdvancedOptions(null);
      setTargetProjectIdForExistingLink("");
      setNewProjectTitleForNewLink("");
      setError(null);
    }
  }, [selectedProjectId]);

  const linkedCopyExistsInTargetTeam = useMemo(() => {
    if (!selectedProjectId || !selectedTeamIdForLink) return false;
    return Object.values(projects).some(
      (p) =>
        p.teamId === selectedTeamIdForLink &&
        p.isLinkedCopy &&
        p.sourceProjectId === selectedProjectId,
    );
  }, [projects, selectedProjectId, selectedTeamIdForLink]);

  const handleLinkToTeamDefault = useCallback(() => {
    if (
      !selectedProjectId ||
      !selectedTeamIdForLink ||
      !selectedProject ||
      isReadonly
    )
      return;
    setError(null);

    if (selectedTeamIdForLink === selectedProject.teamId) {
      setError(
        "Cannot link to the same team using this option. Use 'Link to existing project' or 'Create new project'.",
      );
      return;
    }

    const newLinkedProjectId = duplicateProjectAsLinked(
      selectedProjectId,
      selectedTeamIdForLink,
    );
    addDependency(newLinkedProjectId, selectedProjectId);

    setSelectedTeamIdForLink("");
    setShowAdvancedOptions(null);
  }, [
    selectedProjectId,
    selectedTeamIdForLink,
    selectedProject,
    duplicateProjectAsLinked,
    addDependency,
    isReadonly,
  ]);

  const handleLinkToExistingProject = useCallback(() => {
    if (!selectedProjectId || !targetProjectIdForExistingLink || isReadonly)
      return;
    setError(null);

    if (
      checkForCyclicDependency(
        targetProjectIdForExistingLink,
        selectedProjectId,
      )
    ) {
      setError("Cannot create a circular dependency");
      return;
    }
    addDependency(targetProjectIdForExistingLink, selectedProjectId);
    setTargetProjectIdForExistingLink("");
    setShowAdvancedOptions(null);
  }, [
    selectedProjectId,
    targetProjectIdForExistingLink,
    addDependency,
    checkForCyclicDependency,
    isReadonly,
  ]);

  const handleCreateNewProjectAndLink = useCallback(() => {
    if (
      !selectedProjectId ||
      !selectedTeamIdForLink ||
      !newProjectTitleForNewLink.trim() ||
      isReadonly
    )
      return;
    setError(null);

    const newProjectId = addProject(
      selectedTeamIdForLink,
      newProjectTitleForNewLink.trim(),
    );
    addDependency(newProjectId, selectedProjectId);

    setNewProjectTitleForNewLink("");
    setShowAdvancedOptions(null);
  }, [
    selectedProjectId,
    selectedTeamIdForLink,
    newProjectTitleForNewLink,
    addProject,
    addDependency,
    isReadonly,
  ]);

  const resetAdvancedOptions = () => {
    setShowAdvancedOptions(null);
    setTargetProjectIdForExistingLink("");
    setNewProjectTitleForNewLink("");
    setError(null);
  };

  if (!selectedProject) return null;

  return (
    <Sheet
      open={!!selectedProjectId}
      onOpenChange={(open) => !open && selectProject(null)}
    >
      <SheetContent className="sm:max-w-xl md:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Dependencies: {selectedProject.title}</SheetTitle>
          <SheetDescription>
            {isReadonly
              ? "View project dependencies"
              : "Manage dependencies between projects"}
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
              <h3 className="text-lg font-semibold mb-3">
                Add Project Dependencies
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a team to add dependencies from. You can create
                dependencies within the same team or across different teams.
              </p>

              <div className="space-y-4">
                <Select
                  value={selectedTeamIdForLink}
                  onValueChange={setSelectedTeamIdForLink}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                        {team.id === selectedProject.teamId && (
                          <span className="ml-2 text-muted-foreground">
                            (Current Team)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTeamIdForLink && (
                  <div className="space-y-3">
                    <TooltipProvider>
                      <Tooltip
                        open={linkedCopyExistsInTargetTeam ? undefined : false}
                      >
                        <TooltipTrigger asChild>
                          {/* The Button component itself needs to be wrapped for TooltipTrigger when disabled */}
                          <span tabIndex={0}>
                            {" "}
                            {/* Wrapper for disabled button tooltip */}
                            <Button
                              onClick={handleLinkToTeamDefault}
                              className="w-full flex items-center gap-2"
                              disabled={linkedCopyExistsInTargetTeam}
                              aria-disabled={linkedCopyExistsInTargetTeam} // For accessibility
                            >
                              <ArrowRight className="h-4 w-4" />
                              Link to{" "}
                              {
                                teams.find(
                                  (t) => t.id === selectedTeamIdForLink,
                                )?.name
                              }
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {linkedCopyExistsInTargetTeam && (
                          <TooltipContent>
                            <p>
                              A linked copy of "{selectedProject.title}" already
                              exists in{" "}
                              {
                                teams.find(
                                  (t) => t.id === selectedTeamIdForLink,
                                )?.name
                              }
                              .
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowAdvancedOptions(
                            showAdvancedOptions === "existing"
                              ? null
                              : "existing",
                          )
                        }
                        className="flex items-center gap-1"
                      >
                        <Link className="h-4 w-4" />
                        Link to existing project
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowAdvancedOptions(
                            showAdvancedOptions === "new" ? null : "new",
                          )
                        }
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Create new project
                      </Button>
                    </div>

                    {showAdvancedOptions === "existing" && (
                      <div className="border rounded-md p-4 space-y-3">
                        <h4 className="font-medium">
                          Link to Existing Project in{" "}
                          {
                            teams.find((t) => t.id === selectedTeamIdForLink)
                              ?.name
                          }
                        </h4>
                        <Select
                          value={targetProjectIdForExistingLink}
                          onValueChange={setTargetProjectIdForExistingLink}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select existing project" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTeamProjectsForExistingLink.length > 0 ? (
                              selectedTeamProjectsForExistingLink.map(
                                (project) => (
                                  <SelectItem
                                    key={project.id}
                                    value={project.id}
                                  >
                                    {project.title}
                                  </SelectItem>
                                ),
                              )
                            ) : (
                              <SelectItem value="none" disabled>
                                No available projects to link in this team
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleLinkToExistingProject}
                            disabled={!targetProjectIdForExistingLink}
                            size="sm"
                          >
                            Link Project
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetAdvancedOptions}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {showAdvancedOptions === "new" && (
                      <div className="border rounded-md p-4 space-y-3">
                        <h4 className="font-medium">
                          Create New Project in{" "}
                          {
                            teams.find((t) => t.id === selectedTeamIdForLink)
                              ?.name
                          }
                        </h4>
                        <Input
                          placeholder="New project title"
                          value={newProjectTitleForNewLink}
                          onChange={(e) =>
                            setNewProjectTitleForNewLink(e.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCreateNewProjectAndLink}
                            disabled={!newProjectTitleForNewLink.trim()}
                            size="sm"
                          >
                            Create & Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetAdvancedOptions}
                          >
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
              <p className="mt-2">
                Arrows indicate dependency direction (A → B means A must be
                completed before B)
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
