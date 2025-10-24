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
    const welcomeEl = document.getElementById('userWelcome');
    if (welcomeEl) {
        welcomeEl.textContent = `Welcome, ${currentUser.name}`;
    }
    
    // Set role-specific permissions
    setupRolePermissions();
    
    // Load initial data
    await loadMembers();
    updateStats();
    initializeAnalytics();
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
            updateAnalytics();
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
                <td>${escapeHtml(member.memberNumber || 'N/A')}</td>
                <td>${escapeHtml(member.department || 'N/A')}</td>
                <td>${escapeHtml(member.registrationNumber || 'N/A')}</td>
                <td>${escapeHtml(member.paymentReference || 'N/A')}</td>
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
        // Search filter - expanded to include new fields
        const matchesSearch = !searchTerm || 
            member.name.toLowerCase().includes(searchTerm) ||
            member.email.toLowerCase().includes(searchTerm) ||
            member.phone.includes(searchTerm) ||
            (member.memberNumber && member.memberNumber.toLowerCase().includes(searchTerm)) ||
            (member.department && member.department.toLowerCase().includes(searchTerm)) ||
            (member.registrationNumber && member.registrationNumber.toLowerCase().includes(searchTerm)) ||
            (member.paymentReference && member.paymentReference.toLowerCase().includes(searchTerm));
        
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
    document.getElementById('memberNumber').value = member.memberNumber || '';
    document.getElementById('memberDepartment').value = member.department || '';
    document.getElementById('memberRegistrationNumber').value = member.registrationNumber || '';
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
            phone: formData.get('phone').replace(/\D/g, ''),
            memberNumber: formData.get('memberNumber').trim(),
            department: formData.get('department') || null,
            registrationNumber: formData.get('registrationNumber').trim() || null,
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

// Analytics Functions
let charts = {};

function initializeAnalytics() {
    createRegistrationChart();
    createDepartmentChart();
}

function createRegistrationChart() {
    const ctx = document.getElementById('registrationChart').getContext('2d');
    
    // Get last 6 months data
    const monthsData = getLast6MonthsData();
    
    charts.registration = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthsData.labels,
            datasets: [{
                label: 'New Registrations',
                data: monthsData.data,
                borderColor: 'rgb(30, 58, 138)',
                backgroundColor: 'rgba(30, 58, 138, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                    labels: { font: { family: 'Afacad Flux' } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { family: 'Afacad Flux' }
                    }
                },
                x: {
                    ticks: { font: { family: 'Afacad Flux' } }
                }
            }
        }
    });
}

function createDepartmentChart() {
    const ctx = document.getElementById('departmentChart').getContext('2d');
    const departmentData = getDepartmentDistribution();
    
    charts.department = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: departmentData.labels,
            datasets: [{
                data: departmentData.data,
                backgroundColor: [
                    '#1e3a8a', '#3b82f6', '#eab308', '#ca8a04',
                    '#10b981', '#059669', '#dc2626', '#991b1b'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: { family: 'Afacad Flux' }
                    }
                }
            }
        }
    });
}


function getLast6MonthsData() {
    const months = [];
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        months.push(monthName);
        
        const count = allMembers.filter(member => {
            const memberDate = new Date(member.registrationDate);
            return memberDate.getMonth() === date.getMonth() && 
                   memberDate.getFullYear() === date.getFullYear();
        }).length;
        
        data.push(count);
    }
    
    return { labels: months, data: data };
}

function getDepartmentDistribution() {
    const departments = {};
    
    allMembers.forEach(member => {
        const dept = member.department || 'Not Specified';
        departments[dept] = (departments[dept] || 0) + 1;
    });
    
    return {
        labels: Object.keys(departments),
        data: Object.values(departments)
    };
}


function updateAnalytics() {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // Recreate charts with new data
    initializeAnalytics();
}

// Sidebar Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('dashboardMain');
    
    sidebar.classList.toggle('active');
    main.classList.toggle('sidebar-open');
}

function showSection(section) {
    // Update active nav link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Show/hide sections based on selection
    if (section === 'members') {
        showMembersSection();
    } else if (section === 'events') {
        showEventsSection();
    } else if (section === 'announcements') {
        showAnnouncementsSection();
    } else if (section === 'leadership') {
        showLeadershipSection();
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

function showMembersSection() {
    document.querySelector('.stats-section').style.display = 'block';
    document.querySelector('.analytics-section').style.display = 'block';
    document.querySelector('.filters-section').style.display = 'block';
    document.querySelector('.members-section').style.display = 'block';
    
    const eventsSection = document.getElementById('eventsSection');
    if (eventsSection) eventsSection.style.display = 'none';
    
    const announcementsSection = document.getElementById('announcementsSection');
    if (announcementsSection) announcementsSection.style.display = 'none';
}

function showEventsSection() {
    document.querySelector('.stats-section').style.display = 'none';
    document.querySelector('.analytics-section').style.display = 'none';
    document.querySelector('.filters-section').style.display = 'none';
    document.querySelector('.members-section').style.display = 'none';
    
    let eventsSection = document.getElementById('eventsSection');
    if (!eventsSection) {
        createEventsSection();
    } else {
        eventsSection.style.display = 'block';
    }
    
    const announcementsSection = document.getElementById('announcementsSection');
    if (announcementsSection) announcementsSection.style.display = 'none';
}

function showAnnouncementsSection() {
    document.querySelector('.stats-section').style.display = 'none';
    document.querySelector('.analytics-section').style.display = 'none';
    document.querySelector('.filters-section').style.display = 'none';
    document.querySelector('.members-section').style.display = 'none';
    
    const eventsSection = document.getElementById('eventsSection');
    if (eventsSection) eventsSection.style.display = 'none';
    
    const leadershipSection = document.getElementById('leadershipSection');
    if (leadershipSection) leadershipSection.style.display = 'none';
    
    let announcementsSection = document.getElementById('announcementsSection');
    if (!announcementsSection) {
        createAnnouncementsSection();
    } else {
        announcementsSection.style.display = 'block';
    }
}

function showLeadershipSection() {
    document.querySelector('.stats-section').style.display = 'none';
    document.querySelector('.analytics-section').style.display = 'none';
    document.querySelector('.filters-section').style.display = 'none';
    document.querySelector('.members-section').style.display = 'none';
    
    const eventsSection = document.getElementById('eventsSection');
    if (eventsSection) eventsSection.style.display = 'none';
    
    const announcementsSection = document.getElementById('announcementsSection');
    if (announcementsSection) announcementsSection.style.display = 'none';
    
    let leadershipSection = document.getElementById('leadershipSection');
    if (!leadershipSection) {
        createLeadershipSection();
    } else {
        leadershipSection.style.display = 'block';
    }
}

function createEventsSection() {
    const main = document.getElementById('dashboardMain');
    
    const eventsHTML = `
        <section id="eventsSection" class="events-management-section">
            <div class="section-header">
                <h2>Event Management</h2>
                <div style="display: flex; gap: 10px;">
                    <button onclick="toggleEventView('upcoming')" id="upcomingBtn" class="btn btn-secondary">
                        <i class="fas fa-calendar-plus"></i> Upcoming
                    </button>
                    <button onclick="toggleEventView('past')" id="pastBtn" class="btn btn-secondary">
                        <i class="fas fa-history"></i> Past
                    </button>
                    <button onclick="addNewEvent()" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Add Event
                    </button>
                </div>
            </div>
            
            <div class="events-grid" id="eventsGrid">
                <div class="loading-indicator" id="eventsLoading">
                    <div class="loading-spinner"></div>
                    <p>Loading events...</p>
                </div>
            </div>
        </section>
    `;
    
    main.insertAdjacentHTML('beforeend', eventsHTML);
    window.currentEventView = 'upcoming';
    loadEvents();
}

async function loadEvents() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/events', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            renderEvents(result.events);
        } else {
            throw new Error(result.error || 'Failed to load events');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('eventsGrid').innerHTML = '<p>Error loading events</p>';
    }
}

function renderEvents(events) {
    const grid = document.getElementById('eventsGrid');
    const now = new Date().toISOString().split('T')[0];
    const view = window.currentEventView || 'upcoming';
    
    localStorage.setItem('currentEvents', JSON.stringify(events));
    
    const upcoming = events.filter(e => e.date >= now);
    const past = events.filter(e => e.date < now);
    
    // Update button styles
    const upcomingBtn = document.getElementById('upcomingBtn');
    const pastBtn = document.getElementById('pastBtn');
    if (upcomingBtn && pastBtn) {
        if (view === 'upcoming') {
            upcomingBtn.className = 'btn btn-primary';
            pastBtn.className = 'btn btn-secondary';
        } else {
            upcomingBtn.className = 'btn btn-secondary';
            pastBtn.className = 'btn btn-primary';
        }
    }
    
    const displayEvents = view === 'upcoming' ? upcoming : past;
    
    if (displayEvents.length === 0) {
        grid.innerHTML = `<p>No ${view} events found.</p>`;
        return;
    }
    
    grid.innerHTML = displayEvents.map(event => renderEventCard(event, view === 'past')).join('');
}

function toggleEventView(view) {
    window.currentEventView = view;
    const events = JSON.parse(localStorage.getItem('currentEvents') || '[]');
    renderEvents(events);
}

function renderEventCard(event, isPast) {
    return `
        <div class="event-card">
            <h3>${escapeHtml(event.title)}</h3>
            <p><i class="fas fa-calendar"></i> ${new Date(event.date).toLocaleDateString()}</p>
            <p><i class="fas fa-clock"></i> ${escapeHtml(event.time)}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.location)}</p>
            ${event.description ? `<p class="event-description">${escapeHtml(event.description)}</p>` : ''}
            <div class="event-actions">
                ${event.flyerImage ? `<button class="btn btn-primary" onclick="viewEventFlyer('${event.flyerImage}', '${escapeHtml(event.title)}')"><i class="fas fa-image"></i> Flyer</button>` : ''}
                ${isPast ? `<button class="btn btn-primary" onclick="manageGallery('${event.id}')"><i class="fas fa-images"></i> Gallery</button>` : ''}
                <button class="btn btn-secondary" onclick="editEvent('${event.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

function addNewEvent() {
    showEventModal();
}

function editEvent(eventId) {
    const events = JSON.parse(localStorage.getItem('currentEvents') || '[]');
    const event = events.find(e => e.id === eventId);
    if (event) {
        showEventModal(event);
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Event deleted successfully', 'success');
            loadEvents();
        } else {
            throw new Error(result.error || 'Failed to delete event');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        showNotification('Error deleting event: ' + error.message, 'error');
    }
}

function showEventModal(event = null) {
    const isEdit = event !== null;
    const isPast = event && event.date < new Date().toISOString().split('T')[0];
    const modalHTML = `
        <div id="eventModal" class="modal" style="display: block;">
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit Event' : 'Add New Event'}</h2>
                    <button onclick="closeEventModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="eventForm">
                        <div class="form-group">
                            <label for="eventTitle">Event Title *</label>
                            <input type="text" id="eventTitle" value="${event ? escapeHtml(event.title) : ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="eventFlyer">Event Flyer Image</label>
                            <div class="file-upload-area" onclick="document.getElementById('flyerInput').click()">
                                <input type="file" id="flyerInput" accept="image/*" style="display: none;" onchange="handleFlyerUpload(event)">
                                <div id="flyerPreview" class="flyer-preview">
                                    ${event && event.flyerImage ? 
                                        `<img src="${event.flyerImage}" alt="Current flyer" />` : 
                                        `<div class="upload-placeholder">
                                            <i class="fas fa-cloud-upload-alt"></i>
                                            <p>Click to upload event flyer</p>
                                            <small>PNG, JPG up to 2MB</small>
                                        </div>`
                                    }
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="eventDate">Date *</label>
                                <input type="date" id="eventDate" value="${event ? event.date : ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="eventTime">Time *</label>
                                <input type="text" id="eventTime" value="${event ? escapeHtml(event.time) : ''}" placeholder="e.g., 2:00 PM - 5:00 PM" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="eventLocation">Location *</label>
                            <input type="text" id="eventLocation" value="${event ? escapeHtml(event.location) : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="eventDescription">Description</label>
                            <textarea id="eventDescription" rows="3">${event ? escapeHtml(event.description || '') : ''}</textarea>
                        </div>
                        ${isPast ? `
                        <div class="form-group">
                            <label for="eventRemarks">Remarks (for past events)</label>
                            <textarea id="eventRemarks" rows="3">${event ? escapeHtml(event.remarks || '') : ''}</textarea>
                        </div>` : ''}
                    </form>
                </div>
                <div class="modal-footer">
                    <button onclick="closeEventModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveEvent(${isEdit ? `'${event.id}'` : 'null'})" class="btn btn-primary">
                        ${isEdit ? 'Update Event' : 'Create Event'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.remove();
    }
}

function handleFlyerUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification('File size must be less than 2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // Compress image before preview
        compressImage(e.target.result, (compressedImage) => {
            const preview = document.getElementById('flyerPreview');
            preview.innerHTML = `<img src="${compressedImage}" alt="Event flyer preview" />`;
        });
    };
    reader.readAsDataURL(file);
}

function compressImage(base64, callback, quality = 0.7) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Resize to max 800px width while maintaining aspect ratio
        const maxWidth = 800;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        callback(compressedBase64);
    };
    
    img.src = base64;
}

async function saveEvent(eventId) {
    try {
        const title = document.getElementById('eventTitle').value.trim();
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value.trim();
        const location = document.getElementById('eventLocation').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const remarksField = document.getElementById('eventRemarks');
        const remarks = remarksField ? remarksField.value.trim() : '';
        
        if (!title || !date || !time || !location) {
            throw new Error('Please fill in all required fields');
        }
        
        let flyerImage = null;
        const flyerPreview = document.querySelector('#flyerPreview img');
        if (flyerPreview) {
            flyerImage = flyerPreview.src;
        }
        
        const eventData = { title, date, time, location, description, flyerImage, remarks };
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`/api/events${eventId ? `/${eventId}` : ''}`, {
            method: eventId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(`Event ${eventId ? 'updated' : 'created'} successfully`, 'success');
            closeEventModal();
            loadEvents();
        } else {
            throw new Error(result.error || `Failed to ${eventId ? 'update' : 'create'} event`);
        }
    } catch (error) {
        console.error('Error saving event:', error);
        showNotification('Error saving event: ' + error.message, 'error');
    }
}

function manageGallery(eventId) {
    const events = JSON.parse(localStorage.getItem('currentEvents') || '[]');
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const modalHTML = `
        <div id="galleryModal" class="modal" style="display: block;">
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Manage Gallery - ${escapeHtml(event.title)}</h2>
                    <button onclick="closeGalleryModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Add Images to Gallery</label>
                        <div class="file-upload-area" onclick="document.getElementById('galleryInput').click()">
                            <input type="file" id="galleryInput" accept="image/*" multiple style="display: none;" onchange="handleGalleryUpload(event, '${eventId}')">
                            <div class="upload-placeholder">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Click to upload images</p>
                                <small>Select multiple images (PNG, JPG up to 2MB each)</small>
                            </div>
                        </div>
                    </div>
                    <div id="galleryPreview" class="gallery-preview">
                        ${(event.gallery || []).map((img, idx) => `
                            <div class="gallery-item">
                                <img src="${img}" alt="Gallery image ${idx + 1}" />
                                <button class="remove-gallery-btn" onclick="removeGalleryImage('${eventId}', ${idx})">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeGalleryModal()" class="btn btn-primary">Done</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeGalleryModal() {
    const modal = document.getElementById('galleryModal');
    if (modal) modal.remove();
    loadEvents();
}

async function handleGalleryUpload(event, eventId) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    for (const file of files) {
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Each file must be less than 2MB', 'error');
            continue;
        }
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            compressImage(e.target.result, async (compressedImage) => {
                await addImageToGallery(eventId, compressedImage);
            });
        };
        reader.readAsDataURL(file);
    }
}

async function addImageToGallery(eventId, imageData) {
    try {
        const events = JSON.parse(localStorage.getItem('currentEvents') || '[]');
        const event = events.find(e => e.id === eventId);
        if (!event) return;
        
        const gallery = event.gallery || [];
        gallery.push(imageData);
        
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ gallery })
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification('Image added to gallery', 'success');
            closeGalleryModal();
            manageGallery(eventId);
        }
    } catch (error) {
        console.error('Error adding image:', error);
        showNotification('Error adding image', 'error');
    }
}

async function removeGalleryImage(eventId, index) {
    if (!confirm('Remove this image from gallery?')) return;
    
    try {
        const events = JSON.parse(localStorage.getItem('currentEvents') || '[]');
        const event = events.find(e => e.id === eventId);
        if (!event) return;
        
        const gallery = event.gallery || [];
        gallery.splice(index, 1);
        
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ gallery })
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification('Image removed', 'success');
            closeGalleryModal();
            manageGallery(eventId);
        }
    } catch (error) {
        console.error('Error removing image:', error);
        showNotification('Error removing image', 'error');
    }
}

function viewEventFlyer(imageUrl, title) {
    const modalHTML = `
        <div id="flyerViewModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>${escapeHtml(title)} - Event Flyer</h2>
                    <button onclick="closeFlyerViewModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center; padding: 20px;">
                    <img src="${imageUrl}" alt="Event Flyer" style="width: 100%; max-width: 600px; border-radius: 10px;" />
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeFlyerViewModal() {
    const modal = document.getElementById('flyerViewModal');
    if (modal) {
        modal.remove();
    }
}

function createAnnouncementsSection() {
    const main = document.getElementById('dashboardMain');
    
    const html = `
        <section id="announcementsSection" class="events-management-section">
            <div class="section-header">
                <h2>Announcements Management</h2>
                <button onclick="addAnnouncement()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add Announcement
                </button>
            </div>
            <div class="events-grid" id="announcementsGrid">
                <div class="loading-indicator"><div class="loading-spinner"></div><p>Loading...</p></div>
            </div>
        </section>
    `;
    
    main.insertAdjacentHTML('beforeend', html);
    loadAnnouncements();
}

async function loadAnnouncements() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/announcements', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            renderAnnouncements(result.announcements);
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
        document.getElementById('announcementsGrid').innerHTML = '<p>Error loading announcements</p>';
    }
}

function renderAnnouncements(announcements) {
    const grid = document.getElementById('announcementsGrid');
    
    if (announcements.length === 0) {
        grid.innerHTML = '<p>No announcements yet.</p>';
        return;
    }
    
    grid.innerHTML = announcements.map(a => `
        <div class="event-card">
            <h3>${escapeHtml(a.title)}</h3>
            <p>${escapeHtml(a.message)}</p>
            <p><small>Priority: ${a.priority} | Status: ${a.isActive ? 'Active' : 'Inactive'}</small></p>
            <div class="event-actions">
                <button class="btn btn-secondary" onclick="editAnnouncement('${a.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteAnnouncement('${a.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function addAnnouncement() {
    showAnnouncementModal();
}

function editAnnouncement(id) {
    fetch('/api/announcements', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
    .then(r => r.json())
    .then(data => {
        const announcement = data.announcements.find(a => a.id === id);
        if (announcement) showAnnouncementModal(announcement);
    });
}

function showAnnouncementModal(announcement = null) {
    const isEdit = announcement !== null;
    const modalHTML = `
        <div id="announcementModal" class="modal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit' : 'Add'} Announcement</h2>
                    <button onclick="closeAnnouncementModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" id="announcementTitle" value="${announcement ? escapeHtml(announcement.title) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Message *</label>
                        <textarea id="announcementMessage" rows="4" required>${announcement ? escapeHtml(announcement.message) : ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Priority</label>
                            <select id="announcementPriority">
                                <option value="normal" ${announcement && announcement.priority === 'normal' ? 'selected' : ''}>Normal</option>
                                <option value="high" ${announcement && announcement.priority === 'high' ? 'selected' : ''}>High</option>
                                <option value="urgent" ${announcement && announcement.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="announcementStatus">
                                <option value="true" ${!announcement || announcement.isActive ? 'selected' : ''}>Active</option>
                                <option value="false" ${announcement && !announcement.isActive ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeAnnouncementModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveAnnouncement(${isEdit ? `'${announcement.id}'` : 'null'})" class="btn btn-primary">
                        ${isEdit ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeAnnouncementModal() {
    const modal = document.getElementById('announcementModal');
    if (modal) modal.remove();
}

async function saveAnnouncement(id) {
    try {
        const title = document.getElementById('announcementTitle').value.trim();
        const message = document.getElementById('announcementMessage').value.trim();
        const priority = document.getElementById('announcementPriority').value;
        const isActive = document.getElementById('announcementStatus').value === 'true';
        
        if (!title || !message) {
            throw new Error('Title and message are required');
        }
        
        const data = { title, message, priority, isActive };
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`/api/announcements${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification(`Announcement ${id ? 'updated' : 'created'} successfully`, 'success');
            closeAnnouncementModal();
            loadAnnouncements();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/announcements/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification('Announcement deleted', 'success');
            loadAnnouncements();
        }
    } catch (error) {
        showNotification('Error deleting announcement', 'error');
    }
}

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


function createLeadershipSection() {
    const main = document.getElementById('dashboardMain');
    
    const html = `
        <section id="leadershipSection" class="events-management-section">
            <div class="section-header">
                <h2>Leadership Management</h2>
                <button onclick="addLeader()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add Leader
                </button>
            </div>
            <div class="events-grid" id="leadershipGrid">
                <div class="loading-indicator"><div class="loading-spinner"></div><p>Loading...</p></div>
            </div>
        </section>
    `;
    
    main.insertAdjacentHTML('beforeend', html);
    loadLeadership();
}

async function loadLeadership() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/leadership', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            renderLeadership(result.leaders);
        }
    } catch (error) {
        console.error('Error loading leadership:', error);
        document.getElementById('leadershipGrid').innerHTML = '<p>Error loading leadership</p>';
    }
}

function renderLeadership(leaders) {
    const grid = document.getElementById('leadershipGrid');
    
    if (leaders.length === 0) {
        grid.innerHTML = '<p>No leaders yet.</p>';
        return;
    }
    
    grid.innerHTML = leaders.map(l => `
        <div class="event-card">
            <div style="text-align: center; margin-bottom: 15px;">
                ${l.photo ? 
                    `<img src="${l.photo}" alt="${escapeHtml(l.name)}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin: 0 auto;">` :
                    `<div style="width: 120px; height: 120px; background: #dbeafe; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #eab308; line-height: 0;">
                        <i class="fas fa-user" style="font-size: 3rem; display: block;"></i>
                    </div>`
                }
            </div>
            <h3>${escapeHtml(l.position)}</h3>
            <p style="color: var(--primary-orange); font-weight: 600;">${escapeHtml(l.name)}</p>
            <p>${escapeHtml(l.description || '')}</p>
            <div class="event-actions">
                <button class="btn btn-secondary" onclick="editLeader('${l.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteLeader('${l.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function addLeader() {
    showLeaderModal();
}

function editLeader(id) {
    fetch('/api/leadership', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
    })
    .then(r => r.json())
    .then(data => {
        const leader = data.leaders.find(l => l.id === id);
        if (leader) showLeaderModal(leader);
    });
}

function showLeaderModal(leader = null) {
    const isEdit = leader !== null;
    const modalHTML = `
        <div id="leaderModal" class="modal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit' : 'Add'} Leader</h2>
                    <button onclick="closeLeaderModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Position *</label>
                        <input type="text" id="leaderPosition" value="${leader ? escapeHtml(leader.position) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" id="leaderName" value="${leader ? escapeHtml(leader.name) : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="leaderDescription" rows="3">${leader ? escapeHtml(leader.description || '') : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Photo</label>
                        <div class="file-upload-area" onclick="document.getElementById('leaderPhotoInput').click()">
                            <input type="file" id="leaderPhotoInput" accept="image/*" style="display: none;" onchange="handleLeaderPhotoUpload(event)">
                            <div id="leaderPhotoPreview" class="flyer-preview">
                                ${leader && leader.photo ? 
                                    `<img src="${leader.photo}" alt="Leader photo" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover;" />` : 
                                    `<div class="upload-placeholder">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <p>Click to upload photo</p>
                                        <small>PNG, JPG up to 2MB</small>
                                    </div>`
                                }
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Display Order</label>
                        <input type="number" id="leaderOrder" value="${leader ? leader.order || 0 : 0}" min="0">
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeLeaderModal()" class="btn btn-secondary">Cancel</button>
                    <button onclick="saveLeader(${isEdit ? `'${leader.id}'` : 'null'})" class="btn btn-primary">
                        ${isEdit ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeLeaderModal() {
    const modal = document.getElementById('leaderModal');
    if (modal) modal.remove();
}

function handleLeaderPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification('File size must be less than 2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        compressImage(e.target.result, (compressedImage) => {
            const preview = document.getElementById('leaderPhotoPreview');
            preview.innerHTML = `<img src="${compressedImage}" alt="Leader photo" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover;" />`;
        });
    };
    reader.readAsDataURL(file);
}

async function saveLeader(id) {
    try {
        const position = document.getElementById('leaderPosition').value.trim();
        const name = document.getElementById('leaderName').value.trim();
        const description = document.getElementById('leaderDescription').value.trim();
        const order = parseInt(document.getElementById('leaderOrder').value) || 0;
        
        if (!position || !name) {
            throw new Error('Position and name are required');
        }
        
        let photo = null;
        const photoPreview = document.querySelector('#leaderPhotoPreview img');
        if (photoPreview) {
            photo = photoPreview.src;
        }
        
        const data = { position, name, description, photo, order };
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`/api/leadership${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification(`Leader ${id ? 'updated' : 'added'} successfully`, 'success');
            closeLeaderModal();
            loadLeadership();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

async function deleteLeader(id) {
    if (!confirm('Delete this leader?')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/leadership/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            showNotification('Leader deleted', 'success');
            loadLeadership();
        }
    } catch (error) {
        showNotification('Error deleting leader', 'error');
    }
}
