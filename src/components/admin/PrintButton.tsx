"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton({ children }: { children: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()}>
      <Printer aria-hidden="true" strokeWidth={1.5} className="size-16" />
      {children}
    </Button>
  );
}
