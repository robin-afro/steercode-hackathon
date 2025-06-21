import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GitPullRequest, GitBranch, Users, AlertCircle, Plus, Home, Settings, LogOut, BarChart, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure user record exists in database
  await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email || '',
      github_username: user.user_metadata?.user_name || user.user_metadata?.preferred_username,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })

  // Fetch user's repositories
  const { data: repositories } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', user.id)

  const hasRepositories = repositories && repositories.length > 0

  const navItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
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
           {!hasRepositories ? (
             <>
               <div className="mb-8">
                 <h1 className="text-3xl font-bold tracking-tight">Welcome to Lookas</h1>
                 <p className="text-gray-500 dark:text-gray-400 mt-2">
                   Let's get started by connecting your GitHub repositories
                 </p>
               </div>

               <Card className="max-w-2xl">
                 <CardHeader>
                   <CardTitle>Connect Your GitHub Repositories</CardTitle>
                   <CardDescription>
                     Import individual repositories to generate comprehensive code documentation
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <Link href="/settings">
                     <Button size="lg">
                       <Plus className="mr-2 h-4 w-4" />
                       Connect Repositories
                     </Button>
                   </Link>
                 </CardContent>
               </Card>
             </>
           ) : (
                         <>
               <div className="mb-8">
                 <h1 className="text-3xl font-bold tracking-tight">Your Repositories</h1>
                 <p className="text-gray-500 dark:text-gray-400 mt-2">
                   Connected repositories and their documentation status
                 </p>
               </div>

               {/* Repository List */}
               <div className="grid gap-4">
                 {repositories?.map((repo) => (
                   <Card key={repo.id}>
                     <CardHeader className="flex flex-row items-center justify-between space-y-0">
                       <div>
                         <CardTitle className="text-lg">{repo.name}</CardTitle>
                         <CardDescription>
                           {repo.description || 'No description'}
                         </CardDescription>
                         <div className="flex items-center gap-2 mt-2">
                           <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                             repo.analysis_status === 'completed' 
                               ? 'bg-green-100 text-green-800' 
                               : repo.analysis_status === 'analyzing'
                               ? 'bg-yellow-100 text-yellow-800'
                               : repo.analysis_status === 'failed'
                               ? 'bg-red-100 text-red-800'
                               : 'bg-gray-100 text-gray-800'
                           }`}>
                             {repo.analysis_status === 'completed' && '✓ Documented'}
                             {repo.analysis_status === 'analyzing' && '⏳ Analyzing'}
                             {repo.analysis_status === 'failed' && '❌ Failed'}
                             {repo.analysis_status === 'pending' && '⏸️ Pending'}
                           </span>
                           {repo.private && (
                             <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                               🔒 Private
                             </span>
                           )}
                         </div>
                       </div>
                       <div className="flex gap-2">
                         {repo.analysis_status === 'completed' && (
                           <Link href="/documentation">
                             <Button variant="outline" size="sm">
                               View Docs
                             </Button>
                           </Link>
                         )}
                         <Link href="/settings">
                           <Button 
                             size="sm"
                             disabled={repo.analysis_status === 'analyzing'}
                           >
                             {repo.analysis_status === 'analyzing' ? 'Analyzing...' : 'EXPLAIN'}
                           </Button>
                         </Link>
                       </div>
                     </CardHeader>
                   </Card>
                 ))}
               </div>

               {/* Quick Stats */}
               <div className="grid gap-4 md:grid-cols-3 mt-8">
                 <Card>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
                     <GitBranch className="h-4 w-4 text-gray-500" />
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{repositories?.length || 0}</div>
                   </CardContent>
                 </Card>

                 <Card>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">Documented</CardTitle>
                     <Users className="h-4 w-4 text-green-500" />
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">
                       {repositories?.filter(r => r.analysis_status === 'completed').length || 0}
                     </div>
                   </CardContent>
                 </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Analysis</CardTitle>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {repositories?.filter(r => r.analysis_status === 'pending').length || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Analysis Summary */}
              {repositories?.some(r => r.analysis_status === 'completed') && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Documentation Summary</CardTitle>
                    <CardDescription>
                      AI-generated documentation for your repositories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Repositories Analyzed</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {repositories?.filter(r => r.analysis_status === 'completed').length || 0} repositories have been documented
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Analysis Status</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {repositories?.filter(r => r.analysis_status === 'analyzing').length || 0} currently analyzing
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Link href="/settings">
                          <Button size="sm" className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add More Repositories
                          </Button>
                        </Link>
                        {repositories?.some(r => r.analysis_status === 'completed') && (
                          <Button size="sm" variant="outline" className="w-full">
                            <BookOpen className="mr-2 h-4 w-4" />
                            View All Docs
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
