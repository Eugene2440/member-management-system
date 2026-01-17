/**
 * Banner Display Controller
 * Handles fetching, displaying, and tracking promotional banners
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.3, 5.4, 7.1, 7.4
 */

// API URL configuration - follows existing AECAS pattern
const BANNER_API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://member-management-system-e52u.onrender.com/api';

// Session storage key prefix for tracking shown banners
const BANNER_STORAGE_PREFIX = 'aecas_banner_shown_';

// Default configuration values
const DEFAULT_DISPLAY_DURATION = 10; // seconds
const DEFAULT_DISPLAY_FREQUENCY = 'once_per_session';

// Track active banner state
let activeBannerOverlay = null;
let autoCloseTimer = null;

/**
 * Initialize the banner system on page load
 * Fetches active banners and displays the first eligible one
 * 
 * Requirements: 5.1
 */
async function initBannerSystem() {
    try {
        const banners = await fetchActiveBanners();
        
        if (!banners || banners.length === 0) {
            return;
        }
        
        // Find the first banner that should be displayed
        for (const banner of banners) {
            if (shouldDisplayBanner(banner)) {
                renderBanner(banner);
                break; // Only show one banner at a time
            }
        }
    } catch (error) {
        // Fail silently - don't block page load
        console.error('Error initializing banner system:', error);
    }
}

/**
 * Fetch active banners from the API
 * 
 * @returns {Promise<Array>} Array of active banner objects
 * Requirements: 5.1
 */
async function fetchActiveBanners() {
    try {
        const response = await fetch(`${BANNER_API_URL}/banners/active`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.banners)) {
            return data.banners;
        }
        
        return [];
    } catch (error) {
        console.error('Error fetching active banners:', error);
        return [];
    }
}

/**
 * Check if a banner should be displayed based on session storage and frequency settings
 * 
 * @param {Object} banner - The banner object to check
 * @returns {boolean} True if the banner should be displayed
 * 
 * Requirements: 3.2, 3.3, 3.5
 */
function shouldDisplayBanner(banner) {
    if (!banner || !banner.id) {
        return false;
    }
    
    const frequency = banner.displayFrequency || DEFAULT_DISPLAY_FREQUENCY;
    
    // If frequency is "every_visit", always show the banner
    // Requirements: 3.3
    if (frequency === 'every_visit') {
        return true;
    }
    
    // For "once_per_session", check session storage
    // Requirements: 3.2, 3.5
    try {
        const storageKey = `${BANNER_STORAGE_PREFIX}${banner.id}`;
        const hasBeenShown = sessionStorage.getItem(storageKey) === 'true';
        return !hasBeenShown;
    } catch (error) {
        // Session storage unavailable - fall back to showing banner
        console.warn('Session storage unavailable, showing banner:', error);
        return true;
    }
}

/**
 * Mark a banner as shown in session storage
 * 
 * @param {string} bannerId - The ID of the banner to mark as shown
 */
function markBannerAsShown(bannerId) {
    try {
        const storageKey = `${BANNER_STORAGE_PREFIX}${bannerId}`;
        sessionStorage.setItem(storageKey, 'true');
    } catch (error) {
        console.warn('Could not save banner shown state:', error);
    }
}

/**
 * Render a banner as a modal overlay
 * 
 * @param {Object} banner - The banner object to render
 * 
 * Requirements: 5.2, 5.5, 3.1, 3.4
 */
function renderBanner(banner) {
    if (!banner) {
        return;
    }
    
    // Remove any existing banner overlay
    if (activeBannerOverlay) {
        activeBannerOverlay.remove();
        activeBannerOverlay = null;
    }
    
    // Clear any existing auto-close timer
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'banner-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'banner-title');
    
    // Get display duration (default: 10 seconds)
    // Requirements: 3.1, 3.4
    const displayDuration = banner.displayDuration || DEFAULT_DISPLAY_DURATION;
    
    // Build image HTML
    const imageHtml = banner.imageUrl 
        ? `<div class="banner-image-container">
               <img src="${escapeHtml(banner.imageUrl)}" alt="${escapeHtml(banner.title)}" class="banner-image" onerror="this.parentElement.classList.add('no-image'); this.style.display='none';">
           </div>`
        : `<div class="banner-image-container no-image"></div>`;
    
    // Build modal HTML
    // Requirements: 5.5
    overlay.innerHTML = `
        <div class="banner-modal" tabindex="0" data-banner-id="${escapeHtml(banner.id)}" data-redirect-url="${escapeHtml(banner.redirectUrl || '')}">
            <button class="banner-close" aria-label="Close banner" onclick="closeBanner('${escapeHtml(banner.id)}')"></button>
            <div class="banner-content">
                ${imageHtml}
                <div class="banner-text">
                    <h2 class="banner-title" id="banner-title">${escapeHtml(banner.title)}</h2>
                    ${banner.description ? `<p class="banner-description">${escapeHtml(banner.description)}</p>` : ''}
                    ${banner.redirectUrl ? '<span class="banner-cta">Learn More</span>' : ''}
                </div>
            </div>
            <div class="banner-progress" style="width: 100%;"></div>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(overlay);
    activeBannerOverlay = overlay;
    
    // Get modal element for click handling
    const modal = overlay.querySelector('.banner-modal');
    
    // Handle click on modal content (redirect)
    // Requirements: 5.3
    modal.addEventListener('click', (e) => {
        // Don't redirect if clicking the close button
        if (e.target.classList.contains('banner-close')) {
            return;
        }
        handleBannerClick(banner);
    });
    
    // Handle click on overlay background (close)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeBanner(banner.id);
        }
    });
    
    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeBanner(banner.id);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Activate overlay (triggers CSS transition)
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        modal.focus();
    });
    
    // Track impression
    // Requirements: 7.4
    trackEvent(banner.id, 'impression');
    
    // Set up auto-close timer with progress bar
    // Requirements: 3.1
    const progressBar = overlay.querySelector('.banner-progress');
    if (progressBar) {
        progressBar.style.transition = `width ${displayDuration}s linear`;
        requestAnimationFrame(() => {
            progressBar.style.width = '0%';
        });
    }
    
    autoCloseTimer = setTimeout(() => {
        closeBanner(banner.id);
    }, displayDuration * 1000);
}

/**
 * Close the banner and mark it as shown
 * 
 * @param {string} bannerId - The ID of the banner to close
 * 
 * Requirements: 5.4
 */
function closeBanner(bannerId) {
    // Clear auto-close timer
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
    
    // Mark banner as shown in session storage
    markBannerAsShown(bannerId);
    
    // Remove overlay with animation
    if (activeBannerOverlay) {
        activeBannerOverlay.classList.remove('active');
        
        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            if (activeBannerOverlay) {
                activeBannerOverlay.remove();
                activeBannerOverlay = null;
            }
        }, 300); // Match CSS transition duration
    }
}

/**
 * Handle banner click - redirect to URL and track click
 * 
 * @param {Object} banner - The banner object that was clicked
 * 
 * Requirements: 5.3, 7.1
 */
function handleBannerClick(banner) {
    if (!banner) {
        return;
    }
    
    // Track click event
    // Requirements: 7.1
    trackEvent(banner.id, 'click');
    
    // Mark as shown
    markBannerAsShown(banner.id);
    
    // Clear auto-close timer
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
    
    // Redirect to URL if provided
    // Requirements: 5.3
    if (banner.redirectUrl) {
        // Small delay to ensure tracking request is sent
        setTimeout(() => {
            window.location.href = banner.redirectUrl;
        }, 100);
    } else {
        // No redirect URL, just close the banner
        closeBanner(banner.id);
    }
}

/**
 * Track banner events (impressions and clicks)
 * 
 * @param {string} bannerId - The ID of the banner
 * @param {string} eventType - The type of event ('impression' or 'click')
 * 
 * Requirements: 7.1, 7.4
 */
async function trackEvent(bannerId, eventType) {
    if (!bannerId || !eventType) {
        return;
    }
    
    try {
        // Use sendBeacon for reliability (works even if page is closing)
        const data = JSON.stringify({
            bannerId: bannerId,
            eventType: eventType
        });
        
        // Try sendBeacon first for better reliability
        if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon(`${BANNER_API_URL}/banners/track`, blob);
        } else {
            // Fallback to fetch
            fetch(`${BANNER_API_URL}/banners/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data
            }).catch(error => {
                console.error('Error tracking banner event:', error);
            });
        }
    } catch (error) {
        // Fail silently - tracking should not affect user experience
        console.error('Error tracking banner event:', error);
    }
}

/**
 * Escape HTML to prevent XSS attacks
 * 
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    const str = String(text);
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
}

// Initialize banner system when DOM is ready
document.addEventListener('DOMContentLoaded', initBannerSystem);

// Export functions for testing (if in module environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initBannerSystem,
        fetchActiveBanners,
        shouldDisplayBanner,
        renderBanner,
        closeBanner,
        handleBannerClick,
        trackEvent,
        markBannerAsShown,
        BANNER_STORAGE_PREFIX,
        DEFAULT_DISPLAY_DURATION,
        DEFAULT_DISPLAY_FREQUENCY
    };
}
