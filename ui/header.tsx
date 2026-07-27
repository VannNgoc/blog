import { Suspense, cache } from "react";
import Link from "next/link";
import { auth } from '@/lib/auth/server';
import { NavigationMenu } from '@/ui/NavigationMenu';
import { ThemeToggle } from '@/ui/ThemeToggle';

// Deduped per request: HeaderGreeting and HeaderNav both need the session,
// so without this each would trigger its own auth.getSession() call.
const getSession = cache(() => auth.getSession());

// auth.getSession() is a real network/DB round trip (this SDK validates
// sessions server-side, it doesn't just decode a local cookie). Header
// renders before `{children}` in the root layout, so without a Suspense
// boundary around the parts that need it, that round trip blocked every
// route's first paint — not just pages that actually show auth state.
async function HeaderGreeting() {
  const { data: session } = await getSession();
  return session?.user?.name ? (
    <span className="text-sm text-zinc-400">of {session.user.name}</span>
  ) : null;
}

async function HeaderNav() {
  const { data: session } = await getSession();
  return <NavigationMenu isSignedIn={!!session?.user} />;
}

export default function Header() {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800 text-zinc-50">
      <Link
        href="/"
        className="text-2xl font-medium tracking-wider text-zinc-50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
      >
        recollections{" "}
        <Suspense fallback={null}>
          <HeaderGreeting />
        </Suspense>
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {/* Falls back to a signed-out nav until the session check resolves —
            a logged-in user may briefly see "Login" swap to "Sign Out", but
            that's a better tradeoff than blocking every page's first paint. */}
        <Suspense fallback={<NavigationMenu isSignedIn={false} />}>
          <HeaderNav />
        </Suspense>
      </div>
    </div>
  );
}
