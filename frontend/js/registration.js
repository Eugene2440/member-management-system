// Registration form functionality
document.addEventListener('DOMContentLoaded', function() {
    const registrationForm = document.getElementById('registrationForm');
    const submitBtn = registrationForm.querySelector('button[type="submit"]');
    
    if (!submitBtn) {
        console.error('Submit button not found');
        return;
    }
    
    registrationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        
        try {
            // Get form data
            const formData = new FormData(registrationForm);
            const memberData = {
                name: formData.get('name').trim(),
                email: formData.get('email').trim(),
                phone: formData.get('phone').replace(/\D/g, ''),
                registrationNumber: formData.get('registrationNumber') ? formData.get('registrationNumber').trim() : null,
                course: formData.get('course') || null,
                paymentReference: formData.get('paymentReference').trim()
            };
            
            // Validate required fields
            if (!memberData.name || !memberData.email || !memberData.phone || !memberData.paymentReference) {
                throw new Error('Please fill in all required fields including payment reference');
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(memberData.email)) {
                throw new Error('Please enter a valid email address');
            }
            
            // Phone number is saved as-is without format validation
            
            // Submit to API
            const response = await fetch('/api/members/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memberData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Show success modal
                showSuccessModal(result.memberId, result.memberNumber);
            } else {
                throw new Error(result.error || 'Registration failed');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            showErrorModal(error.message);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register Now';
        }
    });
});

function showSuccessModal(memberId, memberNumber) {
    const modal = document.getElementById('successModal');
    const memberNumberSpan = document.getElementById('memberNumber');
    
    memberNumberSpan.textContent = memberNumber || 'Not assigned';
    modal.style.display = 'block';
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        if (modal.style.display === 'block') {
            closeModal();
        }
    }, 10000);
}

function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
}

function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    modal.style.display = 'none';
}

function registerAnother() {
    // Reset form and close modal
    document.getElementById('registrationForm').reset();
    closeModal();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const successModal = document.getElementById('successModal');
    const errorModal = document.getElementById('errorModal');
    
    if (event.target === successModal) {
        closeModal();
    }
    
    if (event.target === errorModal) {
        closeErrorModal();
    }
});

// Form enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Clean phone number input - only allow digits
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        // Remove all non-digit characters
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    
    // Email validation feedback
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', function(e) {
        const email = e.target.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            e.target.style.borderColor = '#ff6b6b';
        } else {
            e.target.style.borderColor = '#e1e8ed';
        }
    });
    
    // Name capitalization
    const nameInput = document.getElementById('name');
    nameInput.addEventListener('blur', function(e) {
        const words = e.target.value.toLowerCase().split(' ');
        const capitalizedWords = words.map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        );
        e.target.value = capitalizedWords.join(' ');
    });
});
