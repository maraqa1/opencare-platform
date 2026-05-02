// Shared design tokens for all RCM components — aligned with the bed-pressure
// design system (globals.css CSS variables, surface shadows, glass cards).

export const T = {
  // Fonts — reference globals.css custom properties
  font:        "var(--font-body)",
  fontHeading: "var(--font-heading)",
  fontMono:    "var(--font-mono)",

  // Font sizes — matching globals.css conventions
  sz: {
    eyebrow:   11,   // .eyebrow  — ALL-CAPS labels
    meta:      12,   // secondary info: dates, refs, owner, footnotes
    body:      13,   // table cells, card body paragraphs
    cardHead:  15,   // card / section headings
    kpi:       24,   // KPI number values
    pageTitle: 22,   // page heading
  },

  // Text colours via CSS vars
  txt: {
    primary:   "var(--oc-gray-900)",   // #212121
    secondary: "var(--oc-gray-600)",   // #757575
    muted:     "var(--oc-gray-600)",
    label:     "var(--oc-gray-600)",
    navy:      "var(--oc-navy)",       // #1f3864
  },

  // Status colour pairs — bg / tx — via CSS vars
  green:  { bg: "var(--oc-normal-bg)",   tx: "var(--oc-normal)" },
  amber:  { bg: "var(--oc-warning-bg)",  tx: "var(--oc-warning)" },
  red:    { bg: "var(--oc-critical-bg)", tx: "var(--oc-critical)" },
  blue:   { bg: "var(--oc-blue-light)",  tx: "var(--oc-blue)" },
  gray:   { bg: "var(--oc-gray-100)",    tx: "var(--oc-gray-600)" },
  teal:   { bg: "rgba(0,105,92,0.10)",   tx: "var(--oc-teal)" },
  navy:   { bg: "var(--oc-navy)",        tx: "#ffffff" },

  // Surfaces — matches bed-pressure .panel / .ward-card
  cardBg:     "rgba(255, 255, 255, 0.92)",
  cardBorder: "1px solid rgba(31, 56, 100, 0.08)",
  cardRadius: 20,
  cardShadow: "0 18px 40px rgba(31, 56, 100, 0.08)",
  rowBorder:  "1px solid rgba(31, 56, 100, 0.06)",
  stripeBg:   "var(--oc-gray-100)",
  pageBorder: "1px solid rgba(31, 56, 100, 0.08)",

  // Padding
  cellPad: "12px 14px",
  cardPad: "22px",
} as const;
