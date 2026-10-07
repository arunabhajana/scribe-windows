export const accentColors = {
  violet: { label: "Violet", color: "#8778ff" },
  blue: { label: "Ocean", color: "#4a9eff" },
  mint: { label: "Mint", color: "#39c99a" },
  peach: { label: "Peach", color: "#ff9b72" },
  rose: { label: "Rose", color: "#f070a4" },
} as const;

export type AccentColor = keyof typeof accentColors;
