"use client";
import { cn } from "@/lib/utils";
import { CSSProperties, ReactNode } from "react";

interface BlurFadeProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
  blur?: string;
}

export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 0.4,
  yOffset = 6,
  blur = "6px",
}: BlurFadeProps) {
  return (
    <div
      className={cn("blur-fade", className)}
      style={
        {
          "--bf-delay": `${delay}s`,
          "--bf-duration": `${duration}s`,
          "--bf-y": `${yOffset}px`,
          "--bf-blur": blur,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
