# Lookas Information Architecture & Navigation Flows

> **Status:** Draft v0.1 – Last updated <!--DATE_PLACEHOLDER-->
>
> This document enumerates **every page/route** in the Lookas App Router hierarchy and describes how users traverse them from first visit → onboarding → AI-powered explanation generation.  Use these definitions to maintain **URL stability** and **predictable navigation** across the platform.

---

## 1. Route Map (Top-Level)

| Route | Page Name | Public? | Purpose |
|-------|-----------|---------|---------|
| `/login` | **Log-in / Sign-up** | ✅ | GitHub OAuth entry & T&C consent |
| `/auth/callback` | **OAuth Callback** | ✅ | Processes GitHub code, creates Supabase session, then redirects |
| `/` | **Dashboard** | ❌ | First landing for authenticated users; overview metrics |
| `/settings` | **Account & Integrations** | ❌ | Connect GitHub orgs, manage tokens |
| `/documentation` | **Documentation Hub** | ❌ | Tabs: Overview, Docs tree, Code Graph, Onboarding, AI Search |
| `/repositories` | **Repos List** | ❌ | All synced repositories |
| `/pull-requests` | **PR Activity** | ❌ | Open / stale PRs |
| `/contributors` | **Contributors** | ❌ | Team insights |
| `/analytics` | **Analytics** | ❌ | Historical trends |
| `/logout` | **Sign-out (POST)** | ❌ | Terminates session |

A **404** page is served for all unspecified routes.

---

## 2. Detailed Page Contracts

### 2.1 `/login`
* **States**: default → OAuth redirect → error.
* **Primary CTA**: `Sign in with GitHub` (full-width).
* **Secondary**: _Privacy Policy_, _Terms_.
* **On success**: Redirect to `/auth/callback?code=…`.

### 2.2 `/auth/callback`
* Parses `code` & `state` → contacts Supabase.
* Shows **spinner** (`role="status"`).
* **Success** → `dashboardRedirect()` (see §3.1)  
  **Failure** → `/auth/auth-code-error` with query param `?msg=…`.

### 2.3 `/` (Dashboard)
* **When user has **no organisations*** ⇒ Shows **Connect GitHub** card only.
* **When organisations exist** ⇒ Shows Metrics grid + Learn panel.
* Sidebar exposes global nav.
* **Key links**:
  * Connect card → `/settings?step=connect-gh`
  * Documentation quick link → `/documentation`

### 2.4 `/settings`
* **Tabs**: Profile · Organisations · Billing · Danger-zone.
* **`?step=connect-gh`** query opens **Connect GitHub** dialog immediately.
* On successful installation webhook, redirect back here with toast `Organisation connected` then back to `/`.

### 2.5 `/documentation`
* **Tab param** `?tab=` syncs with custom Tabs component.
* Sub-routes use query params, not nested folders, to keep a single React tree and preserve state.

| Tab | Query Example | Surface |
|-----|---------------|---------|
| Overview | `/documentation?tab=overview` | Stats, recent docs |
| Docs Tree | `/documentation?tab=docs&id=backend.auth.overview` | Tree left, content right |
| Code Graph | `/documentation?tab=graph&node=frontend.auth` | Graph + details |
| Onboarding | `/documentation?tab=onboarding` | Paths & steps |
| AI Search | `/documentation?tab=search&q=jwt` | SearchBox + results |

**Cross-navigation rules**:
* Selecting a node in Docs tree updates `id` param (pushState).
* Selecting a node in Graph also updates `tab=docs&id=…` (deep link).

### 2.6 `/repositories`, `/pull-requests`, `/contributors`, `/analytics`
* Standard list / detail pattern.
* URL contains `?repoId=` etc. to avoid extra segments.

---

## 3. End-to-End User Journeys

### 3.1 **First-Time Sign-Up → First Explanation Generation**
```
/login  →  /auth/callback   →   /            →   /settings?step=connect-gh
                                                                           ↘ success
                                                                            /            (Dashboard populated)
                                                                            ↘ Sidebar → /documentation?tab=docs&id=backend.auth.overview
                                                                                              ↘ Click **Generate Explanation** (POST /api/ai/generate-suggestions)
                                                                                              ↘ Spinner → AI response injected
```
**Rule**: This flow must never require more than **6 clicks** total.

### 3.2 **Returning User → Find a Component Explanation**
```
/  →  click "Documentation"  →  /documentation?tab=search  →  type query  →  Enter
(Result list) click desired doc  →  Content pane scrolls to explanation.
```
Total interactions: **3 clicks + typing**.

### 3.3 **Graph Exploration Shortcut**
* From any page press **`g`** then `c` (global hotkey) → `/documentation?tab=graph`.
* Hover + click node updates side-pane; press `Esc` to dismiss.

---

## 4. Redirect & Guard Logic

| Condition | Redirect Target |
|-----------|-----------------|
| `!session` & route ≠ `/login` | `/login?next=<encoded>` |
| `session` & `/login` | `/` |
| `session` & no organisations & route ≠ `/settings` | `/settings?step=connect-gh` |

---

## 5. API Endpoints Mapped to UI Actions

| UI Action | Method & Route | Expected 2xx | Error Handling |
|-----------|---------------|--------------|----------------|
| Connect GitHub | `GET /api/github/sync` | 201, JSON org list | Toast error & stay on settings |
| Generate Doc Explanation | `POST /api/ai/generate-suggestions` | 200, `{ content }` | Inline error in content pane |
| Logout | `POST /api/auth/logout` | 204 | Redirect to `/login` |

---

## 6. Navigation Component Responsibilities

| Component | Generates | Consumes |
|-----------|-----------|----------|
| **Sidebar** | Route links | Active route state |
| **Tabs** (Docs hub) | Query params | `useSearchParams` & update URL |
| **Graph Node** | `onClick(nodeId)` | Updates `tab=docs&id=` |
| **SearchBar** | `onSearch(q)` | Navigates to `tab=search&q=` |

---

> **Next Step:** Refactor routing components to ensure they respect this contract, add Cypress tests for Journeys 3.1 & 3.2. 