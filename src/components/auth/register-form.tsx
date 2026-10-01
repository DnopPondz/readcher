"use client";

import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validation/auth";
import { messages } from "@/messages";

const m = messages.auth;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.error ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <FormField
        name="name"
        label={m.fields.name}
        autoComplete="name"
        maxLength={100}
        defaultValue={state.values?.name}
        error={fieldErrors.name}
      />
      <FormField
        name="email"
        type="email"
        label={m.fields.email}
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={fieldErrors.email}
      />
      <FormField
        name="password"
        type="password"
        label={m.fields.password}
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        hint={m.fields.passwordHint}
        error={fieldErrors.password}
      />
      <FormField
        name="confirmPassword"
        type="password"
        label={m.fields.confirmPassword}
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX}
        error={fieldErrors.confirmPassword}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? m.register.pending : m.register.submit}
      </Button>
    </form>
  );
}
