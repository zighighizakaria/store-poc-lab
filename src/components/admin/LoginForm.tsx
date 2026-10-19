"use client";

import { AdminForm, FormField, SubmitButton, useFieldError } from "@/components/admin/AdminForm";
import { Input } from "@/components/ui/Input";
import { loginAction } from "@/lib/actions/admin/auth";

function Fields({ next }: { next: string }) {
  const emailError = useFieldError("email");
  const passwordError = useFieldError("password");
  return (
    <>
      <input type="hidden" name="next" value={next} />
      <FormField label="E-mail" name="email">
        <Input id="email" name="email" type="email" autoComplete="username" required aria-invalid={!!emailError} />
      </FormField>
      <FormField label="Mot de passe" name="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!passwordError}
        />
      </FormField>
      <SubmitButton variant="accent" size="lg" fullWidth pendingLabel="Connexion...">
        Se connecter
      </SubmitButton>
    </>
  );
}

export function LoginForm({ next }: { next: string }) {
  return (
    <AdminForm action={loginAction}>
      <Fields next={next} />
    </AdminForm>
  );
}
