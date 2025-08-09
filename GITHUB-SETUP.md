# 🚀 GitHub Repository Setup

## Step 1: Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Member Management System"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `member-management-system` (or your choice)
3. Description: "Web-based member management system for associations"
4. Set to Public (required for free GitHub Pages)
5. Click "Create repository"

## Step 3: Connect and Push

```bash
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll to "Pages" section
4. Source: "Deploy from a branch"
5. Branch: "main"
6. Folder: "/docs"
7. Click "Save"

Your frontend will be live at:
`https://yourusername.github.io/your-repo-name/`

## Step 5: Update API Configuration

After frontend is live, update `docs/js/config.js`:
- Replace `'https://your-app-name.onrender.com'` with your actual Render URL
- Commit and push the change
