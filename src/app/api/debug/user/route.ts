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

    // Check the token scopes
    const scopeResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${provider_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lookas-App'
      }
    })

    const scopes = scopeResponse.headers.get('x-oauth-scopes') || 'none'
    
    // Check rate limit
    const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `token ${provider_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lookas-App'
      }
    })

    const rateLimitData = await rateLimitResponse.json()
    const userData = await scopeResponse.json()

    // Test access to a simple private repo endpoint
    const repoTestResponse = await fetch('https://api.github.com/user/repos?visibility=private&per_page=1', {
      headers: {
        'Authorization': `token ${provider_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lookas-App'
      }
    })

    const debugInfo = {
      user: {
        id: userData.id,
        login: userData.login,
        private_repos: userData.total_private_repos,
        public_repos: userData.public_repos
      },
      token: {
        scopes: scopes.split(', ').filter(Boolean),
        hasRepoScope: scopes.includes('repo'),
        hasPrivateRepoAccess: repoTestResponse.ok
      },
      rateLimit: {
        limit: rateLimitData.rate?.limit,
        remaining: rateLimitData.rate?.remaining,
        reset: rateLimitData.rate?.reset
      },
      privateRepoTest: {
        status: repoTestResponse.status,
        canAccessPrivateRepos: repoTestResponse.ok
      }
    }

    return NextResponse.json(debugInfo)

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 