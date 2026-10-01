import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { messages } from "@/messages";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/library">{messages.app.name}</Link>
            <Link href="/library" className="text-muted-foreground hover:text-foreground">
              {messages.nav.library}
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">{user.email}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                {messages.auth.logout}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
