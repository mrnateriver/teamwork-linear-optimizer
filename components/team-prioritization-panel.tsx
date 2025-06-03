"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types"; // Added Team, Dependency
import { Download, Network } from "lucide-react";
import { useMemo } from "react"; // Added useState, useEffect
import { useShallow } from "zustand/react/shallow";

interface TeamPrioritizationPanelProps {
  teamId: string;
}

export function TeamPrioritizationPanel({
  teamId,
}: TeamPrioritizationPanelProps) {
  const storeTeams = useAppStore((state) => state.teams);
  const selectProject = useAppStore((state) => state.selectProject);
  const output = useAppStore(
    useShallow((state) => ({
      selectedProjects: state.selectedProjects,
      unselectedProjects: state.unselectedProjects,
      teamSummaries: state.teamSummaries,
    })),
  );

  const currentTeam = useMemo(
    () => storeTeams.find((t) => t.id === teamId),
    [storeTeams, teamId],
  );

  const { selectedProjects, unselectedProjects, teamSummaries } =
    useMemo(() => {
      if (!currentTeam) {
        return {
          selectedProjects: [],
          unselectedProjects: [],
          teamSummaries: {},
        };
      }

      const filterProjects = (p: Project) => p.teamId === teamId;
      return {
        selectedProjects: output.selectedProjects.filter(filterProjects),
        unselectedProjects: output.unselectedProjects.filter(filterProjects),
        teamSummaries: output.teamSummaries,
      };
    }, [teamId]);

  // Calculate team utilization
  const teamUtilization = useMemo(() => {
    if (!currentTeam || currentTeam.capacity === 0) return 0;
    const summary = teamSummaries[teamId] || { allocated: 0, value: 0 };
    return (summary.allocated / currentTeam.capacity) * 100;
  }, [currentTeam, teamSummaries, teamId]);

  const handleViewDependencies = (project: Project) => {
    selectProject(project.id);
  };

  // Function to export prioritized projects to CSV
  const exportToCSV = () => {
    if (selectedProjects.length === 0 || !currentTeam) return;

    const headers = ["Project", "Effort", "Value", "Value/Effort Ratio"];
    const rows = selectedProjects.map((project) => {
      const effort = project.effort !== null ? project.effort : 0;
      const value = project.value !== null ? project.value : 0;
      const ratio = effort > 0 ? (value / effort).toFixed(2) : "∞";
      return [`"${project.title}"`, effort, value, ratio].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${currentTeam.name}-prioritized-projects.csv`,
    );
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!currentTeam) return null; // Or currentTeam

  const summary = teamSummaries[teamId] || { allocated: 0, value: 0 };
  const remaining = (currentTeam?.capacity || 0) - summary.allocated;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Team Prioritization</h3>
        {selectedProjects.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Capacity Utilization</span>
            <span className="font-medium">{teamUtilization.toFixed(0)}%</span>
          </div>
          <Progress value={teamUtilization} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Allocated:</span>{" "}
              <span className="font-medium">{summary.allocated}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining:</span>{" "}
              <span className="font-medium">{remaining}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Value:</span>{" "}
              <span className="font-medium">{summary.value}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Capacity:</span>{" "}
              <span className="font-medium">{currentTeam?.capacity || 0}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-medium">Prioritized Projects</h4>
          {selectedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects selected. Add projects with effort and value
              estimates.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-2 border rounded-md bg-background"
                >
                  <div>
                    <div className="font-medium">{project.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Effort: {project.effort} | Value: {project.value}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDependencies(project)}
                    disabled={project.effort === null || project.value === null}
                  >
                    <Network className="h-4 w-4" />
                    <span className="sr-only">View dependencies</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {unselectedProjects.length > 0 && (
          <>
            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <Badge variant="outline" className="bg-background px-2">
                  Capacity Limit Reached
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Postponed Projects</h4>
              <div className="space-y-2">
                {unselectedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-2 border rounded-md bg-background text-muted-foreground"
                  >
                    <div>
                      <div className="font-medium">{project.title}</div>
                      <div className="text-xs">
                        Effort: {project.effort ?? "--"} | Value:{" "}
                        {project.value ?? "--"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDependencies(project)}
                      disabled={
                        project.effort === null || project.value === null
                      }
                    >
                      <Network className="h-4 w-4" />
                      <span className="sr-only">View dependencies</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
