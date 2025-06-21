-- Migration for Advanced AI Documentation Generator V2
-- Adds support for component-based documentation, context awareness, and enhanced linking

-- Add new columns to documents table for advanced features
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS summary TEXT,           -- Quick context for AI prompts (first 280 chars)
  ADD COLUMN IF NOT EXISTS component_ids JSONB;    -- Array of extracted component IDs

-- Update document_links table to support more link types
ALTER TABLE document_links DROP CONSTRAINT IF EXISTS document_links_link_type_check;
ALTER TABLE document_links 
  ADD CONSTRAINT link_type_check 
    CHECK (link_type IN (
      'imports', 'uses', 'depends_on', 'composes', 
      'extends', 'implements', 'tests', 'calls', 
      'references', 'exposes'
    ));

-- Update document_type enum to include new logical types
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE documents 
  ADD CONSTRAINT document_type_check 
    CHECK (document_type IN (
      'file', 'class', 'function', 'module', 'overview',
      'system', 'workflow', 'component', 'service'
    ));

-- Create artifacts table for tracking discovered code artifacts
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    artifact_id TEXT NOT NULL,           -- unique identifier within repo
    path TEXT NOT NULL,                  -- file path
    language TEXT,                       -- programming language
    size INTEGER,                        -- file size in bytes
    hash TEXT,                          -- content hash for change detection
    artifact_type TEXT NOT NULL,        -- file, directory, etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repository_id, artifact_id)
);

-- Create components table for tracking extracted components
CREATE TABLE IF NOT EXISTS components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL,          -- unique identifier within repo
    name TEXT NOT NULL,                  -- component name
    component_type TEXT NOT NULL,        -- class, function, hook, service, etc.
    parent_path TEXT,                    -- file or module path
    start_line INTEGER,                  -- line number where component starts
    end_line INTEGER,                    -- line number where component ends
    relations JSONB DEFAULT '[]',        -- array of relationships
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repository_id, component_id)
);

-- Create planning_sessions table for tracking document generation plans
CREATE TABLE IF NOT EXISTS planning_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('full', 'incremental')),
    status TEXT NOT NULL CHECK (status IN ('planning', 'generating', 'completed', 'failed')),
    work_plan JSONB,                     -- JSON array of planned documents
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create context_cache table for caching context windows
CREATE TABLE IF NOT EXISTS context_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,             -- hash of context parameters
    context_data JSONB NOT NULL,         -- cached context window data
    expires_at TIMESTAMPTZ NOT NULL,     -- when cache expires
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repository_id, cache_key)
);

-- Create generation_metrics table for tracking AI usage and costs
CREATE TABLE IF NOT EXISTS generation_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    model_used TEXT NOT NULL,
    tokens_input INTEGER NOT NULL,
    tokens_output INTEGER NOT NULL,
    cost_estimated DECIMAL(10,6),        -- estimated cost in USD
    generation_time_ms INTEGER,          -- time taken in milliseconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_artifacts_repository_id ON artifacts(repository_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_path ON artifacts(path);
CREATE INDEX IF NOT EXISTS idx_artifacts_hash ON artifacts(hash);
CREATE INDEX IF NOT EXISTS idx_components_repository_id ON components(repository_id);
CREATE INDEX IF NOT EXISTS idx_components_type ON components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_parent_path ON components(parent_path);
CREATE INDEX IF NOT EXISTS idx_planning_sessions_repository_id ON planning_sessions(repository_id);
CREATE INDEX IF NOT EXISTS idx_context_cache_repository_id ON context_cache(repository_id);
CREATE INDEX IF NOT EXISTS idx_context_cache_expires_at ON context_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_generation_metrics_repository_id ON generation_metrics(repository_id);

-- Add updated_at triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_artifacts') THEN
        CREATE TRIGGER set_timestamp_artifacts
        BEFORE UPDATE ON artifacts
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_components') THEN
        CREATE TRIGGER set_timestamp_components
        BEFORE UPDATE ON components
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for artifacts
CREATE POLICY "Users can view artifacts from their repositories" ON artifacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = artifacts.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert artifacts for their repositories" ON artifacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = artifacts.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

-- RLS policies for components
CREATE POLICY "Users can view components from their repositories" ON components
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = components.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert components for their repositories" ON components
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = components.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

-- RLS policies for planning_sessions
CREATE POLICY "Users can view planning sessions for their repositories" ON planning_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = planning_sessions.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert planning sessions for their repositories" ON planning_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = planning_sessions.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

-- RLS policies for context_cache
CREATE POLICY "Users can view context cache for their repositories" ON context_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = context_cache.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage context cache for their repositories" ON context_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = context_cache.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

-- RLS policies for generation_metrics
CREATE POLICY "Users can view generation metrics for their repositories" ON generation_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = generation_metrics.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert generation metrics for their repositories" ON generation_metrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = generation_metrics.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS void AS $$
BEGIN
    DELETE FROM context_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to automatically generate summaries when documents are inserted/updated
CREATE OR REPLACE FUNCTION generate_document_summary() RETURNS trigger AS $$
BEGIN
    IF NEW.summary IS NULL OR NEW.summary = '' THEN
        NEW.summary := LEFT(REPLACE(REPLACE(NEW.content, E'\n', ' '), E'\r', ' '), 280);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-generate summaries
DROP TRIGGER IF EXISTS trigger_generate_summary ON documents;
CREATE TRIGGER trigger_generate_summary
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION generate_document_summary(); 