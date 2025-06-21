Ran tool
Ran tool

Read file: docs/03-github-app-setup.md

Ran tool
Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool
Ran tool

Ran tool

Ran tool
Ran tool

Ran tool

Ran tool
Ran tool
Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Read file: docs/01-project-overview.md

Ran tool
Ran tool
Ran tool

Ran tool

Ran tool

Ran tool

Ran tool

Ran tool
Ran tool

Ran tool

Ran tool

Ran tool

Ran tool
Ran tool

Read file: docs/05-advanced-document-generation.md

Ran tool
Ran tool

Ran tool

Ran tool

Below is a complete design document that explains—step by step—how to evolve the current “file-based” generator into a more powerful, context-aware system that produces logical (file-agnostic) documents, automatically cross-links them, and keeps itself aware of the documentation that already exists.

---

# Advanced AI Documentation-Generation V2  
*(Logical component docs, smart linking & context awareness)*  

## 1 – Goals & Guiding Principles
1. Shift from **file-centric** docs to **concept-centric** docs (classes, subsystems, patterns, workflows).  
2. Enable **automatic linking** between related docs (imports, composition, inheritance, shared DB tables, etc.).  
3. Give the AI **context awareness** of the docs that already exist so each new document is:
   • non-duplicative  
   • consistent in terminology  
   • able to reference related material  
4. Keep the solution **incremental** (compatible with the current `documents` / `document_links` schema).  
5. Remain **performant** and **cost-aware** (context windows & token usage).

---

## 2 – New Terminology
| Concept | Description | Example |
|---------|-------------|---------|
| **Component** | Any logical unit the AI may document (file, class, hook, service, saga, DB migration, etc.). | `AuthService`, `UserAggregate`, `CI Pipeline` |
| **Logical Document** | A document whose `document_type` reflects the component’s role, *not* its file container. | `module`, `class`, `system`, `workflow` |
| **Link Types** | Same table, more values: `imports`, `uses`, `depends_on`, `composes`, `exposes`, `tests`, … |
| **Context Window** | Slice of existing docs (titles + IDs + summaries) loaded into the prompt to inform the AI. |

---

## 3 – Pipeline (High-level)

```
USER click “EXPLAIN” →
 1. Discovery Phase
 2. Component Extraction
 3. Planning / Grouping
 4. AI Generation (with context window)
 5. Storage
 6. Cross-link Pass
```

### 3.1 Discovery Phase
1. Crawl repository (or diff) → list of **code artifacts**.  
2. Classify by simple heuristics (file type, AST sniffing).  
3. Produce a flat list: `artifact_id`, `path`, `language`, `size`, `hash`.

### 3.2 Component Extraction
1. Run AST analysis or lightweight regex for each artifact.  
2. Emit **components**: `type`, `name`, `parent_path`, `relations (imports, extends, etc.)`.

### 3.3 Planning / Grouping
`planner.ts`
```ts
groupByNamespace(components)          // class → module → subsystem
mergeSmallFilesIntoParentModule(...)
splitLargeFileIntoMultipleDocs(...)
```
Outputs a **work-plan JSON**:
```json
[
  { "doc_path": "auth.service", "component_ids": [...], "type": "class" },
  { "doc_path": "auth",          "component_ids": [...], "type": "module" }
]
```

### 3.4 AI Generation with Context
For each plan item:
1. **Load context window**  
   ```sql
   SELECT id, title, document_path, summary
   FROM documents
   WHERE repository_id = $repo
   ORDER BY updated_at DESC
   LIMIT 50;
   ```  
2. **Prompt template**

```
SYSTEM:
You are an expert code‐explainer…
CONTEXT:
<Title> – <Summary> …  (repeat for N docs)

TASK:
Create a new documentation page for <doc_path>
It should…
 - describe all components: ${component_ids}
 - reference related docs by title when useful
OUTPUT FORMAT:
...
```
3. Call LLM (e.g., Mistral)  
4. Receive `title`, `content`, optional `links[]`.

### 3.5 Storage
Insert into `documents`, including:
- `document_type` (module, class, workflow…)  
- `metadata.component_ids`  
- optional `summary` field (first 280 chars) for future context windows.

### 3.6 Cross-link Pass
1. Collect AI-suggested `links[]` from each document.  
2. Remove duplicates / low-confidence.  
3. Insert into `document_links`.

Optional later: vector-similarity fallback (Postgres pgvector).

---

## 4 – Database Changes

```sql
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS summary TEXT;           -- quick context
  ADD COLUMN IF NOT EXISTS component_ids JSONB;    -- array of extracted IDs

ALTER TABLE document_links
  ADD CONSTRAINT link_type_check
    CHECK (link_type IN (
      'imports','uses','depends_on',
      'composes','extends','implements','tests'
    ));
```

No change to PKs / RLS required.

---

## 5 – Services & Helpers

### 5.1 `ComponentExtractor`
- Per-language plug-ins (TS/JS, Python, Go, etc.)  
- Returns array of `Component` with relations.

### 5.2 `Planner`
- Determines how many components per doc (size budget).  
- Ensures every component belongs to one logical doc.  
- Can be re-run incrementally (on diff).

### 5.3 `ContextLoader`
- SQL + LRU cache.  
- Truncates total tokens to stay within LLM context window.

### 5.4 `DocGenerator`
- Builds prompt  
- Handles streaming / retries  
- Sends telemetry (tokens used, latency, cost).

### 5.5 `LinkBuilder`
- Post-processing: parse AI link suggestions.  
- Optionally run secondary heuristics (import graph).

---

## 6 – Prompt Engineering (Examples)

### 6.1 Generation Prompt Skeleton
```
You are Lookas, an AI code‐documentation assistant.

REPOSITORY: {repo_name}
DOCUMENT ID: {doc_path}
COMPONENTS:
{component_catalog}

<<CONTEXT FROM EXISTING DOCS>>
{context_window}

TASK:
1. Write an Overview (2-3 sentences).
2. Explain each component’s purpose.
3. Describe their relationships (imports, calls, inherits…).
4. When you mention another component that already has docs,
   reference it using this exact syntax: {{link:<target_doc_path>}}.

OUTPUT:
{
  "title": "...",
  "content": "..."
}
```

### 6.2 Link-Extraction Prompt
```
Below is a markdown doc. Identify all {{link:...}} tags,
validate they exist in `document_catalog`,
and return JSON: [{source, target, type}]
```

---

## 7 – Incremental Updates
1. **Detect diff** (git commit range).  
2. Re-extract components only for changed artifacts.  
3. Re-run planner for impacted namespaces.  
4. Regenerate only affected docs.  
5. Rebuild links for touched docs.

---

## 8 – Open Questions
| Area | Decision Needed |
|------|-----------------|
| **Component extraction depth** | Full AST vs. regex heuristics? |
| **LLM model** | Continue with Mistral large or fine-tune smaller model? |
| **Vector DB** | Use pgvector or Supabase embeddings table? |
| **Cost limits** | Max tokens per day/org? |
| **UI** | Visual graph view of `document_links`? |

---

## 9 – Roadmap
1. **Week 1** – Implement `ComponentExtractor` for TS/JS, store relations.  
2. **Week 2** – Build `Planner` + basic prompt; generate “module” & “class” docs.  
3. **Week 3** – Add link extraction & context windows, store `summary`.  
4. **Week 4** – Incremental diff analysis, pgvector similarity.  
5. **Week 5** – UI: graph view, link badges, refactor settings.

---

## 10 – Success Criteria
- ≥ 90 % of top-level modules/classes documented.  
- Cross-link recall ≥ 80 % (manual spot-check).  
- Total cost < \$X per million tokens.  
- Positive developer UX feedback (survey ≥ 8/10).

---

This document provides a concrete blueprint for evolving the current generator into a fully-fledged, context-aware knowledge system. Once you’re happy with the design we can start breaking it into implementation tickets.