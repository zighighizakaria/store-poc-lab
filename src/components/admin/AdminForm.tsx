"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/admin/form";

type Ctx = { state: FormState; pending: boolean };
const FormCtx = createContext<Ctx>({ state: {}, pending: false });

export const useAdminForm = () => useContext(FormCtx);

type Props = {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  /** Show the success / error message under the form (default true). */
  showMessage?: boolean;
  /** Stable form id (for buttons placed outside with form="..."). */
  id?: string;
};

/**
 * Form wired to a server action. The action runs from onSubmit (not from the
 * `action` prop) so React does not reset the fields after a validation error:
 * what the admin typed stays on screen. Field errors come from the returned
 * FormState and are shown by <FormField>.
 */
export function AdminForm({ action, children, className, showMessage = true, id }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The submitter (e.g. a status button with name/value) must be part of the data.
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  }

  return (
    <FormCtx.Provider value={{ state, pending }}>
      <form id={id} onSubmit={onSubmit} className={cn("flex flex-col gap-16", className)}>
        {children}
        {showMessage ? <FormMessage /> : null}
      </form>
    </FormCtx.Provider>
  );
}

export function FormMessage() {
  const { state } = useAdminForm();
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-field px-16 py-12 text-body",
        state.ok ? "bg-success-wash text-success" : "bg-error-wash text-error",
      )}
    >
      {state.message}
    </p>
  );
}

type FieldProps = {
  label: string;
  name: string;
  help?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + the field error of the last submit (state.fieldErrors[name]). */
export function FormField({ label, name, help, className, children }: FieldProps) {
  const { state } = useAdminForm();
  return (
    <Field label={label} htmlFor={name} error={state.fieldErrors?.[name]} help={help} className={className}>
      {children}
    </Field>
  );
}

/** Whether a field has an error (to set aria-invalid on its control). */
export function useFieldError(name: string): string | undefined {
  return useAdminForm().state.fieldErrors?.[name];
}

type SubmitProps = Omit<ComponentProps<typeof Button>, "type" | "loading"> & { pendingLabel?: string };

/** Submit button: spinner while the AdminForm action or a plain form action is running. */
export function SubmitButton({ children, pendingLabel, disabled, ...rest }: SubmitProps) {
  const { pending: formPending } = useAdminForm();
  const { pending: statusPending } = useFormStatus();
  const pending = formPending || statusPending;
  return (
    <Button type="submit" loading={pending} disabled={disabled} {...rest}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** Submit button that asks for confirmation first (delete, archive...). */
export function ConfirmSubmit({
  message,
  children,
  ...rest
}: SubmitProps & { message: string }) {
  const { pending: statusPending } = useFormStatus();
  const { pending: formPending } = useAdminForm();
  return (
    <Button
      type="submit"
      loading={statusPending || formPending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
