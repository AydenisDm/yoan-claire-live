import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}) {
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <Input
        id={id}
        className={className}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
    </Field>
  );
}

export function PasswordField({
  id,
  label,
  hint,
  error,
  autoComplete,
  value,
  onChange,
  name,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
  name?: string;
}) {
  const [visible, setVisible] = useState(false);
  const toggleId = useId();
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy || undefined}
          className="pr-12"
        />
        <button
          id={toggleId}
          type="button"
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted transition-colors duration-quick ease-snappy hover:text-fg active:scale-[0.96]"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  );
}

export function FormAlert({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p className={cn("text-sm text-warn", className)} role="alert" aria-live="polite">
      {children}
    </p>
  );
}
