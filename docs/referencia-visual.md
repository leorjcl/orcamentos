---
name: Precision Print Flow
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#4d556b'
  on-tertiary: '#ffffff'
  tertiary-container: '#656d84'
  on-tertiary-container: '#eef0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  data-mono-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  data-mono-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system is tailored for high-volume commercial digital printing, Web-to-Print operations, and production tracking environments. The interface balances high-density information architecture with sharp, industrial precision. The tone is utilitarian, reliable, authoritative, and contemporary—resembling mission-control software designed for operators, prepress technicians, and production managers.

The design movement combines **Corporate Modern** with **Technical Precision**:
- High-contrast visual hierarchies optimized for busy floor workstations and administrative dashboards.
- Crisp boundary definitions that prevent data ambiguity in production queues, machine telemetries, and nesting layouts.
- Functional color semantics specifically calibrated for workflow progression (prepress, printing, finishing, QC, dispatch) rather than decorative flair.
- Utilitarian calm: deep royal canvas anchors, cool crisp grays, and precise technical blue accents provide zero visual fatigue over long operational shifts.

## Colors

The color system establishes functional clarity across extensive telemetry, order statuses, and data-dense tables. 

### Canvas & Structural Neutrals
- **App Canvas (Background):** `#F8FAFC` — Crisp, cool-tinted off-white reducing screen glare.
- **Surface Container:** `#FFFFFF` — Pure white for cards, sheets, and elevated overlays.
- **Surface Container Subtle:** `#F1F5F9` — Tinted slate for nested headers, zebra-striping, and secondary modules.
- **Surface Border:** `#E2E8F0` — Clean, structural definition for inputs, cards, and tables.
- **Deep Slate / Ink Black (Text Primary):** `#0F172A` — Maximum contrast for legibility on white surfaces.
- **Slate Muted (Text Secondary):** `#475569` — Intermediate labels and secondary metadata.
- **Slate Subtle (Text Disabled/Meta):** `#94A3B8` — Timestamps, placeholder text, and structural dividers.

### Primary Accents & Brand
- **Tech Blue (Primary):** `#2563EB` — Primary actions, active navigation anchors, and focal focus rings.
- **Deep Royal Navy:** `#1E293B` — Headers, dense table headers, and structural toolbars.
- **Cyan / Process Sky:** `#0284C7` — Secondary highlights, selection indicators, and telemetry gauges.

### Production Stage Semantics
Each print lifecycle stage carries a dedicated, accessible pair (background tint + solid stroke/text):
- **Pré-impressão (Prepress / File Check):** 
  - Background: `#F5F3FF` | Border/Text: `#7C3AED` (Deep Violet)
- **Em Produção (Printing / CTP):** 
  - Background: `#EFF6FF` | Border/Text: `#2563EB` (Tech Blue)
- **Corte & Acabamento (Finishing / Binding):** 
  - Background: `#FFFBEB` | Border/Text: `#D97706` (Amber Ochre)
- **Controle de Qualidade (Quality Assurance):** 
  - Background: `#FDF2F8` | Border/Text: `#DB2777` (Magenta/Process QC)
- **Pronto / Despachado (Ready / Dispatched):** 
  - Background: `#ECFDF5` | Border/Text: `#059669` (Emerald)
- **Erro / Alerta Crítico (Machine Jam / Missing Bleed):** 
  - Background: `#FEF2F2` | Border/Text: `#DC2626` (Crimson)

## Typography

Typography prioritizes high-speed scan efficiency for operators switching between machine consoles and desktop queues.

- **Headlines (Plus Jakarta Sans):** Used for view titles, card headings, and primary aggregate metrics. Its geometric base brings a contemporary, tech-forward touch without sacrificing vertical compactness.
- **Body & Data (Inter):** Applied across production logs, form fields, and queue lists. Inter provides rock-solid baseline alignment and neutral clarity.
- **Tabular Figures & Metrics:** Always enable tabular numbers (`font-feature-settings: 'tnum' on, 'cv05' on`) across data tables, order counts, linear meter measurements, substrate sheets, and CMYK ink levels to prevent horizontal jitter during real-time data streaming.

## Layout & Spacing

The layout is built on an operational 12-column fluid responsive grid, engineered to maximize display real estate on both factory terminal screens and standard desktop displays.

### Layout Model
- **Workstation Canvas:** Fluid container stretching up to `1600px` max width to support split-view job workflows (e.g., File Preview on left, Imposition & Specs on right).
- **Navigation Architecture:** Persistent condensed left sidebar (`240px` default, collapsable to `64px` icon-rail) to optimize vertical workspace.
- **Compact Density Default:** Spacing tokens use an 8pt standard with 4pt micro-increments to allow high-density tabular visibility without clipping.

### Breakpoints & Adaptation
- **Mobile (< 768px):** Single-column stack. Sidebars fold into an off-canvas drawer. Data tables convert into swipeable status cards with expandable spec details. Margin is `margin` (`1rem`).
- **Tablet / Factory Terminal (768px – 1024px):** 8-column layout. Multi-metric summary cards collapse to 2x2 grids. Production tables prioritize Job ID, Status, and Action buttons while tucking dimensions and substrate info into secondary disclosure rows.
- **Desktop (> 1024px):** Full 12-column layout. Metric ribbons display inline across 4 columns (`col-span-3`). Margin scales to `margin-lg` (`2rem`).

## Elevation & Depth

This system avoids heavy theatrical drop shadows, which can muddy dense data and degrade readability in brightly lit industrial or office spaces. Instead, visual hierarchy is achieved using **structural border delimitation paired with micro-ambient shadows**.

- **Level 0 (Flat / Canvas):** Applied to the main application background (`#F8FAFC`). No shadow, no border.
- **Level 1 (Default Containers / Base Cards):** Background `#FFFFFF`, bordered with a 1px solid line (`#E2E8F0`), overlaid with a micro-ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Hover States / Interactive Cards):** Subtle upward lift for draggable batch orders or machine queue items: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`. Border shifts to `#CBD5E1`.
- **Level 3 (Dropdowns / Filter Panels / Flyouts):** High-clarity floating tier: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` with `#E2E8F0` border.
- **Level 4 (Modal Dialogs / Job Ticket Inspect Sheets):** Scrim overlay (`rgba(15, 23, 42, 0.45)`) combined with deep grounding: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

## Shapes

The design system employs a **Soft** shape archetype (`roundedness: 1`), reinforcing a technical, industrial, and organized feel. 

- **Micro elements (Badges, Chips, Form Inputs):** `0.25rem` (4px). Keeps input edges crisp and space-efficient in complex tabular forms.
- **Standard elements (Cards, Panels, Modal Windows):** `0.5rem` (8px). Softens layout boundaries without wasting corner space or causing irregular text wrapping.
- **Full Pill Exceptions:** Metric pills, quick-filter toggles, and live production state dots use full rounded radii (`9999px`) to create clear differentiation between actionable buttons and passive data blocks.

## Components

### Buttons
- **Primary:** Solid `#2563EB` fill, white text, 4px corner radius, bold label. Hover state darkens to `#1D4ED8`. Active state scales down subtly (`98%`). Focus ring uses `2px` offset with `#93C5FD`.
- **Secondary:** White surface with 1px `#CBD5E1` border and `#1E293B` text. Hover adds `#F8FAFC` background.
- **Destructive / Cancel:** `#FEF2F2` tint background with `#DC2626` text for standard actions; solid `#DC2626` with white text for critical actions (e.g., abort print run).
- **Quick Action Icon Buttons:** 32x32px or 36x36px square bounds with centered SVGs for table-row utility actions (e.g., Reprint Label, Download PDF Proof, Re-queue).

### Status Badges (Production Stages)
- Inline-flex items, `height: 24px`, padding `0 8px`, `font-size: 11px`, `font-weight: 600`, radius `4px`.
- Composed of stage-specific tinted backgrounds, matching border (`1px solid`), matching high-contrast label color, and an optional 6px pulsing dot for live running states (e.g., "Em Produção").

### Data Tables (Production Queue)
- **Header:** Sticky `#F8FAFC` background, uppercase tracking (`0.03em`), 12px height with bottom border `#CBD5E1`.
- **Row Heights:** Fixed 48px standard row height for scanability. Hover highlights entire row with `#F1F5F9`.
- **Cells:** Tabular figures aligned right for numeric quantities, sheet counts, and dimensions; left-aligned for order references and customer data.

### Input Fields & Selects
- Height `36px` (compact) or `40px` (standard). Border: `1px solid #CBD5E1`. Background: `#FFFFFF`.
- Focus: Border shifts to `#2563EB` with a continuous `3px` light blue outline (`rgba(37, 99, 235, 0.15)`).
- Error state: Border `#DC2626` with explicit assistive caption below.

### Cards & Production Widgets
- **Ink & Substrate Inventory Widget:** Horizontal split cards displaying CMYK level gauges with progress bars using real process colors (Cyan: `#06B6D4`, Magenta: `#EC4899`, Yellow: `#EAB308`, Black: `#1E293B`), showing volume percentages and low-level warning thresholds.
- **Machine Queue Monitor:** Header featuring machine identifier, active operator avatar, operational uptime indicator, and linear progress bar showing job completion percentage.

### Checkboxes & Radio Buttons
- 16x16px boxes with 3px border radius. Unchecked: 1.5px `#94A3B8` border on white. Checked: `#2563EB` fill with a sharp white checkmark vector.