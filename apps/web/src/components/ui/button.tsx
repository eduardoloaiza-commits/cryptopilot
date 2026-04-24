import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Buttons brutalist/terminal — sharp corners, 1px borders, uppercase label-caps.
 * Solo el `kill` variant usa fondo sólido (coral) para señalar urgencia.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-none text-[10px] tracking-[0.06em] uppercase font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border border-primary-container text-primary hover:bg-primary-container/10",
        primary:
          "bg-primary-container text-on-primary-container hover:bg-primary-container/90",
        destructive: "bg-error text-on-error hover:bg-error/90",
        warn: "border border-tertiary text-tertiary hover:bg-tertiary/10",
        outline:
          "border border-white/10 text-on-surface hover:bg-white/5 hover:border-white/30",
        ghost:
          "text-outline hover:bg-white/5 hover:text-on-surface border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-8 px-3",
        lg: "h-12 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
