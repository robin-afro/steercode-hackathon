# GitHub App Setup for Repository Analysis

You're absolutely right! For accessing repository content, files, and commits, you need a **GitHub App**, not just OAuth. Here's how to set it up:

## Why GitHub App vs OAuth App?

- **OAuth App** (what you have): User authentication, basic profile access
- **GitHub App** (what you need): Repository content access, files, commits, deeper integration

## Step 1: Create a GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Fill in the details:

### Basic Information
- **GitHub App name**: `Lookas Code Analyzer`
- **Description**: `AI-powered code documentation generator`
- **Homepage URL**: `http://localhost:3000` (for development)
- **Callback URL**: `http://localhost:3000/api/github/callback`
- **Webhook URL**: `http://localhost:3000/api/github/webhook` (optional for now)

### Permissions
Set these **Repository permissions**:
- **Contents**: Read (to access files)
- **Metadata**: Read (to access repository info)
- **Pull requests**: Read (optional, for future features)
- **Issues**: Read (optional, for future features)

### Where can this GitHub App be installed?
- Choose "Any account" (allows installation on personal and org repos)

## Step 2: Generate and Download Private Key

1. After creating the app, scroll down to "Private keys"
2. Click "Generate a private key"
3. Download the `.pem` file and store it securely

## Step 3: Update Environment Variables

Add to your `.env` file:

```bash
# GitHub App Configuration
GITHUB_APP_ID=your-app-id
GITHUB_APP_PRIVATE_KEY_PATH=path/to/private-key.pem
# OR store the key directly (for production)
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_CLIENT_ID=your-github-app-client-id
GITHUB_CLIENT_SECRET=your-github-app-client-secret
```

## Step 4: Installation Flow

Users will need to:
1. Install your GitHub App on their repositories
2. This grants your app access to repository content
3. The app can then analyze code and generate documentation

## Step 5: Implementation

Here's how the flow works:

### 1. User installs the GitHub App
```typescript
// Redirect user to installation URL
const installUrl = `https://github.com/apps/lookas-code-analyzer/installations/new`
```

### 2. Get installation access token
```typescript
// Using @octokit/auth-app
import { createAppAuth } from "@octokit/auth-app"

const auth = createAppAuth({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
  installationId: installationId, // From webhook or API
})

const { token } = await auth({ type: "installation" })
```

### 3. Access repository content
```typescript
// Now you can access repository files
const { data: files } = await octokit.rest.repos.getContent({
  owner,
  repo,
  path: "src"
})
```

## Current Implementation Status

✅ **Working now** (with OAuth token):
- List user's repositories
- Basic repository metadata
- Import repositories into your database

🔄 **Next steps** (requires GitHub App):
- Access repository file contents
- Read source code for analysis
- Generate comprehensive documentation

## Temporary Solution

For now, the OAuth approach will work for:
1. Listing repositories
2. Importing repository metadata
3. Creating mock documentation

To get full code analysis working, you'll need to:
1. Create the GitHub App (as described above)
2. Implement the installation flow
3. Update the analysis endpoint to use GitHub App tokens

Would you like me to implement the GitHub App authentication flow next? 