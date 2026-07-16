import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#101A2B",
          800: "#182642",
          700: "#22335A",
        },
        paper: {
          50: "#FAF9F6",
          100: "#F2F0EA",
          200: "#E6E2D8",
        },
        signal: {
          amber: "#B8722E",
          red: "#B23A2E",
          green: "#3F6B4F",
          blue: "#3B5B92",
        },
      },
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', "Georgia", "Charter", "serif"],
        body: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ['"IBM Plex Mono"', '"SF Mono"', "ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
