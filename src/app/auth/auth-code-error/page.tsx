import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-canvas)' }}>
      <Card className="w-full max-w-md" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <CardHeader className="space-y-1 text-center">
          <AlertTriangle className="mx-auto h-12 w-12" style={{ color: 'var(--color-destructive)' }} />
          <CardTitle className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Authentication Error</CardTitle>
          <CardDescription style={{ color: 'var(--color-text-secondary)' }}>
            There was a problem connecting your GitHub account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
            <p>This error can occur if:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The GitHub OAuth app is not properly configured</li>
              <li>The required permissions are not granted</li>
              <li>There's a temporary issue with GitHub's servers</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Link href="/login" className="block">
              <Button className="w-full" variant="primary">
                Try Again
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 