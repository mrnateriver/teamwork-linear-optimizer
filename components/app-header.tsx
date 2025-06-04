"use client";

import type React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { ImportedJsonFile, Team } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ModeToggle } from "@/components/mode-toggle";
import { Plus, Upload, ChevronsUpDown, Check } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ViewSelectItem {
  value: string;
  label: string;
  type: "team" | "global";
}

export function AppHeader() {
  const storeTeams = useAppStore((state) => state.teams);
  const { addTeam, importData, initialized, initializeStore } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCapacity, setNewTeamCapacity] = useState<number | string>(0);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [createTeamNameError, setCreateTeamNameError] = useState("");
  const [createTeamCapacityError, setCreateTeamCapacityError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [comboboxOpen, setComboboxOpen] = useState(false);

  const commandKey = useMemo(() => {
    return (
      storeTeams.map((team) => team.id).join(",") + `_len:${storeTeams.length}`
    );
  }, [storeTeams]);

  useEffect(() => {
    if (!initialized) {
      initializeStore();
    }
  }, [initialized, initializeStore]);

  const handleAddTeam = () => {
    let hasError = false;
    if (!newTeamName.trim()) {
      setCreateTeamNameError("Team name cannot be empty");
      hasError = true;
    }
    const capacityValue = Number(newTeamCapacity);
    if (isNaN(capacityValue) || capacityValue < 0) {
      setCreateTeamCapacityError("Capacity must be a non-negative number");
      hasError = true;
    }

    if (hasError) return;

    const newTeamId = addTeam(newTeamName.trim(), capacityValue);
    setNewTeamName("");
    setNewTeamCapacity(0);
    setCreateTeamDialogOpen(false);
    setCreateTeamNameError("");
    setCreateTeamCapacityError("");
    router.push(`/team/${newTeamId}`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") {
          alert("Error reading file content.");
          return;
        }
        const jsonData = JSON.parse(text) as ImportedJsonFile;
        if (
          !jsonData ||
          !Array.isArray(jsonData.teams) ||
          typeof jsonData.projects !== "object" ||
          !Array.isArray(jsonData.dependencies)
        ) {
          alert(
            "Invalid JSON file structure. Please ensure it matches the required format.",
          );
          return;
        }
        importData(jsonData);
        alert("Data imported successfully!");
        if (jsonData.teams.length > 0) {
          router.push(`/team/${jsonData.teams[0].id}`);
        } else {
          router.push("/global");
        }
      } catch (error) {
        console.error("Error importing JSON:", error);
        alert(
          "Failed to import JSON. Please check the file format and content.",
        );
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      alert("Error reading file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const getCurrentComboboxValue = (): string => {
    if (pathname === "/global") {
      return "global";
    }
    const teamPathMatch = pathname.match(/^\/team\/([a-zA-Z0-9-]+)/);
    if (teamPathMatch) {
      return teamPathMatch[1]; // teamId
    }
    return "";
  };

  const viewOptions: ViewSelectItem[] = [
    ...storeTeams.map((team: Team) => ({
      value: team.id,
      label: team.name,
      type: "team" as const,
    })),
    { value: "global", label: "Global View", type: "global" as const },
  ];

  const selectedViewDisplayLabel =
    viewOptions.find((option) => option.value === getCurrentComboboxValue())
      ?.label || "Select view...";

  if (!initialized) {
    return (
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Team Prioritization</h1>
          <div className="flex items-center gap-4">
            <div className="h-10 w-[200px] bg-muted rounded animate-pulse"></div>
            <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
            <ModeToggle />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold">
            Team Prioritization
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-[200px] justify-between bg-background/50 backdrop-blur-sm"
              >
                <span className="truncate">{selectedViewDisplayLabel}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command key={commandKey}>
                <CommandInput placeholder="Search view..." />
                <CommandList>
                  <CommandEmpty>No view found.</CommandEmpty>
                  {storeTeams.length > 0 && (
                    <CommandGroup heading="Teams">
                      {storeTeams.map((team) => (
                        <CommandItem
                          key={team.id}
                          value={team.id} // This is the actual value for onSelect
                          keywords={[team.name]} // Add team.name here for explicit searching
                          onSelect={(currentValue) => {
                            // currentValue will be team.id
                            router.push(`/team/${currentValue}`);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              getCurrentComboboxValue() === team.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {team.name}{" "}
                          {/* This is the display text and also implicit search text */}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  <CommandGroup
                    heading={storeTeams.length > 0 ? "Other" : undefined}
                  >
                    <CommandItem
                      key="global"
                      value="global"
                      keywords={["Global View", "Overall"]} // Can add keywords for global too
                      onSelect={() => {
                        router.push("/global");
                        setComboboxOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          getCurrentComboboxValue() === "global"
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      Global View
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Dialog
            open={createTeamDialogOpen}
            onOpenChange={setCreateTeamDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="flex items-center gap-1 bg-primary/90 backdrop-blur-sm"
              >
                <Plus className="h-4 w-4" /> New Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Add a new team to manage projects and capacity.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <Label htmlFor="new-team-name">Team Name</Label>
                  <Input
                    id="new-team-name"
                    placeholder="Team Name"
                    value={newTeamName}
                    onChange={(e) => {
                      setNewTeamName(e.target.value);
                      setCreateTeamNameError("");
                    }}
                    className={createTeamNameError ? "border-red-500" : ""}
                  />
                  {createTeamNameError && (
                    <p className="text-red-500 text-sm mt-1">
                      {createTeamNameError}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="new-team-capacity">
                    Initial Capacity (person-days)
                  </Label>
                  <Input
                    id="new-team-capacity"
                    type="number"
                    placeholder="0"
                    value={newTeamCapacity}
                    min="0"
                    onChange={(e) => {
                      setNewTeamCapacity(
                        e.target.value === "" ? "" : Number(e.target.value),
                      );
                      setCreateTeamCapacityError("");
                    }}
                    className={createTeamCapacityError ? "border-red-500" : ""}
                  />
                  {createTeamCapacityError && (
                    <p className="text-red-500 text-sm mt-1">
                      {createTeamCapacityError}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateTeamDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddTeam}>Create Team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            className="flex items-center gap-1 bg-background/50 backdrop-blur-sm"
          >
            <Upload className="h-4 w-4" /> Import JSON
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
