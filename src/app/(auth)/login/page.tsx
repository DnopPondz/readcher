import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { messages } from "@/messages";

const m = messages.auth.login;

export const metadata = { title: m.title };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  const redirectTo = safeRedirectPath(callbackUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">{m.title}</h1>
        </CardTitle>
        <CardDescription>{m.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm callbackUrl={redirectTo} />
      </CardContent>
      <CardFooter className="text-sm">
        <span className="text-muted-foreground">{m.noAccount}</span>&nbsp;
        <Link href="/register" className="font-medium underline underline-offset-4">
          {m.registerLink}
        </Link>
      </CardFooter>
    </Card>
  );
}
