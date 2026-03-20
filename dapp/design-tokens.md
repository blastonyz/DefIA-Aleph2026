/**
 * DefIA Design System — Single source of truth
 * iOS 18 / Bento Grid aesthetic · Warm monochromatic orange palette
 *
 * All raw hex values live here. Tailwind config and CSS custom properties
 * mirror these tokens so every surface stays on-palette.
 */

// ─── COLORS ────────────────────────────────────────────────
export const colors = {
  // Core palette
  primary: "#FF5C1A",
  dark: "#C4440E",
  deep: "#7A2A08",
  tint1: "#FFD9C0",
  tint2: "#FFBFA0",
  bg: "#FFF0E6",
  white: "#FFFFFF",

  // Semantic — status
  success: "#22c55e",
  successText: "#16a34a",
  successBg: "rgba(34, 197, 94, 0.10)",
  warning: "#f59e0b",
  warningText: "#d97706",
  warningBg: "rgba(245, 158, 11, 0.10)",
  danger: "#ef4444",
  dangerText: "#dc2626",
  dangerBg: "rgba(239, 68, 68, 0.10)",

  // Extended tints used in specific screens
  activityMonthBg: "#FF7A40",
  strategyMediumBg: "#FFD0A8",
} as const;

// ─── TYPOGRAPHY ────────────────────────────────────────────
export const typography = {
  fontFamily: {
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
  },
  /** Tailwind class presets for common text styles */
  classes: {
    // Headings
    h1: "font-display text-[22px] text-foreground",
    h2: "font-display text-lg text-foreground",
    h3: "font-display text-base text-foreground",
    heroNumber: "font-display text-[40px] text-white",
    heroNumberStyle: { letterSpacing: "-2px" } as const,

    // Body
    body: "font-body text-sm text-foreground",
    bodySm: "font-body text-xs text-dark-orange",
    bodyXs: "font-body text-[11px] text-dark-orange",
    caption: "font-body text-[13px] text-dark-orange",

    // Labels
    label: "font-body text-[10px] uppercase tracking-widest",
    labelSm: "font-body text-[9px] uppercase tracking-widest",
    labelSection: "font-body text-[13px] uppercase text-dark-orange tracking-wide",

    // Numbers
    numberLg: "font-display text-2xl text-foreground",
    numberXl: "font-display text-[32px]",
  },
  sizes: {
    xs: "10px",
    sm: "11px",
    base: "13px",
    md: "14px",     // text-sm
    lg: "16px",     // text-base
    xl: "18px",     // text-lg
    "2xl": "22px",
    "3xl": "24px",  // text-2xl
    "4xl": "32px",
    hero: "40px",
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// ─── BORDER RADIUS ─────────────────────────────────────────
export const radii = {
  pill: "50px",
  cardLg: "28px",
  section: "28px",
  card: "24px",
  cardInner: "20px",
  btn: "18px",
  chip: "16px",
  sm: "12px",
  full: "9999px",
} as const;

// ─── SPACING ───────────────────────────────────────────────
/** All spacing values in use (px). Maps to Tailwind's scale. */
export const spacing = {
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  10: "40px",
  14: "56px",   // pt-14 (safe-area top)
  20: "80px",   // pt-20 (success page)
  32: "128px",  // pb-32 (bottom-nav clearance)
} as const;

/** Common padding presets used across pages */
export const pagePadding = {
  x: "px-4",          // 16px horizontal
  xWide: "px-5",      // 20px horizontal
  top: "pt-14",       // 56px safe-area
  bottom: "pb-32",    // 128px nav clearance
  full: "px-4 pt-14 pb-32",
  fullWide: "px-5 pt-14 pb-32",
} as const;

export const gaps = {
  grid: "gap-2.5",    // 10px — bento grid
  cards: "gap-2.5",   // 10px — card lists
  list: "gap-3",      // 12px — message lists
  section: "mb-6",    // 24px — between sections
  sectionLg: "mb-7",  // 28px
  sectionSm: "mb-3",  // 12px
  sectionXs: "mb-4",  // 16px
} as const;

// ─── SHADOWS ───────────────────────────────────────────────
export const shadows = {
  warm: "0 4px 20px rgba(196, 68, 14, 0.15)",
  warmLg: "0 8px 32px rgba(196, 68, 14, 0.20)",
} as const;

// ─── COMPONENT CLASS PRESETS ───────────────────────────────
/** Base Tailwind class strings for reusable component patterns */
export const components = {
  /** Full-width dark balance card */
  BalanceCard:
    "bg-card-dark rounded-card p-6 shadow-warm-lg",

  /** Bento grid cell — primary accent (tall, left column) */
  BentoCellPrimary:
    "bg-primary rounded-card p-5 flex flex-col justify-between row-span-2 min-h-[180px] text-left active:scale-[0.97]",

  /** Bento grid cell — secondary tint */
  BentoCellSecondary:
    "bg-secondary rounded-card p-5 flex flex-col justify-between shadow-warm",

  /** Bento grid cell — muted tint */
  BentoCellMuted:
    "bg-muted rounded-card p-5 flex flex-col justify-between text-left active:scale-[0.97] shadow-warm",

  /** Strategy selection card (horizontal, with left accent bar) */
  StrategyCard:
    "rounded-[20px] p-5 pl-6 flex items-center justify-between text-left active:scale-[0.97] relative overflow-hidden shadow-warm",

  /** Strategy card left accent bar */
  StrategyCardAccent:
    "absolute left-0 top-3 bottom-3 w-1 rounded-r",

  /** Bottom navigation bar */
  BottomNav:
    "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[375px] bg-primary rounded-t-section px-2 pb-5 pt-3 z-50 shadow-warm-lg",

  /** Bottom nav button */
  BottomNavButton:
    "flex flex-col items-center gap-1 py-1 px-3 active:scale-95",

  /** Chat — AI message bubble */
  ChatBubbleAI:
    "bg-secondary rounded-[20px_20px_20px_6px] px-4 py-3 max-w-[80%] shadow-warm",

  /** Chat — User message bubble */
  ChatBubbleUser:
    "bg-primary rounded-[20px_20px_6px_20px] px-4 py-3 max-w-[80%]",

  /** Chat — Suggestion chip */
  ChatChip:
    "bg-secondary rounded-btn p-4 font-body text-[13px] text-foreground text-left active:scale-[0.97] shadow-warm",

  /** Chat — Input bar container */
  ChatInputBar:
    "fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-[375px] bg-secondary px-4 py-4 z-40",

  /** Chat — Text input */
  ChatInput:
    "flex-1 h-11 rounded-pill bg-white px-5 font-body text-sm text-foreground outline-none placeholder:text-dark-orange/50",

  /** Chat — Send button */
  ChatSendButton:
    "w-11 h-11 rounded-full bg-dark-orange flex items-center justify-center shrink-0 active:scale-90 shadow-warm",

  /** Chat — AI avatar circle */
  ChatAvatar:
    "w-8 h-8 rounded-full bg-dark-orange flex items-center justify-center shrink-0",

  /** Activity — Summary metric card */
  ActivityMetricCard:
    "rounded-[20px] p-4 text-center shadow-warm",

  /** Activity — Single activity row */
  ActivityItem:
    "py-4",

  /** Activity — Dot indicator */
  ActivityDot:
    "w-3 h-3 rounded-full mt-1 shrink-0",

  /** Success — Large check circle */
  SuccessCheck:
    "mx-auto rounded-full bg-risk-low/15 flex items-center justify-center animate-scale-in-check",

  /** Success — Summary card */
  SuccessSummary:
    "bg-secondary rounded-card p-5 text-left shadow-warm",

  /** Primary CTA button (full-width, fixed bottom) */
  CTAPrimary:
    "w-full h-[56px] bg-primary text-white font-display text-base rounded-btn active:scale-[0.97] shadow-warm-lg",

  /** Outline CTA button */
  CTAOutline:
    "w-full h-[56px] border-2 border-primary text-primary font-display text-base rounded-btn bg-transparent active:scale-[0.97]",

  /** Header avatar */
  HeaderAvatar:
    "w-10 h-10 rounded-full bg-secondary flex items-center justify-center shadow-warm",

  /** Back button */
  BackButton:
    "w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:scale-90 shadow-warm",

  /** Risk pill badge */
  RiskPill:
    "inline-block font-body text-xs font-semibold px-4 py-1.5 rounded-pill",

  /** Protocol tag (inside strategy cards) */
  ProtocolTag:
    "font-body text-[10px] px-2.5 py-0.5 rounded-pill bg-deep/10 text-deep",

  /** MobileShell — page wrapper */
  MobileShell:
    "min-h-screen flex justify-center bg-background",

  /** MobileShell — inner container */
  MobileShellInner:
    "w-full max-w-[375px] min-h-screen relative",
} as const;

// ─── ANIMATIONS ────────────────────────────────────────────
export const animations = {
  easing: {
    default: "200ms ease",
    decelerate: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  classes: {
    fadeIn: "animate-fade-in",
    slideLeft: "animate-slide-left",
    slideRight: "animate-slide-right",
    scaleInCheck: "animate-scale-in-check",
    pulseDot: "animate-pulse-dot",
    countUp: "animate-count-up",
  },
} as const;
