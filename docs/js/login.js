// Login form functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const submitBtn = loginForm.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loadingSpinner = submitBtn.querySelector('.loading-spinner');
    const errorDiv = document.getElementById('loginError');
    
    // Check if user is already logged in
    const token = localStorage.getItem('adminToken');
    if (token) {
        // Verify token and redirect if valid
        verifyTokenAndRedirect(token);
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        hideError();
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';
        
        try {
            // Get form data
            const formData = new FormData(loginForm);
            const loginData = {
                username: formData.get('username').trim(),
                password: formData.get('password')
            };
            
            // Validate required fields
            if (!loginData.username || !loginData.password) {
                throw new Error('Please enter both username and password');
            }
            
            // Submit to API
            const response = await fetch(`${window.API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Store token and user info
                localStorage.setItem('adminToken', result.token);
                localStorage.setItem('adminUser', JSON.stringify(result.user));
                
                // Redirect to dashboard
                window.location.href = '/admin';
            } else {
                throw new Error(result.error || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            loadingSpinner.style.display = 'none';
        }
    });
    
    // Enter key handling
    loginForm.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});

async function verifyTokenAndRedirect(token) {
    try {
        const response = await fetch(`${window.API_URL}/api/auth/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Token is valid, redirect to dashboard
            window.location.href = '/admin';
        } else {
            // Token is invalid, remove it
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
        }
    } catch (error) {
        console.error('Token verification error:', error);
        // Remove invalid token
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(hideError, 5000);
}

function hideError() {
    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';
}

// Form enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Focus on username field
    document.getElementById('username').focus();
    
    // Clear error when user starts typing
    const inputs = document.querySelectorAll('#loginForm input');
    inputs.forEach(input => {
        input.addEventListener('input', hideError);
    });
});
