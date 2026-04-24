import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--sh-border))",
        input: "hsl(var(--sh-input))",
        ring: "hsl(var(--sh-ring))",
        card: {
          DEFAULT: "hsl(var(--sh-card))",
          foreground: "hsl(var(--sh-card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--sh-primary))",
          foreground: "hsl(var(--sh-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--sh-secondary))",
          foreground: "hsl(var(--sh-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--sh-destructive))",
          foreground: "hsl(var(--sh-destructive-foreground))",
        },
        mutedbg: "hsl(var(--sh-muted))",
        warn: {
          DEFAULT: "hsl(var(--sh-warn))",
          foreground: "hsl(var(--sh-warn-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
