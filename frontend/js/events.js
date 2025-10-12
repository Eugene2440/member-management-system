const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://your-backend-url.onrender.com/api';

async function loadUpcomingEvents() {
    try {
        const response = await fetch(`${API_URL}/events/public`);
        const data = await response.json();
        
        if (data.success && data.events.length > 0) {
            displayEvents(data.events);
        }
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function displayEvents(events) {
    const eventsGrid = document.querySelector('.events-grid');
    const bgClasses = ['', 'career-fair', 'workshop'];
    eventsGrid.innerHTML = '';
    
    events.forEach((event, index) => {
        const eventDate = new Date(event.date);
        const month = eventDate.toLocaleString('en', { month: 'short' }).toUpperCase();
        const day = eventDate.getDate();
        const bgClass = bgClasses[index % bgClasses.length];
        
        const eventCard = `
            <div class="event-flyer">
                <div class="event-image ${bgClass}">
                    <div class="event-date-badge">
                        <span class="month">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    <div class="event-overlay">
                        <h3>${event.title}</h3>
                        <div class="event-details">
                            <p><i class="fas fa-clock"></i> ${event.time}</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                        </div>
                    </div>
                </div>
                <div class="event-description">
                    <p>${event.description || 'Join us for this exciting event!'}</p>
                    ${event.flyerImage ? `<button class="btn btn-primary" onclick="showFlyer('${event.flyerImage}', '${event.title}')">Check Flyer</button>` : ''}
                </div>
            </div>
        `;
        
        eventsGrid.innerHTML += eventCard;
    });
}

function showFlyer(imageUrl, title) {
    const modal = document.getElementById('flyerModal');
    const modalImg = modal.querySelector('img');
    const modalTitle = modal.querySelector('h3');
    
    if (imageUrl) {
        modalImg.src = imageUrl;
        modalTitle.textContent = title;
    }
    modal.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', loadUpcomingEvents);
