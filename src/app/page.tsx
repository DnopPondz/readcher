import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { messages } from "@/messages";

export default async function HomePage() {
  const session = await auth();
  const m = messages.home;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-muted-foreground text-sm font-medium">{messages.app.name}</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{m.headline}</h1>
      <p className="text-muted-foreground text-lg leading-relaxed">{m.body}</p>
      <div className="flex flex-wrap gap-3">
        {session?.user ? (
          <Link href="/library" className={buttonVariants({ size: "lg" })}>
            {m.goToLibrary}
          </Link>
        ) : (
          <>
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              {m.getStarted}
            </Link>
            <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
              {m.login}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
