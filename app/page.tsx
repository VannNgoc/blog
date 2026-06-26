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
          duration={120}
          className="text-5xl font-medium tracking-widest text-zinc-800 dark:text-zinc-100"
          as="h1"
        />
        <BlurFade delay={1.6} yOffset={4}>
          <p className="mt-4 text-sm tracking-wide text-zinc-500 dark:text-zinc-400">
            a place for thoughts
          </p>
        </BlurFade>
        <BlurFade delay={2} yOffset={4}>
          <Link
            href="/posts"
            className="mt-8 inline-block text-sm text-zinc-400 underline-offset-4 hover:text-zinc-700 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            read posts →
          </Link>
        </BlurFade>
      </div>
    </div>
  );
}
