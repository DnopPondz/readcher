import { requireUser } from "@/lib/session";
import { format, messages } from "@/messages";

const m = messages.library;

export const metadata = { title: m.title };

export default async function LibraryPage() {
  const user = await requireUser();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{m.title}</h1>
        <p className="text-muted-foreground">
          {format(m.greeting, { name: user.name ?? user.email })}
        </p>
      </div>
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
        {m.empty}
      </p>
    </div>
  );
}
