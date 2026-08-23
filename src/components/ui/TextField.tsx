import { forwardRef } from "react";
import clsx from "clsx";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={clsx(
            "w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
            error ? "border-red-300" : "border-slate-300",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

TextField.displayName = "TextField";
