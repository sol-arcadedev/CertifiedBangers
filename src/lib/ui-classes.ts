// Shared class-string primitives for the design system — every page/
// component should import these instead of redefining its own local
// `inputClass`/`labelClass`/button-pill strings. This is what keeps the
// whole site visually consistent instead of ~15 files each independently
// approximating the same look. Radius convention is documented next to
// the tokens in src/app/globals.css — follow it for any new class string
// rather than picking a rounded-* value by eye.

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const BUTTON_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none ${FOCUS_RING}`;

export const BUTTON_SECONDARY = `inline-flex items-center justify-center gap-2 rounded-full border border-border-strong px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-panel-hover disabled:opacity-50 disabled:pointer-events-none ${FOCUS_RING}`;

export const BUTTON_GHOST = `inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50 ${FOCUS_RING}`;

// Destructive actions (revoke a seal, remove an admin, dismiss a report)
// get their own variant instead of BUTTON_SECONDARY + inline red text, so
// "this is a destructive action" is visually consistent everywhere it
// appears.
export const BUTTON_DANGER = `inline-flex items-center justify-center gap-2 rounded-full border border-danger/40 px-5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 disabled:pointer-events-none ${FOCUS_RING}`;

export const INPUT = `w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent`;

export const LABEL = "flex flex-col gap-1.5 text-sm font-medium text-foreground";

export const CARD = "rounded-xl border border-border bg-panel";

// The hover-lift recipe used by every clickable card in the app
// (title grid, latest-reviews, feed items) — previously retyped
// independently in each of those three places.
export const CARD_HOVER =
  "transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg hover:shadow-black/20";

export const LINK = `text-accent underline-offset-2 hover:underline rounded-sm ${FOCUS_RING}`;

export const PILL_BADGE =
  "inline-flex items-center gap-1 rounded-full bg-panel-hover px-2.5 py-0.5 text-xs font-medium text-foreground";

// Named container widths — formalizes the page-width choices already
// being made ad hoc per page rather than forcing one width everywhere.
export const CONTAINER_NARROW = "mx-auto w-full max-w-sm px-4 py-8";
export const CONTAINER = "mx-auto w-full max-w-3xl px-6 py-8";
export const CONTAINER_WIDE = "mx-auto w-full max-w-5xl px-6 py-8";
