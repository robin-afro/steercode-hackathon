import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's GitHub access token from the session
    const { data: { session } } = await supabase.auth.getSession()
    const provider_token = session?.provider_token

    if (!provider_token) {
      return NextResponse.json({ error: 'No GitHub access token found' }, { status: 401 })
    }

    // Fetch repositories from GitHub API
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `token ${provider_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lookas-App'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('GitHub API error:', error)
      return NextResponse.json({ error: 'Failed to fetch repositories from GitHub' }, { status: response.status })
    }

    const repositories = await response.json()

    // Filter repositories and format for our database
    const formattedRepos = repositories
      .filter((repo: any) => !repo.fork) // Exclude forks
      .map((repo: any) => ({
        github_id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        github_url: repo.html_url,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch || 'main',
        language: repo.language,
        stars: repo.stargazers_count,
        updated_at: repo.updated_at
      }))

    return NextResponse.json({ repositories: formattedRepos })

  } catch (error) {
    console.error('Error fetching GitHub repositories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 