'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { useToast } from '@/components/ui/toast-provider'
import { Github } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const { error: showError } = useToast()

  const handleGitHubLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'read:user user:email repo'
      }
    })

    if (error) {
      console.error('Error logging in with GitHub:', error)
      showError('Authentication Failed', error.message || 'Unable to connect to GitHub. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-canvas)' }}>
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold">Welcome to Lookas</CardTitle>
          <CardDescription>
            Connect your GitHub account to generate AI-powered code documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGitHubLogin}
            className="w-full"
            size="lg"
            variant="primary"
          >
            <Github className="mr-2 h-5 w-5" />
            Continue with GitHub
          </Button>
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            By signing in, you agree to grant Lookas access to your GitHub repositories
            for code documentation generation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 