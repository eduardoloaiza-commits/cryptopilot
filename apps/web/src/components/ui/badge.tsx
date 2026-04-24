import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary",
        destructive: "bg-destructive/20 text-destructive",
        warn: "bg-warn/20 text-warn",
        muted: "bg-white/5 text-[color:var(--muted)]",
        info: "bg-blue-500/20 text-blue-300",
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
