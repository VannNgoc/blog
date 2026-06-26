"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export function TypingAnimation({
  text,
  duration = 100,
  className,
  as: Component = "span",
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, duration);
    return () => clearInterval(timer);
  }, [text, duration]);

  return (
    <Component className={cn(className)}>
      {displayedText}
      {displayedText.length < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </Component>
  );
}
