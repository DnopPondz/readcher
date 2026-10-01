import Link from "next/link";
import { messages } from "@/messages";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <Link href="/" className="text-muted-foreground text-sm font-medium">
        {messages.app.name}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
