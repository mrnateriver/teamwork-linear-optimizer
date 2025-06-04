"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChevronsUpDown, Circle, Download, Network } from "lucide-react"; // Added ChevronsUpDown, Check
import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Loader2 } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
  keywords?: string[];
}

export function GlobalView() {
  const storeTeams = useAppStore((state) => state.teams);
  const selectProject = useAppStore((state) => state.selectProject);
  const output = useAppStore(
    useShallow((state) => ({
      selectedProjects: state.selectedProjects,
      unselectedProjects: state.unselectedProjects,
      teamSummaries: state.teamSummaries,
    })),
  );
  const doingSorting = useAppStore((state) => state.doingSorting);
  const activeSortingMode = useAppStore((state) => state.sortingMode);
  const onActiveSortingModeChange = useAppStore(
    (state) => state.setProjectsSortingMode,
  );

  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");
  const [filterComboboxOpen, setFilterComboboxOpen] = useState(false);

  // Key for the filter Command component to ensure re-initialization on data change
  const filterCommandKey = useMemo(() => {
    return (
      storeTeams.map((team) => team.id).join(",") + `_len:${storeTeams.length}`
    );
  }, [storeTeams]);

  const { selectedProjects, unselectedProjects, teamSummaries } =
    useMemo(() => {
      const filterProjects =
        selectedTeamFilter === "all"
          ? () => true
          : (p: Project) => p.teamId === selectedTeamFilter;

      return {
        selectedProjects: output.selectedProjects.filter(filterProjects),
        unselectedProjects: output.unselectedProjects.filter(filterProjects),
        teamSummaries: output.teamSummaries,
      };
    }, [
      selectedTeamFilter,
      output.selectedProjects,
      output.unselectedProjects,
      output.teamSummaries,
    ]);

  const overallUtilization = useMemo(() => {
    const utilizedTeams =
      selectedTeamFilter === "all"
        ? storeTeams
        : storeTeams.filter((team) => team.id === selectedTeamFilter);

    const totalCapacity = utilizedTeams.reduce(
      (sum, team) => sum + team.capacity,
      0,
    );
    const totalAllocated = utilizedTeams.reduce((sum, team) => {
      const summary = teamSummaries[team.id] || { allocated: 0, value: 0 };
      return sum + summary.allocated;
    }, 0);
    return totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
  }, [storeTeams, selectedTeamFilter, teamSummaries]);

  const handleViewDependencies = (project: Project) => {
    selectProject(project.id);
  };

  const getUtilizationColor = (allocated: number, capacity: number) => {
    if (capacity === 0) return "text-gray-400";
    const utilization = (allocated / capacity) * 100;
    if (utilization < 50) return "text-green-500";
    if (utilization < 80) return "text-yellow-500";
    return "text-red-500";
  };

  const exportToCSV = () => {
    if (selectedProjects.length === 0) return;
    const headers = [
      "Project",
      "Team",
      "Effort",
      "Value",
      "Value/Effort Ratio",
    ];
    const rows = selectedProjects.map((project) => {
      const team =
        storeTeams.find((t) => t.id === project.teamId)?.name || "Unknown";
      const effort = project.effort !== null ? project.effort : 0;
      const value = project.value !== null ? project.value : 0;
      const ratio = effort > 0 ? (value / effort).toFixed(2) : "∞";
      return [`"${project.title}"`, `"${team}"`, effort, value, ratio].join(
        ",",
      );
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "prioritized-projects.csv");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayTeams =
    selectedTeamFilter === "all"
      ? storeTeams
      : storeTeams.filter((team) => team.id === selectedTeamFilter);

  const teamFilterOptions: FilterOption[] = useMemo(
    () => [
      {
        value: "all",
        label: "All Teams",
        keywords: ["all", "everyone", "overall"],
      },
      ...storeTeams.map((team) => ({
        value: team.id,
        label: team.name,
        keywords: [team.name],
      })),
    ],
    [storeTeams],
  );

  const selectedFilterDisplayLabel =
    teamFilterOptions.find((option) => option.value === selectedTeamFilter)
      ?.label || "Filter by team...";

  const totalValue = useMemo(
    () =>
      selectedProjects.reduce((acc, project) => acc + (project.value ?? 0), 0),
    [selectedProjects],
  );

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-6">Global Prioritization</h2>

      <div className="flex items-center gap-4 mb-6">
        <label
          htmlFor="team-filter-combobox"
          className="text-sm font-medium shrink-0"
        >
          Filter by Team:
        </label>
        <Popover open={filterComboboxOpen} onOpenChange={setFilterComboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={filterComboboxOpen}
              className="w-[200px] justify-between"
              id="team-filter-combobox"
            >
              <span className="truncate">{selectedFilterDisplayLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command key={filterCommandKey}>
              {" "}
              {/* Key for re-initialization */}
              <CommandInput placeholder="Search team..." />
              <CommandList>
                <CommandEmpty>No team found.</CommandEmpty>
                <CommandGroup>
                  {teamFilterOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value} // Actual value for onSelect
                      keywords={option.keywords} // Keywords for searching
                      onSelect={(currentValue) => {
                        setSelectedTeamFilter(currentValue);
                        setFilterComboboxOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTeamFilter === option.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-xl font-semibold">Team Summary</h3>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Overall Utilization:
              </span>
              <Progress value={overallUtilization} className="flex-1" />
              <span className="text-sm font-medium min-w-[3rem]">
                {overallUtilization.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTeams.length === 0 && selectedTeamFilter === "all" ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No teams created yet.
                    </TableCell>
                  </TableRow>
                ) : displayTeams.length === 0 &&
                  selectedTeamFilter !== "all" ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Team not found or has no data.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayTeams.map((team) => {
                    const summary = teamSummaries[team.id] || {
                      allocated: 0,
                      value: 0,
                    };
                    const remaining = team.capacity - summary.allocated;
                    const utilizationColor = getUtilizationColor(
                      summary.allocated,
                      team.capacity,
                    );

                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Circle
                              className={`h-3 w-3 fill-current ${utilizationColor}`}
                            />
                            {team.name}
                          </div>
                        </TableCell>
                        <TableCell>{team.capacity}</TableCell>
                        <TableCell>
                          {Math.floor(summary.allocated * 100) / 100}
                        </TableCell>
                        <TableCell>
                          {Math.floor(remaining * 100) / 100}
                        </TableCell>
                        <TableCell>{summary.value}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-start gap-4 mb-4">
            <h3 className="text-xl font-semibold">Prioritized Projects</h3>

            <Tabs
              value={activeSortingMode}
              onValueChange={onActiveSortingModeChange as any}
            >
              <TabsList>
                <TabsTrigger value="naive">Sequential</TabsTrigger>
                <TabsTrigger value="naive-deps">
                  Greedy with dependencies
                </TabsTrigger>
                <TabsTrigger value="optimized">Optimized</TabsTrigger>
              </TabsList>
            </Tabs>

            <span className="text-sm text-gray-500">
              Total value: {totalValue}
            </span>

            {doingSorting && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}

            <div className="flex-1" />

            {selectedProjects.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
            )}
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Effort</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No projects selected. Add projects and set team
                      capacities, or adjust filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedProjects.map((project) => {
                    const team = storeTeams.find(
                      (t) => t.id === project.teamId,
                    );
                    const canManageDependencies =
                      project.effort !== null && project.value !== null;
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.title}
                        </TableCell>
                        <TableCell>{team?.name || "Unknown"}</TableCell>
                        <TableCell>
                          {project.effort !== null ? project.effort : "--"}
                        </TableCell>
                        <TableCell>
                          {project.value !== null ? project.value : "--"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDependencies(project)}
                            disabled={!canManageDependencies}
                          >
                            <Network className="h-4 w-4" />
                            <span className="sr-only">View dependencies</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {selectedProjects.length > 0 && unselectedProjects.length > 0 && (
            <div className="relative my-8">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <Badge variant="outline" className="bg-background px-2">
                  Capacity Limit Reached
                </Badge>
              </div>
            </div>
          )}

          {unselectedProjects.length > 0 && (
            <>
              <h3 className="text-xl font-semibold mt-8 mb-4">
                Postponed Projects
              </h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Effort</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-muted-foreground">
                    {unselectedProjects.map((project) => {
                      const team = storeTeams.find(
                        (t) => t.id === project.teamId,
                      );
                      const canManageDependencies =
                        project.effort !== null && project.value !== null;
                      return (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">
                            {project.title}
                          </TableCell>
                          <TableCell>{team?.name || "Unknown"}</TableCell>
                          <TableCell>{project.effort ?? "--"}</TableCell>
                          <TableCell>{project.value ?? "--"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDependencies(project)}
                              disabled={!canManageDependencies}
                            >
                              <Network className="h-4 w-4" />
                              <span className="sr-only">View dependencies</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
