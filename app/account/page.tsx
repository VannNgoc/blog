import { auth } from '@/lib/auth/server';

// Server components using auth methods must be rendered dynamically
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { data: session } = await auth.getSession();

  if (session?.user) {
    return (
      <main id="main-content" className="container mx-auto p-4 text-center">
        <h1 className="mb-4 text-2xl font-semibold text-foreground">
          Logged in as <span className="font-bold underline">{session.user.name}</span>
        </h1>
        <p>ID: {session.user.id}</p>
        <p>Email: {session.user.email}</p>
        <p>Created: {new Date(session.user.createdAt).toLocaleDateString()}</p>
      </main>
    );
  }
  
  return (
    <main id="main-content" className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-8 text-2xl font-semibold text-foreground">recollections</h1>
      </div>
    </main>
  );
}
