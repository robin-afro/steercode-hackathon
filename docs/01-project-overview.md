# Lookas
Project name reason:
"Lookas" = **Look** at the codebase + "Lucas" (name of our manager)

---

### Problem in Detail

- **Steep Learning Curve:** Junior developers, interns, and new team members face overwhelming complexity when trying to understand existing codebases, often spending weeks just figuring out basic architecture and data flow.
- **Outdated/Missing Documentation:** Traditional documentation becomes stale quickly, doesn't reflect current code state, and lacks contextual connections between different parts of the system.
- **Knowledge Silos:** Critical architectural knowledge exists only in senior developers' heads, creating bottlenecks for onboarding and feature development.
- **Inefficient Code Discovery:** Developers waste time searching through files, trying to understand relationships between components, services, and data models without clear guidance.

---

### Solution

**Lookas** is an AI-powered codebase documentation platform that automatically generates, maintains, and visualizes living documentation that evolves with your code.

#### **Core Features**

- **Auto-Generated Living Documentation:**  
  AI analyzes commits/PRs to automatically update comprehensive documentation that stays current with code changes.

- **Android-Style Hierarchical Naming:**  
  Documents organized with dot-notation IDs (e.g., `backend.database`, `backend.database.migrations`, `frontend.components.auth`) enabling precise organization without naming conflicts.

- **Intelligent Linking & Cross-References:**  
  AI identifies and creates automatic links between related components, functions, and concepts across the codebase.

- **Interactive Codebase Graph:**  
  Visual dependency mapping showing how different parts of the system connect - from high-level architecture down to function-level relationships.

- **Smart Onboarding Paths:**  
  AI generates personalized learning paths for new developers based on their role, experience level, and the specific areas they need to work on.

- **Contextual Code Explanations:**  
  Natural language explanations of complex logic, design patterns, and architectural decisions with examples and use cases.

- **Real-Time Updates:**  
  Documentation automatically updates on commits/PRs, highlighting what changed and why it matters for the overall system.

#### **Advanced Features**

- **Code Impact Analysis:**  
  When viewing any component, see what depends on it and what it depends on, helping developers understand the ripple effects of changes.

- **Learning Progress Tracking:**  
  Track which parts of the codebase team members have explored and understood, identifying knowledge gaps.

- **AI-Powered Search:**  
  Natural language queries like "How does user authentication work?" or "Show me all database migration patterns" return relevant documentation and code examples.

- **Integration Tutorials:**  
  Auto-generated step-by-step guides for common development tasks like adding new API endpoints, database changes, or UI components.

---

### Technical Integration

**Backend Integration:**
The existing backend infrastructure serves as the ultimate source of truth for all system operations. The AI documentation system will adapt to and work within the established backend architecture, utilizing existing APIs, data models, and processing pipelines. All documentation generation, storage, and retrieval operations will conform to the backend's specifications and capabilities.

---

### AI Prompt Architecture

#### **Backend Adaptation Prompt**
```
You are integrating with an existing backend system that serves as the ultimate source of truth. 

CRITICAL: Analyze the backend's current architecture, data models, API patterns, and processing capabilities. Adapt all AI functionality to work within these existing constraints and specifications.

BACKEND ANALYSIS REQUIRED:
1. Examine existing database schema and data relationships
2. Identify current API endpoints and data flow patterns  
3. Understand authentication/authorization mechanisms
4. Map existing processing pipelines and job handling
5. Determine storage strategies and caching approaches

ADAPTATION RULES:
- Never assume technical implementations - discover them from the backend
- Conform to existing naming conventions and architectural patterns
- Utilize existing infrastructure rather than proposing new systems
- Respect current data models and extend them appropriately
- Follow established error handling and logging practices

Your role is to seamlessly integrate AI documentation capabilities into the existing system, not to redesign it.
```
```
You are an expert software architect and technical writer. Analyze the provided code changes and generate comprehensive, beginner-friendly documentation.

CONTEXT:
- Repository: {repo_name}
- Changed files: {file_list}
- Commit message: {commit_message}
- Previous documentation: {existing_docs}

REQUIREMENTS:
1. Generate documentation using hierarchical ID: {document_id}
2. Explain code purpose, patterns, and architectural decisions
3. Include practical examples and common use cases
4. Identify dependencies and relationships to other components
5. Use clear, jargon-free language suitable for junior developers
6. Highlight potential gotchas or important implementation details

OUTPUT FORMAT:
- Title: Brief, descriptive heading
- Overview: 2-3 sentence summary
- Implementation Details: Step-by-step breakdown
- Dependencies: List related components with explanations
- Examples: Practical code usage examples
- Notes: Important considerations, edge cases, or tips

Focus on helping developers understand both the "what" and "why" of the code.
```

#### **Cross-Reference Detection Prompt**
```
Analyze the documentation for {document_id} and identify all logical connections to other parts of the codebase.

EXISTING DOCUMENTS: {document_catalog}

For each connection found:
1. Target document ID
2. Relationship type (depends-on, uses, extends, implements, etc.)
3. Brief explanation of the relationship
4. Confidence level (1-10)

Only suggest connections with high confidence (7+) to avoid noise.
```

#### **Onboarding Path Generation Prompt**
```
Create a personalized learning path for a {role} with {experience_level} experience who needs to work on {focus_areas}.

AVAILABLE DOCUMENTATION: {document_tree}
CODEBASE COMPLEXITY: {complexity_metrics}

Generate a progressive learning sequence:
1. Foundation concepts (start here)
2. Core workflows and patterns
3. Advanced topics and edge cases
4. Hands-on exercises or exploration tasks

Each step should build on previous knowledge and include estimated time investment.
```

---

### Success Metrics

- **Onboarding Time:** Reduce new developer time-to-first-contribution by 50%
- **Documentation Coverage:** Achieve 80%+ automated documentation coverage
- **Developer Satisfaction:** High usability scores for codebase navigation and understanding
- **Knowledge Retention:** Measurable improvement in code comprehension assessments

---

This platform transforms the overwhelming experience of learning a new codebase into a guided, AI-assisted journey that scales with team growth and codebase complexity.