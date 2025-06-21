-- Drop RLS policies first (before dropping tables)
DO $$ 
BEGIN
    -- Drop policies only if tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organizations') THEN
        DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_organizations') THEN
        DROP POLICY IF EXISTS "Users can view their organization memberships" ON user_organizations;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'repositories') THEN
        DROP POLICY IF EXISTS "Users can view organization repositories" ON repositories;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pull_requests') THEN
        DROP POLICY IF EXISTS "Users can view pull requests" ON pull_requests;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'issues') THEN
        DROP POLICY IF EXISTS "Users can view issues" ON issues;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'commits') THEN
        DROP POLICY IF EXISTS "Users can view commits" ON commits;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_suggestions') THEN
        DROP POLICY IF EXISTS "Users can view own AI suggestions" ON ai_suggestions;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
        DROP POLICY IF EXISTS "Users can view sync logs" ON sync_logs;
    END IF;
END $$;

-- Drop tables that are no longer needed
DROP TABLE IF EXISTS ai_suggestions CASCADE;
DROP TABLE IF EXISTS commits CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS pull_requests CASCADE;
DROP TABLE IF EXISTS user_organizations CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Update repositories table to be user-owned directly
ALTER TABLE repositories DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS clone_url TEXT;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed'));

-- Create documents table for storing code explanations
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    document_path TEXT NOT NULL, -- reverse domain notation like 'backend.llm.agent_message'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('file', 'class', 'function', 'module', 'overview')),
    file_path TEXT, -- actual file path in the repository
    line_start INTEGER,
    line_end INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repository_id, document_path)
);

-- Create document_links table for linking related documents
CREATE TABLE IF NOT EXISTS document_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    link_type TEXT NOT NULL CHECK (link_type IN ('imports', 'uses', 'extends', 'implements', 'calls', 'references')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_document_id, target_document_id, link_type)
);

-- Update sync_logs to track repository analysis instead of data sync
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
        ALTER TABLE sync_logs RENAME TO analysis_logs;
    END IF;
END $$;

-- Ensure analysis_logs table exists and has correct structure
CREATE TABLE IF NOT EXISTS analysis_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    analysis_type TEXT DEFAULT 'full' CHECK (analysis_type IN ('full', 'incremental')),
    files_analyzed INTEGER DEFAULT 0,
    documents_generated INTEGER DEFAULT 0
);

-- Clean up old columns from analysis_logs if they exist
ALTER TABLE analysis_logs DROP COLUMN IF EXISTS sync_type;
ALTER TABLE analysis_logs DROP COLUMN IF EXISTS items_synced;
ALTER TABLE analysis_logs ADD COLUMN IF NOT EXISTS analysis_type TEXT DEFAULT 'full' CHECK (analysis_type IN ('full', 'incremental'));
ALTER TABLE analysis_logs ADD COLUMN IF NOT EXISTS files_analyzed INTEGER DEFAULT 0;
ALTER TABLE analysis_logs ADD COLUMN IF NOT EXISTS documents_generated INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_repository_id ON documents(repository_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_path ON documents(document_path);
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_document_links_source ON document_links(source_document_id);
CREATE INDEX IF NOT EXISTS idx_document_links_target ON document_links(target_document_id);
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);

-- Add updated_at trigger to documents
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_documents') THEN
        CREATE TRIGGER set_timestamp_documents
        BEFORE UPDATE ON documents
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_logs ENABLE ROW LEVEL SECURITY;

-- New RLS policies for repositories (now user-owned)
DROP POLICY IF EXISTS "Users can view organization repositories" ON repositories;
CREATE POLICY "Users can view own repositories" ON repositories
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own repositories" ON repositories
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own repositories" ON repositories  
    FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for documents
DROP POLICY IF EXISTS "Users can view documents from their repositories" ON documents;
CREATE POLICY "Users can view documents from their repositories" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = documents.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert documents for their repositories" ON documents;
CREATE POLICY "Users can insert documents for their repositories" ON documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = documents.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update documents from their repositories" ON documents;
CREATE POLICY "Users can update documents from their repositories" ON documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = documents.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

-- RLS policies for document_links
DROP POLICY IF EXISTS "Users can view document links from their repositories" ON document_links;
CREATE POLICY "Users can view document links from their repositories" ON document_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents
            JOIN repositories ON repositories.id = documents.repository_id
            WHERE documents.id = document_links.source_document_id
            AND repositories.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert document links for their repositories" ON document_links;
CREATE POLICY "Users can insert document links for their repositories" ON document_links
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents
            JOIN repositories ON repositories.id = documents.repository_id
            WHERE documents.id = document_links.source_document_id
            AND repositories.user_id = auth.uid()
        )
    );

-- Update analysis_logs policies
DROP POLICY IF EXISTS "Users can view analysis logs for their repositories" ON analysis_logs;
CREATE POLICY "Users can view analysis logs for their repositories" ON analysis_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = analysis_logs.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert analysis logs for their repositories" ON analysis_logs;
CREATE POLICY "Users can insert analysis logs for their repositories" ON analysis_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = analysis_logs.repository_id
            AND repositories.user_id = auth.uid()
        )
    ); 