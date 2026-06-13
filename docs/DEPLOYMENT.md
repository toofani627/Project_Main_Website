# Azure Deployment Instructions

## Quick Start for Development

```bash
# Install dependencies
npm install

# Run development server (Vite)
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Production Deployment to Azure

### 1. GitHub Actions Setup

The workflow in `.github/workflows/azure-deploy.yml` automatically:
- Runs on every push to `main` branch
- Installs dependencies
- Builds the React app with Vite (`npm run build`)
- Deploys to Azure Web App

### 2. Required Configuration

#### GitHub Repository Secret

Add your Azure publish profile as a secret:

1. Go to Azure Portal → Your Web App → **Download publish profile**
2. In GitHub: `Settings → Secrets and variables → Actions → New repository secret`
3. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
4. Value: Paste entire XML content from publish profile file

#### Azure Web App Settings

Your app should work out of the box with these defaults:
- **App name**: `Firstaiproject`
- **Runtime stack**: Node 18+
- **Start command**: `node server.js` (handled by package.json `start` script)

### 3. Build Process

When deployed, GitHub Actions will:

```bash
npm ci                    # Clean install
npm run build            # Creates /dist folder with optimized React build
# Deploys entire project including /dist
```

The Express server (`server.js`) serves the built React app from the `/dist` folder.

### 4. Environment Variables

If you need environment variables in production:
- Add them in Azure Portal: `Configuration → Application settings`
- They'll be available via `process.env` in your server
- Do NOT commit `.env` file (it's in `.gitignore`)

### 5. Verify Deployment

After pushing to `main`:
1. Check GitHub Actions tab for workflow status
2. Visit your Azure URL: `https://firstaiproject-b3a0ggccafdveyg8.centralindia-01.azurewebsites.net`
3. Select language → explore the app

## Troubleshooting

### Build Fails
- Check Node version in Azure (should be 18+)
- Review GitHub Actions logs for npm errors

### App Shows Blank Page
- Check browser console for errors
- Verify `dist/` folder was created during build
- Check Azure logs: `Monitoring → Log stream`

### Language Selection Not Persisting
- Ensure browser allows localStorage
- Check browser's developer tools → Application → Local Storage

## File Structure for Deployment

```
dist/                    # Vite build output (created during build)
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
src/                     # Source files (not served directly)
server.js               # Express server (serves /dist in production)
package.json            # Dependencies and scripts
.github/workflows/      # CI/CD configuration
```
