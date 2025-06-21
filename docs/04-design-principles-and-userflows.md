# Lookas Design System & UX Specification

> **Status:** Draft v0.1 – Last updated <!--DATE_PLACEHOLDER-->
>
> This document defines, in excruciating detail, the **visual design language**, **interaction principles** and **end-to-end userflows** for the Lookas platform.  Follow these guidelines **verbatim** – any deviation must be justified in a subsequent design RFC.

---

## 1. Brand Foundations  

| Token | Value | Rationale |
|-------|-------|-----------|
| **Brand Tone** | _Confident • Helpful • Insightful_ | Lookas is an expert guide – never patronising, always empowering. |
| **Design DNA** | _Clarity · Focus · Momentum_ | Surfaces must be legible, primary actions obvious, and progress always visible. |
| **Visual Metaphor** | _"Code Constellations"_ | Stars = components, Constellations = interconnected docs.  Graphs + dotted lines reinforce the concept. |

## 2. Colour Palette

### 2.1 Core Palette

| Role | Light Hex | Dark Hex | Usage |
|------|-----------|----------|-------|
| **🖥 Background / Canvas** | `#F9FAFB` | `#0E1117` | App shell, large neutral areas. |
| **🖊 Foreground / Text Primary** | `#111827` | `#F3F4F6` | Body copy & titles. |
| **📑 Surface / Container** | `#FFFFFF` | `#1B1F24` | Cards, sheets, modals. |
| **🔲 Border / Hairline** | `#E5E7EB` | `#2D333B` | 1 px rules, outlines. |
| **🔵 Primary** | `#3B82F6` | `#60A5FA` | Main call-to-action buttons, accent links. |
| **🟢 Success** | `#16A34A` | `#4ADE80` | Completed steps, positive states. |
| **🟠 Warning** | `#D97706` | `#FBBF24` | Long-running tasks, caution banners. |
| **🔴 Destructive** | `#DC2626` | `#F87171` | Dangerous actions, errors. |
| **🔘 Accent (Brand Purple)** | `#7C3AED` | `#A78BFA` | Highlights, progress bars, graph edges. |

### 2.2 Opacity Ramp
```
--overlay-5  : rgba(0,0,0,0.05)
--overlay-10 : rgba(0,0,0,0.10)
--overlay-20 : rgba(0,0,0,0.20)
--overlay-40 : rgba(0,0,0,0.40)
```
Identical values are used with white for the dark theme.

## 3. Sizing Tokens

| Token | px | Notes |
|-------|----|-------|
| `--radius-sm` | **4 px** | Badges, inputs |
| `--radius-md` | **8 px** | Cards, buttons |
| `--radius-lg` | **12 px** | Sheets, modals, graph nodes |
| `--radius-full` | **9999 px** | Avatars, pills |

| Spacing | px |
|---------|----|
| `1`     | 4 |
| `2`     | 8 |
| `3`     | 12 |
| `4`     | 16 |
| `5`     | 20 |
| `6`     | 24 |
| …       | Multiply by 4 |

## 4. Typography

| Level | Font | Size / Line | Weight |
|-------|------|-------------|--------|
| Display | Geist Sans | 36/44 | 700 |
| H1 | Geist Sans | 28/36 | 700 |
| H2 | Geist Sans | 22/30 | 600 |
| H3 | Geist Sans | 18/28 | 600 |
| Body / Default | Geist Sans | 14/22 | 400 |
| Caption | Geist Sans | 12/18 | 400 |
| Mono | Geist Mono | 13/22 | 400 |

_All font sizes are `rem`-based and scale with `html { font-size: 100%; }`_

## 5. Iconography

• Use **Lucide** icon pack at **`1em`** sizing – colour inherits from current text colour.  
• Primary affordances (e.g. _Generate_, _Sync_) add a 10% darker tint of the primary colour on hover.

## 6. Interaction Principles

1. **Single-Step Progression** – never require more than **one click** to move the user to the next meaningful step.  The current version forces three `Explain` clicks; this must be collapsed into **one "Generate Explanation"** CTA.
2. **Immediate Feedback** – every action (navigation, generation, sync) gives an optimistic UI state within **150 ms**.
3. **Breadcrumbs & URL State** – deep-linkable pages (`/documentation?id=backend.auth.overview`) maintain state on refresh.
4. **Keyboard First** – all interactive elements reachable via `Tab` order; common shortcuts:
   * `Cmd + K` → Global command bar
   * `/` → Focus Search
5. **Dark / Light Parity** – _every_ colour token has a dark equivalent.  **No un-themed greys** like Tailwind `gray-400` without mapping.
6. **Progressive Disclosure** – Start with **Overview**, allow drill-down (Docs → Node → Source).  Never hide essential actions two+ levels deep.

## 7. Component States

| Component | States |
|-----------|--------|
| **Button** | default, hover, active, disabled, loading |
| **Input** | default, focus, error, disabled |
| **Card / Surface** | default, hover (lift), selected (ring-accent) |
| **Graph Node** | default, related (outline), selected (primary solid) |
| **Tab** | idle, active, hover |

> **Do not invent ad-hoc styles.** Derive everything from the tokens above.

## 8. Page-Level Userflows

### 8.1 First-Time User (Unauthenticated)
1. **Landing** → `/login` (GitHub OAuth)  
2. **OAuth Callback** → `/` (Dashboard)

### 8.2 First-Time Authenticated User – No Organisations
1. **Dashboard** shows _Connect GitHub Organisation_ card.  
2. CTA **"Connect Organisations"** (primary blue) → `/settings?step=connect-gh`.
3. After success, redirect back to **Dashboard** displaying Stats grid.

### 8.3 Documentation Exploration
1. From _Sidebar_ click **Documentation**.  
2. Arrive at `/documentation` default **Overview** tab.
3. **Single click** on **Documentation** tab OR press `2` key (access-key) – loads hierarchy view.
4. Tree navigation **auto-expands** first level; clicking a leaf updates **Content pane** instantly (no extra button).

### 8.4 Generate AI Explanation
1. Select a document.
2. Press **`Generate Explanation`** primary button (only once).  
3. Button switches to **Loading…** state (`spinner`, 40% opacity) until response.
4. On success insert explanation block at top; persist to Supabase.

### 8.5 Codebase Graph Deep-Dive
1. Click **Codebase Graph** tab or `3` shortcut.
2. Hover node ⇒ shows tooltip with quick stats.
3. Click node ⇒ right panel populates; related nodes get accent ring.
4. Press `Esc` to clear selection.

### 8.6 Onboarding Path Progression
1. User sees list of **Paths** sorted by _in-progress_ → _not started_ → _completed_.
2. Clicking a path slides in **Steps** list (animate 150 ms).  No page reload.
3. Marking a step complete immediately updates progress bar.
4. When all steps complete show **Celebrate** confetti + share badge.

## 9. Accessibility

- Minimum contrast ratio **4.5:1** for text, **3:1** for non-text.
- `prefers-reduced-motion` turns off graph animations.
- All buttons have `aria-label`s that match visible text.
- Use `role="status"` on live regions (e.g. AI generation spinner).

## 10. Known UX Gaps (to fix next sprint)

| Issue | Impact | Fix |
|-------|--------|-----|
| 3-step _Explain_ interaction | Confusing | Merge into one CTA & optimistic preview |
| Missing dark-mode styles on Dashboard stats | Inconsistent | Use colour tokens; audit components |
| Tabs rely on custom state – no URL sync | Shareability | Append `?tab=` query param |
| Tooltip overlaps node on small screens | Obstructive | Auto-flip placement |

---

### Implementation Checklist (Do Not Code Yet)

1. **Tokenise** all colours & radii in `tailwind.config.js`.
2. Replace raw Tailwind greys with CSS variables.
3. Refactor multi-step flows to single-step.
4. Add keyboard & URL state management.

> End of spec – _follow it rigorously._ 