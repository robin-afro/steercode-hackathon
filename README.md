# Lookas - GitHub Analytics Dashboard

Lookas is a powerful GitHub analytics dashboard that provides comprehensive insights into your repositories, pull requests, issues, and team activity. Built with Next.js, Supabase, and powered by Mistral AI for intelligent suggestions.

## Features

- **GitHub Integration**: Seamless OAuth authentication and data sync
- **Comprehensive Metrics**: Track PRs, issues, commits, and contributor activity
- **AI-Powered Insights**: Get actionable suggestions from Mistral AI
- **Beautiful Visualizations**: Interactive charts and dashboards
- **Real-time Updates**: Stay informed with the latest repository activity

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **AI**: Mistral AI
- **Charts**: Recharts
- **UI Components**: Radix UI

## Setup Instructions

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account
- GitHub OAuth App
- Mistral AI API key

### 1. Clone the repository

```bash
git clone https://github.com/your-username/lookas.git
cd lookas
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Fill in the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `MISTRAL_API_KEY`: Your Mistral AI API key
- `NEXT_PUBLIC_APP_URL`: Your application URL (http://localhost:3000 for development)

### 4. Set up Supabase

1. Create a new Supabase project
2. Run the database migrations:

```bash
pnpx supabase db push
```

3. Set up GitHub OAuth in Supabase:
   - Go to Authentication > Providers in your Supabase dashboard
   - Enable GitHub provider
   - Add your GitHub OAuth App credentials
   - Set the redirect URL to `{YOUR_APP_URL}/auth/callback`

### 5. Create a GitHub OAuth App

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: Lookas
   - Homepage URL: Your app URL
   - Authorization callback URL: `{YOUR_SUPABASE_URL}/auth/v1/callback`
4. Copy the Client ID and Client Secret to Supabase

### 6. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── api/               # API routes
│   └── settings/          # Settings page
├── components/            # React components
│   ├── charts/           # Chart components
│   ├── layout/           # Layout components
│   └── ui/               # UI components
├── lib/                   # Utility functions
│   └── supabase/         # Supabase clients
├── services/              # API service functions
└── types/                 # TypeScript types
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
