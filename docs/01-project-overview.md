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
- **Comprehensive Metrics Visualization:**  
  Use beautiful, interactive charts (e.g. bar, line, doughnut) to show:
  - PR activity (opened, merged, closed, age of open PRs)
  - Issue tracking (opened, closed, overdue, labeled)
  - Commit trends (frequency over time, per contributor)
  - Contributor leaderboard (contributions, reviews)
- **AI-Powered Workflow Suggestions:**  
  Use the Mistral AI model to analyze the data and:
  - Detect stale PRs or issues, suggest follow-ups or closures.
  - Highlight uneven review participation.
  - Recommend actionable process improvements (e.g. “Encourage PRs to be merged within X days,” or “Assign reviewers more evenly”).
- **Customizable Reporting and Alerts:**  
  Allow teams to set up custom thresholds (e.g. max days for open PRs) and receive dashboard alerts or weekly digests.
- **Team Member Activity Feed:**  
  Individual dashboards summarizing personal recent activity, current tasks, and suggestions for improvement.
- **Export & Sharing:**  
  Quick export to PDF/CSV, or shareable dashboard links for managers.

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

---

### Stretch Features

- **Slack/Email notifications** for real-time PR/issue updates or bottleneck alerts.
- **Historical data** tracking and trend forecasts.
- **Customizable dashboards** per user/team.
- **Integration with other tools** (Jira, Linear, etc.) for a wider process view.

---

### Example User Flow

1. **Connect GitHub Org:** Admin authenticates and selects repositories.
2. **Dashboard Loads:** See summary widgets (e.g. “3 PRs >7 days old”, “Review participation low for X”).
3. **AI Suggests Actions:** “Assign reviewer to PR123,” “Close issue #456 as inactive?”
4. **Team/Contributor View:** Filter by team/member to see specific progress and actionable tips.

---

### Potential Challenges

- **API Rate Limiting:** Efficiently fetching and aggregating GitHub data for large orgs.
- **Data Privacy:** Handling sensitive repo/contributor data securely.
- **AI Suggestion Quality:** Ensuring AI-generated insights are relevant and actionable.
- **Maintaining Real-Time Data:** Keeping the dashboard up-to-date as repo activity changes.