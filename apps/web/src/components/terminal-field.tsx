import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string;
  value: string;
  onChange: (v: string) => void;
}

/**
 * Ghost input — border-b only, label uppercase label-caps above.
 * Usar para todos los formularios del terminal (auth, settings, etc.).
 */
export function TerminalField({ label, value, onChange, className, ...rest }: Props) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="label-caps text-outline">{label}</span>}
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full bg-transparent border-0 border-b border-white/10 py-2 data-tabular text-on-surface placeholder:text-surface-bright focus:outline-none focus:border-primary/40 transition-colors",
          className,
        )}
      />
    </label>
  );
}
