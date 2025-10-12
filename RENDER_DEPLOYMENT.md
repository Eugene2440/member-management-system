# Deploy AECAS to Render

## Quick Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Deploy on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `aecas-member-system`
   - **Region**: Choose closest to Kenya (e.g., Frankfurt or Singapore)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or Starter for better performance)

### 3. Add Environment Variables

In Render dashboard, add these environment variables:

```
FIREBASE_API_KEY=your_actual_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_actual_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
FIREBASE_APP_ID=your_actual_app_id
JWT_SECRET=your_generated_secure_jwt_secret
PORT=3000
NODE_ENV=production
```

### 4. Deploy!

Click **Create Web Service** and wait for deployment (3-5 minutes)

### 5. Update Frontend API URLs

Once deployed, update the API URL in your frontend files:

**Your Render URL will be**: `https://aecas-member-system.onrender.com`

Update in:
- `frontend/js/registration.js`
- `frontend/js/login.js`
- `frontend/js/dashboard.js`
- `frontend/js/events.js`
- `frontend/home.html`zc
- `frontend/announcements.html`

Change from:
```javascript
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://your-backend-url.onrender.com/api';
```

To:
```javascript
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://aecas-member-system.onrender.com/api';
```

### 6. Deploy Frontend to Netlify/Vercel

**Option A: Netlify**
1. Drag and drop `frontend` folder to [netlify.com/drop](https://app.netlify.com/drop)
2. Your site will be live at: `https://random-name.netlify.app`
3. Optional: Add custom domain

**Option B: Vercel**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `cd frontend && vercel`
3. Follow prompts

### 7. Update CORS in Backend

Update `backend/server.js` CORS configuration with your frontend URL:

```javascript
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-netlify-site.netlify.app', 'https://aecas-member-system.onrender.com']
        : ['http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true
};
```

## Post-Deployment Checklist

- [ ] Backend deployed on Render
- [ ] Environment variables configured
- [ ] Frontend deployed (Netlify/Vercel)
- [ ] API URLs updated in frontend
- [ ] CORS configured correctly
- [ ] Test member registration
- [ ] Test admin login
- [ ] Test all features

## Important Notes

- **Free Tier**: Render free tier spins down after 15 minutes of inactivity (first request may be slow)
- **Upgrade**: Consider Starter plan ($7/month) for always-on service
- **Custom Domain**: Add your own domain in Render settings

## Your Live URLs

- **Backend API**: `https://aecas-member-system.onrender.com`
- **Frontend**: `https://your-site.netlify.app`
- **Admin Dashboard**: `https://your-site.netlify.app/admin`

## Troubleshooting

### Check Render Logs
Go to your service → Logs tab

### Common Issues
1. **500 Error**: Check environment variables are set correctly
2. **CORS Error**: Update CORS origins in server.js
3. **Firebase Error**: Verify Firebase credentials

---

**Deployment Time**: ~10 minutes
**Cost**: Free (or $7/month for Starter)
