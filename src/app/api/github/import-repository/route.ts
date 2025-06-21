import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user record exists in database
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email || '',
        github_username: user.user_metadata?.user_name || user.user_metadata?.preferred_username,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (upsertError) {
      console.error('Error upserting user:', upsertError)
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
    }

    const { repositoryData } = await request.json()

    if (!repositoryData) {
      return NextResponse.json({ error: 'Repository data is required' }, { status: 400 })
    }

    // Check if repository already exists
    const { data: existingRepo } = await supabase
      .from('repositories')
      .select('id')
      .eq('github_id', repositoryData.github_id)
      .eq('user_id', user.id)
      .single()

    if (existingRepo) {
      return NextResponse.json({ error: 'Repository already imported' }, { status: 409 })
    }

    // Insert the repository
    const { data: newRepo, error: insertError } = await supabase
      .from('repositories')
      .insert({
        user_id: user.id,
        github_id: repositoryData.github_id,
        name: repositoryData.name,
        full_name: repositoryData.full_name,
        description: repositoryData.description,
        private: repositoryData.private,
        github_url: repositoryData.github_url,
        clone_url: repositoryData.clone_url,
        default_branch: repositoryData.default_branch,
        analysis_status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting repository:', insertError)
      return NextResponse.json({ error: 'Failed to import repository' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      repository: newRepo,
      message: 'Repository imported successfully' 
    })

  } catch (error) {
    console.error('Error importing repository:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 