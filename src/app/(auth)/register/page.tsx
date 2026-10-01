import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { messages } from "@/messages";

const m = messages.auth.register;

export const metadata = { title: m.title };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">{m.title}</h1>
        </CardTitle>
        <CardDescription>{m.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className="text-sm">
        <span className="text-muted-foreground">{m.haveAccount}</span>&nbsp;
        <Link href="/login" className="font-medium underline underline-offset-4">
          {m.loginLink}
        </Link>
      </CardFooter>
    </Card>
  );
}
