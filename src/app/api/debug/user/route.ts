import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      return NextResponse.json({ error: 'Auth error', details: userError }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 })
    }

    // Check if user exists in database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get session info
    const { data: { session } } = await supabase.auth.getSession()

    return NextResponse.json({
      auth_user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      },
      db_user: dbUser,
      db_error: dbError,
      session_exists: !!session,
      provider_token: !!session?.provider_token,
      access_token: !!session?.access_token
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 