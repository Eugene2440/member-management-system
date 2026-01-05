# AECAS Member Management System

A full-stack web application for the **Association of Engineering Construction and Architecture Students (AECAS)** at the Technical University of Kenya.

## Features

- **Member Registration** - Student and non-student registration with payment tracking
- **Admin Dashboard** - Role-based access control (Admin, Registrar, Communications)
- **Event Management** - Create, edit, and publish events
- **Announcements** - Priority-based announcements with expiry dates
- **Leadership Directory** - Showcase organization leaders
- **Partnerships** - Display partner organizations
- **Email Notifications** - Automated emails for registration and payment status
- **Analytics** - Registration trends and course distribution charts

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** Firebase Firestore
- **Authentication:** JWT with bcrypt
- **Email:** Nodemailer
- **Frontend:** HTML, CSS, JavaScript
- **Deployment:** Render.com

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore enabled
- SMTP email credentials (Gmail, SendGrid, etc.)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/member-management-system.git
   cd member-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials (see Environment Variables section)

4. **Set up admin users**
   ```bash
   npm run setup
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Website: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Authentication
JWT_SECRET=your_secure_random_string

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=AECAS <noreply@aecas.co.ke>
```

### Gmail Setup for SMTP

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the 16-character app password as `SMTP_PASS`

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/members/register` | Register new member |
| GET | `/api/events/public` | Get all events |
| GET | `/api/announcements/public` | Get active announcements |
| GET | `/api/leadership/public` | Get leadership team |
| GET | `/api/partnerships` | Get partnerships |
| GET | `/health` | Health check |

### Protected Endpoints (Require Authentication)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/auth/login` | All | Admin login |
| GET | `/api/members` | Registrar, Admin | List all members |
| PUT | `/api/members/:id` | Registrar, Admin | Update member |
| PATCH | `/api/members/:id/payment` | Registrar, Admin | Update payment status |
| DELETE | `/api/members/:id` | Admin | Delete member |
| POST | `/api/events` | Communications, Admin | Create event |
| PUT | `/api/events/:id` | Communications, Admin | Update event |
| DELETE | `/api/events/:id` | Admin | Delete event |

## Project Structure

```
├── backend/
│   ├── config/
│   │   └── firebase.js       # Firebase configuration
│   ├── middleware/
│   │   └── auth.js           # JWT authentication
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── members.js        # Member management
│   │   ├── events.js         # Event management
│   │   ├── announcements.js  # Announcements
│   │   ├── leadership.js     # Leadership management
│   │   └── partnerships.js   # Partnerships
│   ├── services/
│   │   └── email.js          # Email service
│   ├── templates/            # Email templates
│   ├── server.js             # Express server
│   └── setup-admins.js       # Admin setup script
├── frontend/
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript files
│   ├── images/               # Image assets
│   └── *.html                # HTML pages
├── .env.example              # Environment template
└── package.json
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features |
| **Registrar** | Manage members, verify payments |
| **Communications** | Manage events and announcements |

## Deployment

### Render.com

1. Create a new Web Service
2. Connect your GitHub repository
3. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables in Render dashboard
5. Deploy

### Manual Deployment

```bash
npm install --production
npm start
```

## Development

```bash
# Start with hot reload
npm run dev

# Run admin setup
npm run setup
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License

## Contact

- Email: aecas.students@gmail.com
- Website: https://aecas.co.ke
