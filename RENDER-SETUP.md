# 🌐 Render Backend Deployment

## Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (recommended)
3. Verify your account

## Step 2: Create New Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the repository you just created

## Step 3: Configure Service

### Basic Settings:
- **Name**: `member-management-system` (or your choice)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Runtime**: `Node`

### Build & Deploy:
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Advanced Settings:
- **Auto-Deploy**: Yes (recommended)

## Step 4: Environment Variables

Add these in the "Environment" section:

```
FIREBASE_API_KEY=AIzaSyCBRDBXY7BUhllSOhwOiyippUTiJq_7Kx0
FIREBASE_AUTH_DOMAIN=assocify-eb40b.firebaseapp.com
FIREBASE_PROJECT_ID=assocify-eb40b
FIREBASE_STORAGE_BUCKET=assocify-eb40b.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=491333029318
FIREBASE_APP_ID=1:491333029318:web:b22ab906a3749ef701f6c7
JWT_SECRET=c855fa737e7c5d4f722baa772369f67c478967188a7bc136ac3c1015735a75a7
NODE_ENV=production
```

## Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Your backend will be live at: `https://your-service-name.onrender.com`

## Step 6: Update Frontend Configuration

1. Copy your Render URL
2. Update `docs/js/config.js`:
   ```javascript
   API_BASE_URL: 'https://your-actual-render-url.onrender.com'
   ```
3. Update CORS in `backend/server.js`:
   ```javascript
   origin: ['https://yourusername.github.io']
   ```
4. Commit and push changes
5. Render will auto-redeploy

## Step 7: Test Your Application

1. **Frontend**: `https://yourusername.github.io/repo-name/`
2. **Backend**: `https://your-service.onrender.com`
3. **Admin Setup**: Run the setup endpoint or use the default credentials

## Troubleshooting

### Common Issues:
- **CORS Errors**: Update CORS origins in server.js
- **API Not Found**: Check API_BASE_URL in config.js  
- **Build Fails**: Ensure package.json has correct scripts
- **Environment Variables**: Double-check all values in Render dashboard

### Logs:
- Check Render logs for backend issues
- Use browser dev tools for frontend issues
