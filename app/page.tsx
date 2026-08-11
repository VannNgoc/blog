import Link from "next/link";
import { Particles } from "@/components/magicui/particles";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { BlurFade } from "@/components/magicui/blur-fade";

export default function Home() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
      <Particles
        quantity={120}
        color="#000000"
        darkColor="#a1a1aa"
        size={0.5}
        staticity={40}
        className="z-0"
      />
      <div className="relative z-10 text-center">
        <TypingAnimation
          text="recollections"
          duration={95}
          className="text-5xl font-medium tracking-widest text-foreground"
          as="h1"
        />
        <BlurFade delay={1.6} yOffset={4}>
          <p className="mt-4 text-sm tracking-wide text-muted-foreground">
            a place for thoughts
          </p>
        </BlurFade>
        <BlurFade delay={2} yOffset={4}>
          {/* The only way forward from the landing page, so it gets a real
              target rather than a line of text: a bordered pill clears the
              44px minimum touch size and reads as pressable without breaking
              the greyscale palette. The arrow nudges right on hover — the same
              forward/back motion language the post pages use. */}
          <Link
            href="/posts"
            transitionTypes={["nav-forward"]}
            className="group mt-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-(--faint-foreground) px-6 py-3 tracking-wide text-muted-foreground transition-colors hover:border-(--foreground) hover:bg-zinc-50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--muted-foreground) dark:hover:bg-zinc-900"
          >
            read posts
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </BlurFade>
      </div>
    </div>
  );
}
