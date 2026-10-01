"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { messages } from "@/messages";

const m = messages.auth;

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.error ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
      <FormField
        name="email"
        type="email"
        label={m.fields.email}
        autoComplete="email"
        required
        defaultValue={state.values?.email}
      />
      <FormField
        name="password"
        type="password"
        label={m.fields.password}
        autoComplete="current-password"
        required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? m.login.pending : m.login.submit}
      </Button>
    </form>
  );
}
