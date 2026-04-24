import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Rectangular status chip — 1px border colored, label-caps uppercase.
 * Sharp corners (rounded-none). Usado para roles, estados, MODE, etc.
 */
const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] border",
  {
    variants: {
      variant: {
        default: "border-primary-container/40 text-primary",
        destructive: "border-error/40 text-error",
        warn: "border-tertiary/40 text-tertiary",
        muted: "border-white/10 text-outline",
        info: "border-blue-400/40 text-blue-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface Props
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: Props) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
