// Dashboard functionality
let currentUser = null;
let allMembers = [];
let filteredMembers = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');
    
    if (!token || !userStr) {
        window.location.href = '/login';
        return;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        initializeDashboard();
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
    }
});

async function initializeDashboard() {
    // Update user info in header
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.name}`;
    document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
    
    // Set role-specific permissions
    setupRolePermissions();
    
    // Load initial data
    await loadMembers();
    updateStats();
}

function setupRolePermissions() {
    const role = currentUser.role;
    
    // Hide delete button for non-admin users
    if (role !== 'admin') {
        const deleteBtn = document.getElementById('deleteMemberBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    }
    
    // Disable editing for view-only roles
    if (!['registrar', 'admin'].includes(role)) {
        const editButtons = document.querySelectorAll('.btn-edit');
        editButtons.forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

async function loadMembers() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableBody = document.getElementById('membersTableBody');
    const noMembers = document.getElementById('noMembers');
    
    try {
        loadingIndicator.style.display = 'block';
        tableBody.innerHTML = '';
        noMembers.style.display = 'none';
        
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/members', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load members');
        }
        
        const result = await response.json();
        
        if (result.success) {
            allMembers = result.members;
            filteredMembers = [...allMembers];
            renderMembersTable();
            updateStats();
        } else {
            throw new Error(result.error || 'Failed to load members');
        }
        
    } catch (error) {
        console.error('Error loading members:', error);
        showNotification('Error loading members: ' + error.message, 'error');
        noMembers.style.display = 'block';
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function renderMembersTable() {
    const tableBody = document.getElementById('membersTableBody');
    const noMembers = document.getElementById('noMembers');
    
    if (filteredMembers.length === 0) {
        tableBody.innerHTML = '';
        noMembers.style.display = 'block';
        return;
    }
    
    noMembers.style.display = 'none';
    
    tableBody.innerHTML = filteredMembers.map(member => {
        const registrationDate = new Date(member.registrationDate).toLocaleDateString();
        const statusClass = `status-${member.paymentStatus}`;
        
        return `
            <tr>
                <td>${escapeHtml(member.name)}</td>
                <td>${escapeHtml(member.email)}</td>
                <td>${escapeHtml(member.phone)}</td>
                <td>${escapeHtml(member.membershipType)}</td>
                <td><span class="status-badge ${statusClass}">${member.paymentStatus}</span></td>
                <td>${registrationDate}</td>
                <td>
                    <div class="action-buttons">
                        ${getActionButtons(member)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getActionButtons(member) {
    const role = currentUser.role;
    let buttons = '';
    
    // Edit button for registrar and admin
    if (['registrar', 'admin'].includes(role)) {
        buttons += `<button class="action-btn btn-edit" onclick="editMember('${member.id}')">Edit</button>`;
    }
    
    // Payment status buttons for treasurer and admin
    if (['treasurer', 'admin'].includes(role)) {
        if (member.paymentStatus !== 'confirmed') {
            buttons += `<button class="action-btn btn-confirm" onclick="updatePaymentStatus('${member.id}', 'confirmed')">Confirm</button>`;
        }
        if (member.paymentStatus !== 'rejected') {
            buttons += `<button class="action-btn btn-reject" onclick="updatePaymentStatus('${member.id}', 'rejected')">Reject</button>`;
        }
    }
    
    return buttons;
}

function updateStats() {
    const totalMembers = allMembers.length;
    const pendingPayments = allMembers.filter(m => m.paymentStatus === 'pending').length;
    const confirmedPayments = allMembers.filter(m => m.paymentStatus === 'confirmed').length;
    
    // This month members (registered in current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthMembers = allMembers.filter(m => {
        const memberDate = new Date(m.registrationDate);
        return memberDate.getMonth() === currentMonth && memberDate.getFullYear() === currentYear;
    }).length;
    
    document.getElementById('totalMembers').textContent = totalMembers;
    document.getElementById('pendingPayments').textContent = pendingPayments;
    document.getElementById('confirmedPayments').textContent = confirmedPayments;
    document.getElementById('thisMonthMembers').textContent = thisMonthMembers;
}

function searchMembers() {
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const paymentStatusFilter = document.getElementById('paymentStatusFilter').value;
    const membershipTypeFilter = document.getElementById('membershipTypeFilter').value;
    
    filteredMembers = allMembers.filter(member => {
        // Search filter
        const matchesSearch = !searchTerm || 
            member.name.toLowerCase().includes(searchTerm) ||
            member.email.toLowerCase().includes(searchTerm) ||
            member.phone.includes(searchTerm);
        
        // Payment status filter
        const matchesPaymentStatus = !paymentStatusFilter || 
            member.paymentStatus === paymentStatusFilter;
        
        // Membership type filter
        const matchesMembershipType = !membershipTypeFilter || 
            member.membershipType === membershipTypeFilter;
        
        return matchesSearch && matchesPaymentStatus && matchesMembershipType;
    });
    
    renderMembersTable();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('paymentStatusFilter').value = '';
    document.getElementById('membershipTypeFilter').value = '';
    
    filteredMembers = [...allMembers];
    renderMembersTable();
}

function refreshMembers() {
    loadMembers();
}

async function updatePaymentStatus(memberId, status) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/members/${memberId}/payment`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paymentStatus: status })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(`Payment status updated to ${status}`, 'success');
            await loadMembers();
        } else {
            throw new Error(result.error || 'Failed to update payment status');
        }
        
    } catch (error) {
        console.error('Error updating payment status:', error);
        showNotification('Error updating payment status: ' + error.message, 'error');
    }
}

function editMember(memberId) {
    const member = allMembers.find(m => m.id === memberId);
    if (!member) return;
    
    // Populate modal form
    document.getElementById('memberId').value = member.id;
    document.getElementById('memberName').value = member.name;
    document.getElementById('memberEmail').value = member.email;
    document.getElementById('memberPhone').value = member.phone;
    document.getElementById('memberMembershipType').value = member.membershipType;
    document.getElementById('memberPaymentReference').value = member.paymentReference || '';
    document.getElementById('memberPaymentStatus').value = member.paymentStatus;
    
    // Set modal title
    document.getElementById('modalTitle').textContent = 'Edit Member';
    
    // Show appropriate buttons based on role
    const role = currentUser.role;
    const deleteBtn = document.getElementById('deleteMemberBtn');
    
    if (role === 'admin') {
        deleteBtn.style.display = 'inline-block';
    } else {
        deleteBtn.style.display = 'none';
    }
    
    // Disable payment status field for non-treasurer/admin
    const paymentStatusField = document.getElementById('memberPaymentStatus');
    if (!['treasurer', 'admin'].includes(role)) {
        paymentStatusField.disabled = true;
    } else {
        paymentStatusField.disabled = false;
    }
    
    // Show modal
    document.getElementById('memberModal').style.display = 'block';
}

async function saveMember() {
    try {
        const memberId = document.getElementById('memberId').value;
        const formData = new FormData(document.getElementById('memberForm'));
        
        const memberData = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim(),
            phone: formData.get('phone').trim(),
            membershipType: formData.get('membershipType'),
            paymentReference: formData.get('paymentReference').trim(),
            paymentStatus: formData.get('paymentStatus')
        };
        
        // Validate required fields
        if (!memberData.name || !memberData.email || !memberData.phone) {
            throw new Error('Please fill in all required fields');
        }
        
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/members/${memberId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(memberData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Member updated successfully', 'success');
            closeMemberModal();
            await loadMembers();
        } else {
            throw new Error(result.error || 'Failed to update member');
        }
        
    } catch (error) {
        console.error('Error saving member:', error);
        showNotification('Error saving member: ' + error.message, 'error');
    }
}

function deleteMember() {
    const memberName = document.getElementById('memberName').value;
    showConfirmDialog(
        `Are you sure you want to delete ${memberName}? This action cannot be undone.`,
        performDeleteMember
    );
}

async function performDeleteMember() {
    try {
        const memberId = document.getElementById('memberId').value;
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`/api/members/${memberId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Member deleted successfully', 'success');
            closeMemberModal();
            await loadMembers();
        } else {
            throw new Error(result.error || 'Failed to delete member');
        }
        
    } catch (error) {
        console.error('Error deleting member:', error);
        showNotification('Error deleting member: ' + error.message, 'error');
    }
}

function closeMemberModal() {
    document.getElementById('memberModal').style.display = 'none';
}

function showConfirmDialog(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'block';
    
    // Store callback for confirm button
    window.confirmCallback = callback;
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    window.confirmCallback = null;
}

function confirmAction() {
    if (window.confirmCallback) {
        window.confirmCallback();
    }
    closeConfirmModal();
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/login';
}

function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #dc3545, #e74c3c)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #4facfe, #00f2fe)';
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Event listeners for modal closing
window.addEventListener('click', function(event) {
    const memberModal = document.getElementById('memberModal');
    const confirmModal = document.getElementById('confirmModal');
    
    if (event.target === memberModal) {
        closeMemberModal();
    }
    
    if (event.target === confirmModal) {
        closeConfirmModal();
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
