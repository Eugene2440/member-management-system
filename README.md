# Member Management System

A comprehensive web-based member management system for associations, featuring role-based admin access, payment tracking, and a clean, mobile-friendly interface.

## Features

### Public Features
- **Member Registration Form**: Publicly accessible form for new member signups
- **Clean, Modern UI**: Responsive design with rounded fonts (Poppins)
- **Mobile-Friendly**: Optimized for all device sizes

### Admin Features
- **Role-Based Access Control**:
  - **Admin**: Full access (view, edit, delete members, manage payments)
  - **Registrar**: Can add and edit member details
  - **Treasurer**: Can update payment status
  - **View-Only**: Read-only access to member list

- **Dashboard Functionality**:
  - View all members with search and filtering
  - Update payment status (confirmed/pending/rejected)
  - Edit member information
  - Statistical overview (total members, pending payments, etc.)
  - Export capabilities

### Technical Features
- **Backend**: Node.js with Express
- **Database**: Firebase Firestore
- **Authentication**: JWT-based admin authentication
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Security**: Bcrypt password hashing, input validation

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: Google Fonts (Poppins), CSS Grid/Flexbox
- **Deployment Ready**: Configured for Render (backend) and static hosting

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- Firebase project with Firestore enabled
- Git

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd member-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Get your Firebase configuration from Project Settings
4. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase configuration:
```env
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
FIREBASE_APP_ID=your_app_id_here

JWT_SECRET=your_super_secure_jwt_secret_here_minimum_32_characters
PORT=3000
NODE_ENV=development
```

### 4. Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Setup Initial Admin Users
```bash
node backend/setup-admins.js
```

This creates default admin accounts:
- **Admin**: `admin` / `admin123`
- **Registrar**: `registrar` / `reg123`
- **Treasurer**: `treasurer` / `treas123`

⚠️ **Change these passwords immediately after first login!**

### 6. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Admin Login**: http://localhost:3000/login
- **Admin Dashboard**: http://localhost:3000/admin

## Project Structure

```
member-management-system/
├── backend/
│   ├── config/
│   │   └── firebase.js          # Firebase configuration
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   └── members.js           # Member management routes
│   ├── server.js                # Main server file
│   └── setup-admins.js          # Admin user setup script
├── frontend/
│   ├── css/
│   │   ├── style.css            # Main styles
│   │   └── dashboard.css        # Dashboard-specific styles
│   ├── js/
│   │   ├── registration.js      # Registration form logic
│   │   ├── login.js             # Login form logic
│   │   └── dashboard.js         # Dashboard functionality
│   ├── index.html               # Member registration page
│   ├── login.html               # Admin login page
│   └── admin.html               # Admin dashboard
├── .env.example                 # Environment variables template
├── package.json                 # Project dependencies
└── README.md                    # This file
```

## API Endpoints

### Public Endpoints
- `POST /api/members/register` - Member registration

### Protected Endpoints (Require Authentication)
- `GET /api/members` - Get all members (with filtering)
- `PUT /api/members/:id` - Update member details (registrar/admin only)
- `PATCH /api/members/:id/payment` - Update payment status (treasurer/admin only)
- `DELETE /api/members/:id` - Delete member (admin only)

### Authentication Endpoints
- `POST /api/auth/login` - Admin login
- `POST /api/auth/verify` - Verify JWT token

## User Roles & Permissions

| Action | Admin | Registrar | Treasurer | View-Only |
|--------|-------|-----------|-----------|-----------|
| View Members | ✅ | ✅ | ✅ | ✅ |
| Add Members | ✅ | ✅ | ❌ | ❌ |
| Edit Member Details | ✅ | ✅ | ❌ | ❌ |
| Update Payment Status | ✅ | ❌ | ✅ | ❌ |
| Delete Members | ✅ | ❌ | ❌ | ❌ |

## Deployment

### Backend Deployment (Render)
1. Create a new web service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Deploy with these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Frontend Deployment (Static Hosting)
The frontend can be deployed to any static hosting service:
- **Netlify**: Drag and drop the `frontend` folder
- **Vercel**: Import project and set build directory to `frontend`
- **GitHub Pages**: Push `frontend` folder to `gh-pages` branch

## Security Considerations

1. **Environment Variables**: Never commit `.env` file to version control
2. **JWT Secret**: Use a strong, randomly generated secret
3. **Password Policy**: Implement strong password requirements
4. **Input Validation**: All inputs are validated both client and server-side
5. **HTTPS**: Use HTTPS in production
6. **CORS**: Configure CORS for your domain in production

## Customization

### Styling
- Modify `frontend/css/style.css` for general styling
- Modify `frontend/css/dashboard.css` for dashboard-specific styling
- Change Google Fonts import in HTML files for different fonts

### Branding
- Update page titles in HTML files
- Modify header text and descriptions
- Add your organization's logo

### Membership Types
- Update membership type options in both frontend forms and backend validation
- Modify the dropdown options in `index.html` and `admin.html`

## Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Verify your Firebase configuration in `.env`
   - Ensure Firestore is enabled in Firebase Console

2. **Admin Login Not Working**
   - Run the admin setup script: `node backend/setup-admins.js`
   - Check if JWT_SECRET is set in `.env`

3. **CORS Errors**
   - Ensure your frontend domain is included in CORS configuration
   - Check if you're using the correct API URLs

4. **Permission Denied**
   - Verify user role in the admin dashboard
   - Check if JWT token is being sent correctly

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please create an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ for association management**
