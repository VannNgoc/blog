import { auth } from '@/lib/auth/server';

// Server components using auth methods must be rendered dynamically
export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();

  if (session?.user) {
    return (
      <div className=" text-center font-sans mx-auto p-4">
        <h1 className="mb-4 text-4xl">
          Logged in as <span className="font-bold underline">{session.user.name}</span>
        </h1>
        <p>ID: {session.user.id}</p>
        <p>Email: {session.user.email}</p>
        <p>Created: {new Date(session.user.createdAt).toLocaleDateString()}</p>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center font-sans dark:bg-black container mx-auto p-4">
      <div className="text-center">
        <h1 className="typewriter mb-8 text-4xl font-medium tracking-wider text-zinc-800 dark:text-zinc-100">recollections</h1>
      </div>      
    </div>
  );
}
