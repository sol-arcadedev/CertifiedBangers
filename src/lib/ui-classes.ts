// Shared class-string primitives for the design system — every page/
// component should import these instead of redefining its own local
// `inputClass`/`labelClass`/button-pill strings. This is what keeps the
// whole site visually consistent instead of ~15 files each independently
// approximating the same look. Radius convention is documented next to
// the tokens in src/app/globals.css — follow it for any new class string
// rather than picking a rounded-* value by eye.

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Entry 75: active:scale-95 on every button variant is the tactile
// "the app registered your click" press feedback — cheap, universally
// recognized, and the same duration/easing as the rest of each button's
// transition-all so it doesn't feel like a separate bolted-on effect.
export const BUTTON_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-accent-hover to-accent px-5 py-2 text-sm font-medium text-accent-foreground shadow-[0_4px_16px_-4px_rgba(255,138,61,0.55)] transition-all hover:brightness-110 hover:shadow-[0_6px_22px_-4px_rgba(255,138,61,0.75)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:hover:brightness-100 disabled:active:scale-100 ${FOCUS_RING}`;

// Reserved for marketing/brand moments (hero CTA, spotlight sections) —
// the two-tone accent+accent-2 gradient reads as "bold" precisely because
// it's not the button used for every form submit across the admin panel;
// see the --accent-2 comment in globals.css for the same reasoning.
export const BUTTON_HERO = `inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent via-accent to-accent-2 bg-[length:160%_100%] bg-left px-6 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_8px_24px_-6px_rgba(255,61,154,0.5)] transition-all hover:bg-right hover:shadow-[0_10px_30px_-6px_rgba(255,61,154,0.65)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${FOCUS_RING}`;

export const BUTTON_SECONDARY = `inline-flex items-center justify-center gap-2 rounded-full border border-border-strong px-5 py-2 text-sm font-medium text-foreground transition-all hover:bg-panel-hover active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${FOCUS_RING}`;

export const BUTTON_GHOST = `inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted transition-all hover:text-foreground active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${FOCUS_RING}`;

// Destructive actions (revoke a seal, remove an admin, dismiss a report)
// get their own variant instead of BUTTON_SECONDARY + inline red text, so
// "this is a destructive action" is visually consistent everywhere it
// appears.
export const BUTTON_DANGER = `inline-flex items-center justify-center gap-2 rounded-full border border-danger/40 px-5 py-2 text-sm font-medium text-danger transition-all hover:bg-danger/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${FOCUS_RING}`;

export const INPUT = `w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent`;

export const LABEL = "flex flex-col gap-1.5 text-sm font-medium text-foreground";

export const CARD = "rounded-xl border border-border bg-panel";

// The hover-lift recipe used by every clickable card in the app
// (title grid, latest-reviews, feed items) — previously retyped
// independently in each of those three places. Entry 67: warm,
// accent-tinted glow instead of a plain black shadow — reinforces the
// brand color on every hover instead of a generic drop shadow any site
// could have.
export const CARD_HOVER =
  "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_16px_36px_-8px_rgba(255,138,61,0.4)] active:scale-[0.98] active:duration-75";

export const LINK = `text-accent underline-offset-2 hover:underline rounded-sm ${FOCUS_RING}`;

// Alternating icon-chip tints for the homepage "how it works" strip (Entry
// 80) — cycling accent/accent-2 instead of three identical flat-colored
// icons is what makes that row read as deliberately colorful rather than
// monochrome-with-icons.
export const HERO_ICON_TINTS = [
  "bg-accent/15 text-accent",
  "bg-accent-2/15 text-accent-2",
  "bg-accent/15 text-accent",
];

export const PILL_BADGE =
  "inline-flex items-center gap-1 rounded-full bg-panel-hover px-2.5 py-0.5 text-xs font-medium text-foreground";

// Named container widths — formalizes the page-width choices already
// being made ad hoc per page rather than forcing one width everywhere.
export const CONTAINER_NARROW = "mx-auto w-full max-w-sm px-4 py-8";
export const CONTAINER = "mx-auto w-full max-w-3xl px-6 py-8";
export const CONTAINER_WIDE = "mx-auto w-full max-w-5xl px-6 py-8";
