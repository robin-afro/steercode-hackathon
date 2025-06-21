import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Mistral } from '@mistralai/mistralai'

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repositoryId } = await request.json()

    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 })
    }

    // Fetch repository metrics
    const [
      { data: pullRequests },
      { data: issues },
      { data: commits }
    ] = await Promise.all([
      supabase
        .from('pull_requests')
        .select('*')
        .eq('repository_id', repositoryId)
        .eq('state', 'open'),
      supabase
        .from('issues')
        .select('*')
        .eq('repository_id', repositoryId)
        .eq('state', 'open'),
      supabase
        .from('commits')
        .select('*')
        .eq('repository_id', repositoryId)
        .gte('committed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ])

    // Calculate metrics
    const metrics = {
      openPRs: pullRequests?.length || 0,
      stalePRs: pullRequests?.filter(pr => 
        new Date(pr.created_at).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length || 0,
      openIssues: issues?.length || 0,
      overdueIssues: issues?.filter(issue => 
        new Date(issue.created_at).getTime() < Date.now() - 14 * 24 * 60 * 60 * 1000
      ).length || 0,
      recentCommits: commits?.length || 0,
      uniqueContributors: new Set(commits?.map(c => c.author_username) || []).size
    }

    // Generate AI suggestions
    const prompt = `As a project manager, analyze these repository metrics and provide 3 concrete suggestions to improve team velocity and code quality:

    - Open Pull Requests: ${metrics.openPRs}
    - Stale PRs (>7 days): ${metrics.stalePRs}
    - Open Issues: ${metrics.openIssues}
    - Overdue Issues (>14 days): ${metrics.overdueIssues}
    - Commits in last 30 days: ${metrics.recentCommits}
    - Active Contributors: ${metrics.uniqueContributors}

    Provide actionable suggestions in JSON format: [{"type": "string", "title": "string", "content": "string"}]`

    const response = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' },
    })

    let suggestions = []
    try {
      const messageContent = response.choices[0].message.content
      const contentString = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent)
      const aiResponse = JSON.parse(contentString || '{"suggestions": []}')
      suggestions = aiResponse.suggestions || []
    } catch (e) {
      console.error('Failed to parse AI response:', e)
      suggestions = [
        {
          type: 'review',
          title: 'Review Stale Pull Requests',
          content: `You have ${metrics.stalePRs} pull requests open for more than 7 days. Consider reviewing or closing them to maintain a healthy PR pipeline.`
        }
      ]
    }

    // Store suggestions in database
    const suggestionInserts = suggestions.map((s: any) => ({
      repository_id: repositoryId,
      user_id: user.id,
      suggestion_type: s.type,
      title: s.title,
      content: s.content,
      metadata: { metrics }
    }))

    const { error: insertError } = await supabase
      .from('ai_suggestions')
      .insert(suggestionInserts)

    if (insertError) {
      console.error('Failed to store suggestions:', insertError)
    }

    return NextResponse.json({
      success: true,
      suggestions,
      metrics
    })

  } catch (error) {
    console.error('Error generating AI suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}