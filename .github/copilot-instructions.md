<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Member Management System - Copilot Instructions

## Project Overview
This is a web-based member management system for associations built with:
- **Backend**: Node.js + Express + Firebase Firestore
- **Frontend**: Vanilla HTML/CSS/JavaScript with Poppins font
- **Authentication**: JWT-based with role-based access control
- **Deployment**: Backend on Render, frontend on static hosting

## Code Style & Conventions

### JavaScript
- Use modern ES6+ features (async/await, arrow functions, destructuring)
- Prefer `const` and `let` over `var`
- Use meaningful variable names and functions
- Add error handling with try-catch blocks
- Follow the existing patterns for API calls and error handling

### CSS
- Use CSS Grid and Flexbox for layouts
- Follow mobile-first responsive design
- Use CSS custom properties for consistent theming
- Maintain the rounded, modern design aesthetic
- Use Poppins font family throughout

### HTML
- Use semantic HTML5 elements
- Ensure accessibility with proper labels and ARIA attributes
- Maintain consistent class naming conventions
- Include proper meta tags for responsive design

## Architecture Patterns

### Frontend
- Separate concerns: registration.js, login.js, dashboard.js
- Use vanilla JavaScript with DOM manipulation
- Implement loading states and user feedback
- Handle authentication state management with localStorage
- Use modals for confirmations and forms

### Backend
- Follow Express.js middleware patterns
- Use Firebase Firestore for data persistence
- Implement JWT authentication with role-based access
- Structure routes logically (auth.js, members.js)
- Add proper error handling and validation

### Security
- Always validate input on both client and server
- Use bcrypt for password hashing
- Implement JWT token verification
- Follow principle of least privilege for user roles
- Sanitize all user inputs to prevent XSS

## Role-Based Access Control
- **Admin**: Full CRUD access to all resources
- **Registrar**: Can view and edit member details
- **Treasurer**: Can view members and update payment status
- **View-Only**: Read-only access to member list

## API Conventions
- Use RESTful endpoints with proper HTTP methods
- Return consistent JSON responses with success/error structure
- Include proper HTTP status codes
- Implement proper error messages for user feedback

## Common Patterns to Follow

### Error Handling
```javascript
try {
    const response = await fetch('/api/endpoint');
    const result = await response.json();
    
    if (response.ok && result.success) {
        // Handle success
    } else {
        throw new Error(result.error || 'Operation failed');
    }
} catch (error) {
    console.error('Error:', error);
    showNotification(error.message, 'error');
}
```

### Authentication
- Always check for valid JWT token before protected operations
- Redirect to login if token is invalid or missing
- Include Authorization header for API calls

### Form Handling
- Implement loading states during submissions
- Validate inputs before submission
- Show clear success/error feedback to users
- Reset forms after successful operations

## File Organization
- Keep frontend assets organized in css/ and js/ folders
- Separate backend logic into routes, middleware, and config
- Use descriptive file names that match their purpose
- Keep related functionality in the same files

## When Adding New Features
1. Consider security implications and role permissions
2. Update both frontend and backend simultaneously
3. Add proper error handling and validation
4. Ensure mobile responsiveness
5. Test with different user roles
6. Update documentation if needed

## Common Utilities
- Use `escapeHtml()` function for preventing XSS
- Use `showNotification()` for user feedback
- Follow existing modal patterns for dialogs
- Use consistent button styles and interactions
