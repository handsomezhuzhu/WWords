export const designTokens = {
  brand: {
    name: "WWords",
    description:
      "Next.js frontend scaffold for the WWords AI vocabulary notebook.",
    direction: "Warm Study Desk",
  },
  colors: {
    background: "sand-paper",
    foreground: "ink-green",
    primary: "copper-orange",
    secondary: "deep-teal",
    accent: "sunlit-amber",
  },
  radii: {
    panel: "1.75rem",
    pill: "999px",
  },
  elevations: {
    panel: "soft",
    hero: "lifted",
  },
} as const;

export const dashboardNavigation = [
  { label: "总览", href: "/dashboard" },
  { label: "复习台", href: "#review" },
  { label: "录词", href: "#quick-capture" },
  { label: "单词库", href: "#words" },
  { label: "AI 配置", href: "#settings" },
] as const;

