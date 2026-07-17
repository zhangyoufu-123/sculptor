"use client";

import { usePathname } from "next/navigation";
import ContextBar from "@/components/ContextBar";

export default function ContextBarWrapper() {
  const pathname = usePathname();

  // Only show on discover/write/reflect, not homepage
  if (pathname === "/" || pathname === "/architect") return null;

  return <ContextBar />;
}
