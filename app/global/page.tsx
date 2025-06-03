"use client";

import { GlobalView } from "@/components/global-view";
import { DependencyDrawer } from "@/components/dependency-drawer";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

export default function GlobalPage() {
  const { initialized, initializeStore } = useAppStore();

  useEffect(() => {
    if (!initialized) {
      initializeStore();
    }
  }, [initialized, initializeStore]);

  if (!initialized) {
    return <div>Loading store...</div>; // Or a proper loader
  }

  return (
    <>
      <GlobalView />
      <DependencyDrawer />
    </>
  );
}
