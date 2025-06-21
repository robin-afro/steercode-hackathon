-- Add missing RLS policies for components table to allow overwriting

-- Add UPDATE policy for components
CREATE POLICY "Users can update components for their repositories" ON components
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = components.repository_id
            AND repositories.user_id = auth.uid()
        )
    );

-- Add DELETE policy for components  
CREATE POLICY "Users can delete components for their repositories" ON components
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM repositories
            WHERE repositories.id = components.repository_id
            AND repositories.user_id = auth.uid()
        )
    ); 