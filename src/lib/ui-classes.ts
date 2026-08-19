// Shared class-string primitives for the design system — every page/
// component should import these instead of redefining its own local
// `inputClass`/`labelClass`/button-pill strings. This is what keeps the
// whole site visually consistent instead of ~15 files each independently
// approximating the same look.

export const BUTTON_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none";

export const BUTTON_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border-strong px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-panel-hover disabled:opacity-50 disabled:pointer-events-none";

export const BUTTON_GHOST =
  "inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50";

export const BUTTON_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-full border border-red-900/40 px-5 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950/40 disabled:opacity-50";

export const INPUT =
  "w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export const LABEL = "flex flex-col gap-1.5 text-sm font-medium text-foreground";

export const CARD = "rounded-xl border border-border bg-panel";

export const CARD_HOVER = "transition-all hover:border-border-strong hover:bg-panel-hover";

export const LINK = "text-accent underline-offset-2 hover:underline";

export const PILL_BADGE =
  "inline-flex items-center gap-1 rounded-full bg-panel-hover px-2.5 py-0.5 text-xs font-medium text-foreground";
