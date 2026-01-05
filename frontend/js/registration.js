// Registration form functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle TUK Student Registration
    const studentRegistrationForm = document.getElementById('studentRegistrationForm');
    if (studentRegistrationForm) {
        const studentSubmitBtn = studentRegistrationForm.querySelector('button[type="submit"]');
        
        studentRegistrationForm.addEventListener('submit', async function(e) {
            await handleRegistration(e, studentSubmitBtn, 'student');
        });
    }
    
    // Handle Non-Student Registration
    const nonStudentRegistrationForm = document.getElementById('nonStudentRegistrationForm');
    if (nonStudentRegistrationForm) {
        const nonStudentSubmitBtn = nonStudentRegistrationForm.querySelector('button[type="submit"]');
        
        nonStudentRegistrationForm.addEventListener('submit', async function(e) {
            await handleRegistration(e, nonStudentSubmitBtn, 'non-student');
        });
    }
});

async function handleRegistration(e, submitBtn, type) {
    e.preventDefault();
    
    if (!submitBtn) {
        console.error('Submit button not found');
        return;
    }
    
    // Disable submit button and show loading
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Registering...';
    
    try {
        // Get form data
        const formData = new FormData(e.target);
        let memberData;
        
        if (type === 'student') {
            memberData = {
                name: formData.get('name').trim(),
                email: formData.get('email').trim(),
                phone: formData.get('phone').replace(/\D/g, ''),
                course: formData.get('course') || null,
                registrationNumber: formData.get('registrationNumber')?.trim() || null,
                paymentReference: formData.get('paymentReference').trim(),
                memberType: 'student',
                consent: formData.get('consent') === 'on'
            };
            
            // Validate consent
            if (!memberData.consent) {
                throw new Error('You must agree to the Terms of Service and Privacy Policy');
            }
            
            // Validate required fields for students
            if (!memberData.name || !memberData.email || !memberData.phone || !memberData.course || !memberData.paymentReference) {
                throw new Error('Please fill in all required fields including course and payment reference');
            }
        } else {
            memberData = {
                name: formData.get('name').trim(),
                email: formData.get('email').trim(),
                phone: formData.get('phone').replace(/\D/g, ''),
                areaOfInterest: formData.get('areaOfInterest') || null,
                paymentReference: formData.get('paymentReference').trim(),
                memberType: 'non-student',
                consent: formData.get('consent') === 'on'
            };
            
            // Validate consent
            if (!memberData.consent) {
                throw new Error('You must agree to the Terms of Service and Privacy Policy');
            }
            
            // Validate required fields for non-students
            if (!memberData.name || !memberData.email || !memberData.phone || !memberData.areaOfInterest || !memberData.paymentReference) {
                throw new Error('Please fill in all required fields including area of interest and payment reference');
            }
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(memberData.email)) {
            throw new Error('Please enter a valid email address');
        }
        
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
            // Reset form and show success modal
            e.target.reset();
            showSuccessModal();
        } else {
            throw new Error(result.error || 'Registration failed');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showErrorModal(error.message);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Legacy support for old registration form
function initLegacyForm() {
    const registrationForm = document.getElementById('registrationForm');
    if (!registrationForm) return;
    
    const submitBtn = registrationForm.querySelector('button[type="submit"]');
    
    registrationForm.addEventListener('submit', async function(e) {
        await handleRegistration(e, submitBtn, 'student');
    });
}

// Initialize legacy form if present
initLegacyForm();

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'block';
    
    // Auto-close after 8 seconds
    setTimeout(() => {
        if (modal.style.display === 'block') {
            closeModal();
        }
    }, 8000);
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
    // Clean phone number input - only allow digits (for all phone inputs)
    const phoneInputs = document.querySelectorAll('input[name="phone"]');
    phoneInputs.forEach(phoneInput => {
        phoneInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    });
    
    // Email validation feedback (for all email inputs)
    const emailInputs = document.querySelectorAll('input[name="email"]');
    emailInputs.forEach(emailInput => {
        emailInput.addEventListener('blur', function(e) {
            const email = e.target.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (email && !emailRegex.test(email)) {
                e.target.style.borderColor = '#ff6b6b';
            } else {
                e.target.style.borderColor = '#e1e8ed';
            }
        });
    });
    
    // Name capitalization (for all name inputs)
    const nameInputs = document.querySelectorAll('input[name="name"]');
    nameInputs.forEach(nameInput => {
        nameInput.addEventListener('blur', function(e) {
            const words = e.target.value.toLowerCase().split(' ');
            const capitalizedWords = words.map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            );
            e.target.value = capitalizedWords.join(' ');
        });
    });
});
