import { ViewTransition } from "react";

/**
 * Directional page wrapper for post navigation.
 *
 * The type-keyed maps mean only navigations explicitly tagged `nav-forward` /
 * `nav-back` animate. Everything else — browser back/forward, router.refresh(),
 * Suspense reveals — falls through to `none`, so untagged navigation never
 * picks up a slide it didn't ask for.
 *
 * This has to be rendered inside each `page.tsx` rather than a layout: layouts
 * persist across navigations, so their enter/exit animations never fire.
 */
const directional = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
} as const;

export function NavTransition({ children }: { children: React.ReactNode }) {
  // `ViewTransition` ships in the React canary the App Router runs on, not in
  // the `react` version resolved outside it (Jest, for one). Rendering an
  // undefined element type would hard-crash, so fall through to the children
  // untouched — the pages stay correct, they just don't animate.
  if (!ViewTransition) return <>{children}</>;

  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      {children}
    </ViewTransition>
  );
}
