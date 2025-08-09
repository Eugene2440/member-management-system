# Member Management System - Deployment

## Backend Deployment (Render)

### Quick Setup:
1. Push this repository to GitHub
2. Connect GitHub repo to Render
3. Set environment variables (see render-config.md)
4. Deploy!

### Service Settings:
- **Build Command**: `npm install`
- **Start Command**: `npm start` 
- **Environment**: Node.js
- **Region**: Choose closest to your users

## Frontend Deployment (GitHub Pages)

### Quick Setup:
1. Enable GitHub Pages in repository settings
2. Set source to "Deploy from a branch" 
3. Choose "main" branch and "/docs" folder
4. Update API URL in docs/js/config.js with your Render URL

### Frontend URL will be:
`https://yourusername.github.io/your-repo-name/`

## Post-Deployment:
1. Update CORS settings in backend for your GitHub Pages URL
2. Test all functionality
3. Change default admin passwords!
