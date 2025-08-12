// Registration form functionality
document.addEventListener('DOMContentLoaded', function() {
    const registrationForm = document.getElementById('registrationForm');
    const submitBtn = registrationForm.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loadingSpinner = submitBtn.querySelector('.loading-spinner');
    
    registrationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';
        
        try {
            // Get form data
            const formData = new FormData(registrationForm);
            const memberData = {
                name: formData.get('name').trim(),
                email: formData.get('email').trim(),
                phone: formData.get('phone').trim(),
                registrationNumber: formData.get('registrationNumber') ? formData.get('registrationNumber').trim() : null,
                department: formData.get('department') || null,
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
            btnText.style.display = 'inline';
            loadingSpinner.style.display = 'none';
        }
    });
});

function showSuccessModal(memberId, memberNumber) {
    const modal = document.getElementById('successModal');
    const memberIdSpan = document.getElementById('memberId');
    const memberNumberSpan = document.getElementById('memberNumber');
    
    memberIdSpan.textContent = memberId;
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
    // Auto-format phone number
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 10) {
            // Format as (XXX) XXX-XXXX
            value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        }
        e.target.value = value;
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
