import { cn } from "@/lib/utils";
import { CSSProperties, ReactNode } from "react";

/**
 * Fades its children in via CSS (see `.blur-fade`) — no hooks, no effects, so
 * it deliberately has no "use client": on server-rendered pages it adds nothing
 * to the client bundle, and the sign-in/sign-up pages that are already client
 * components bundle it exactly as before.
 */
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
