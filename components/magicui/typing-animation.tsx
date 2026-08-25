import { cn } from "@/lib/utils";

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Types `text` out one character at a time — in CSS, not JavaScript.
 *
 * The previous version held the text in `useState("")`, which meant the server
 * rendered an *empty* heading: the words only existed after the JS bundle
 * downloaded, React hydrated, and a 95ms interval ticked once per character.
 * On a phone that stacked ~2s of hydration in front of a 1.2s animation, and
 * since this heading is the largest text on the landing page, that whole delay
 * landed directly on Largest Contentful Paint.
 *
 * Here the full string is in the server-rendered HTML — real text a crawler and
 * the LCP heuristic can both see immediately — and the reveal is a `steps()`
 * animation clipping the element's own width. No JS, so nothing waits on
 * hydration, and the component stays a server component (one less entry in the
 * client bundle).
 *
 * `max-width` animates as a percentage of the element's natural width, so the
 * effect doesn't depend on font metrics the way a `ch`-based clip would — which
 * matters here, because this heading is set in a proportional face with wide
 * letter-spacing.
 */
export function TypingAnimation({
  text,
  duration = 100,
  className,
  as: Component = "span",
}: TypingAnimationProps) {
  return (
    <Component
      className={cn("typing", className)}
      style={
        {
          "--typing-steps": text.length,
          "--typing-duration": `${(text.length * duration) / 1000}s`,
        } as React.CSSProperties
      }
    >
      {text}
    </Component>
  );
}
