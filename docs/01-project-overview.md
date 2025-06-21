# Lookas
Project name reason:
"Lookas" = **Look** at the codebase + "Lucas" (name of our manager)

---

### Problem in Detail

- **Limited Visibility:** Many organizations rely on GitHub’s default interface, which is often insufficient for tracking detailed trends or surfacing actionable team-level insights.
- **Bottlenecks Hard to Identify:** It’s difficult to spot slowdowns such as old/stale PRs, unreviewed issues, or inactive contributors.
- **Team Status Updates:** Managers lack a simple way to check individual/team progress or identify where a process could be optimized.

---

### Solution

#### **Features**

- **Seamless GitHub Integration:**  
  Authenticate and connect to an organization’s GitHub account via OAuth, fetch data across multiple repos.


---

### Tech Stack Breakdown

- **Frontend:**  
  - Next.js (React framework for SSR/SPA, powerful routing)
  - Typescript (type safety, code scalability)
  - Tailwind CSS (fast UI prototyping, utility-first styling)
- **Backend/API:**  
  - Next.js API routes + Supabase (Postgres DB, authentication, real-time updates)
- **AI Integration:**  
  - Mistralai (for smart suggestions, natural language summary of activity, identifying patterns/bottlenecks)
- **Package Management:**  
  - pnpm (monorepo-friendly, fast installs)
