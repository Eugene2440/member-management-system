// Configuration for production deployment
window.APP_CONFIG = {
    // Replace this URL with your actual Render backend URL after deployment
    API_BASE_URL: 'https://member-management-system-e52u.onrender.com',
    
    // Development URL (when running locally)
    DEV_API_BASE_URL: 'http://localhost:3000'
};

// Auto-detect environment and set API URL
window.API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? window.APP_CONFIG.DEV_API_BASE_URL 
    : window.APP_CONFIG.API_BASE_URL;
