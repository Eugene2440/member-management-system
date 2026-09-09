# Render Deployment Configuration

## Environment Variables to Set in Render Dashboard:

FIREBASE_API_KEY=AIzaSyCBRDBXY7BUhllSOhwOiyippUTiJq_7Kx0
FIREBASE_AUTH_DOMAIN=assocify-eb40b.firebaseapp.com
FIREBASE_PROJECT_ID=assocify-eb40b
FIREBASE_STORAGE_BUCKET=assocify-eb40b.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=491333029318
FIREBASE_APP_ID=1:491333029318:web:b22ab906a3749ef701f6c7
JWT_SECRET=c855fa737e7c5d4f722baa772369f67c478967188a7bc136ac3c1015735a75a7
NODE_ENV=production
PORT=3000

# Email (Brevo) - see https://www.brevo.com, verify support@aecas.co.ke first
# NOTE: Render free tier blocks outbound SMTP (ports 80/443 only), so set BREVO_API_KEY
# (HTTP API) instead of relying on SMTP unless you are on a paid Render instance.
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_login_email
SMTP_PASS=your_brevo_smtp_key
EMAIL_FROM="AECAS <support@aecas.co.ke>"
# BREVO_API_KEY=xkeysib-...  # optional but strongly recommended on Render free tier
BASE_URL=https://www.aecas.co.ke

## Build Command: npm install
## Start Command: npm start

## Important: Set these as environment variables in Render, not in a file!
