import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription>
            There was a problem connecting your GitHub account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>This error can occur if:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The GitHub OAuth app is not properly configured</li>
              <li>The required permissions are not granted</li>
              <li>There's a temporary issue with GitHub's servers</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Link href="/login" className="block">
              <Button className="w-full">
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