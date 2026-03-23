import Image from "next/image";
import Header from "../ui/header";

export default function Home() {
  return (

    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black container mx-auto p-4">
      <div className="text-center">
        <h1 className="typewriter mb-8 text-4xl font-medium tracking-wider text-zinc-800 dark:text-zinc-200">recollections</h1>
      </div>
    </div>
  );
}
