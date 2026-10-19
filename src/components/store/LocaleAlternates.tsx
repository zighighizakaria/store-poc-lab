"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LocalePaths } from "@/lib/routes";

// Pages whose URL differs per locale (product, category, collection) register
// their per-locale paths here; the language switcher reads them so it links to
// the translated slug. Other pages keep the current path.

type Value = {
  paths: LocalePaths | null;
  setPaths: (paths: LocalePaths | null) => void;
};

const AlternatesContext = createContext<Value>({ paths: null, setPaths: () => {} });

export function AlternatesProvider({ children }: { children: ReactNode }) {
  const [paths, setPaths] = useState<LocalePaths | null>(null);
  const value = useMemo(() => ({ paths, setPaths }), [paths]);
  return <AlternatesContext.Provider value={value}>{children}</AlternatesContext.Provider>;
}

export function useAlternates(): LocalePaths | null {
  return useContext(AlternatesContext).paths;
}

/** Render inside a page to register its per-locale paths. Renders nothing. */
export function SetAlternates({ paths }: { paths: LocalePaths }) {
  const { setPaths } = useContext(AlternatesContext);
  const key = JSON.stringify(paths);
  useEffect(() => {
    setPaths(JSON.parse(key) as LocalePaths);
    return () => setPaths(null);
  }, [key, setPaths]);
  return null;
}
