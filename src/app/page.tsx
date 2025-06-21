import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GitPullRequest, GitBranch, Users, AlertCircle, Plus, Home, Settings, LogOut, BarChart } from 'lucide-react'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's organizations and repositories
  const { data: userOrgs } = await supabase
    .from('user_organizations')
    .select('organization_id, organizations(*)')
    .eq('user_id', user.id)

  const hasOrganizations = userOrgs && userOrgs.length > 0

  const navItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
    { href: '/repositories', icon: GitBranch, label: 'Repositories' },
    { href: '/pull-requests', icon: GitPullRequest, label: 'Pull Requests' },
    { href: '/contributors', icon: Users, label: 'Contributors' },
    { href: '/analytics', icon: BarChart, label: 'Analytics' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-2xl font-bold">Lookas</h1>
          </div>
          
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-50">
                  {user.email}
                </p>
              </div>
            </div>
            <form action="/api/auth/logout" method="post">
              <Button variant="outline" size="sm" className="w-full" type="submit">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {!hasOrganizations ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Welcome to Lookas</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Let's get started by connecting your GitHub organizations
                </p>
              </div>

              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>Connect Your GitHub Organizations</CardTitle>
                  <CardDescription>
                    Import your repositories to start tracking metrics and getting AI-powered insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/settings">
                    <Button size="lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Connect Organizations
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Monitor your repository activity and team performance
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Pull Requests</CardTitle>
                    <GitPullRequest className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Across all repositories
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Stale PRs</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Open for more than 7 days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Contributors</CardTitle>
                    <Users className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">8</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      In the last 30 days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
                    <GitBranch className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">24</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Needs attention
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Suggestions */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest updates from your repositories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Activity timeline will be displayed here
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Suggestions</CardTitle>
                    <CardDescription>
                      Powered by Mistral AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-sm font-medium">Review PR #123</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          This PR has been open for 14 days without review
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm font-medium">Assign Issue #456</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          High-priority issue needs an assignee
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
