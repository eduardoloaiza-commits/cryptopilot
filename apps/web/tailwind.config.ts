import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Stitch CryptoPilot Alpha palette
        bg: "#0b0d10",
        surface: "#0e1511",
        "surface-container-lowest": "#09100c",
        "surface-container-low": "#161d19",
        "surface-container": "#1a211d",
        "surface-container-high": "#242c27",
        "surface-container-highest": "#2f3632",
        "surface-bright": "#333b36",
        "on-surface": "#dde4dd",
        "on-surface-variant": "#bbcac0",
        outline: "#85948b",
        "outline-variant": "#3c4a42",
        "primary-container": "#34d399",
        "on-primary-container": "#00563b",
        "primary-fixed": "#68fcbf",
        "primary-fixed-dim": "#45dfa4",
        tertiary: "#ffccad",
        "tertiary-container": "#ffa668",
        "on-tertiary": "#502400",
        "on-tertiary-container": "#783901",
        "error-container": "#93000a",
        "on-error": "#690005",

        // shadcn primitives (para Card/Button/Badge existentes)
        border: "hsl(var(--sh-border))",
        input: "hsl(var(--sh-input))",
        ring: "hsl(var(--sh-ring))",
        card: {
          DEFAULT: "hsl(var(--sh-card))",
          foreground: "hsl(var(--sh-card-foreground))",
        },
        primary: {
          DEFAULT: "#5af0b3",
          foreground: "#003825",
        },
        secondary: {
          DEFAULT: "hsl(var(--sh-secondary))",
          foreground: "hsl(var(--sh-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "#ffb4ab",
          foreground: "#690005",
        },
        mutedbg: "hsl(var(--sh-muted))",
        warn: {
          DEFAULT: "#ffccad",
          foreground: "#502400",
        },
        error: "#ffb4ab",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "label-caps": [
          "10px",
          { lineHeight: "12px", letterSpacing: "0.06em", fontWeight: "700" },
        ],
        "headline-sm": [
          "16px",
          { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "display-mono": [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "500" },
        ],
        "body-md": [
          "13px",
          { lineHeight: "20px", letterSpacing: "0", fontWeight: "400" },
        ],
        "data-tabular": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0", fontWeight: "400" },
        ],
      },
      borderRadius: {
        none: "0px",
        sm: "0px",
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        full: "9999px",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
