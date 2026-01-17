# Implementation Plan: Promotional Banner System

## Overview

This implementation plan breaks down the promotional banner feature into discrete coding tasks. The approach follows the existing AECAS codebase patterns (Express.js backend, Firebase, vanilla JS frontend) and builds incrementally from backend to frontend to admin integration.

## Tasks

- [x] 1. Create backend banner routes and Firebase integration
  - [x] 1.1 Create `backend/routes/banners.js` with CRUD endpoints
    - Implement POST /api/banners (create banner)
    - Implement GET /api/banners (list all banners - admin)
    - Implement GET /api/banners/active (public - active banners only)
    - Implement PUT /api/banners/:id (update banner)
    - Implement DELETE /api/banners/:id (delete banner)
    - Add validation for required fields (title, redirectUrl)
    - Add date filtering logic for active banners
    - Add ordering by createdAt descending
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 1.2 Write property test for banner serialization round-trip
    - **Property 1: Banner Serialization Round-Trip**
    - **Validates: Requirements 1.2, 8.2, 8.3, 8.4**

  - [ ]* 1.3 Write property test for date range filtering
    - **Property 2: Date Range Filtering**
    - **Validates: Requirements 2.1, 2.2, 2.3, 6.2**

  - [ ]* 1.4 Write property test for active flag filtering
    - **Property 3: Active Flag Filtering**
    - **Validates: Requirements 6.1**

  - [ ]* 1.5 Write property test for creation date ordering
    - **Property 4: Creation Date Ordering**
    - **Validates: Requirements 6.3**

- [x] 2. Implement analytics tracking endpoint
  - [x] 2.1 Add POST /api/banners/track endpoint to `backend/routes/banners.js`
    - Accept bannerId and eventType (impression/click)
    - Increment corresponding counter in Firebase
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ]* 2.2 Write property test for analytics counter increment
    - **Property 9: Analytics Counter Increment**
    - **Validates: Requirements 7.2**

- [x] 3. Register banner routes in server.js
  - [x] 3.1 Import and mount banner routes in `backend/server.js`
    - Add `const bannerRoutes = require('./routes/banners')`
    - Add `app.use('/api/banners', bannerRoutes)`
    - _Requirements: 6.4_

- [x] 4. Checkpoint - Backend API complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 5. Create frontend banner display component
  - [x] 5.1 Create `frontend/css/banner.css` with modal styles
    - Style banner overlay (full-screen backdrop)
    - Style banner modal (centered, responsive)
    - Style close button
    - Style banner content (title, description, image)
    - _Requirements: 5.2, 5.5_

  - [x] 5.2 Create `frontend/js/banner.js` with display controller
    - Implement initBannerSystem() to run on page load
    - Implement fetchActiveBanners() API call
    - Implement shouldDisplayBanner() with session storage check
    - Implement renderBanner() to create modal DOM
    - Implement closeBanner() to hide and mark as shown
    - Implement handleBannerClick() for redirect and tracking
    - Implement trackEvent() for impressions and clicks
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.3, 5.4, 7.1, 7.4_

  - [ ]* 5.3 Write property test for session frequency tracking
    - **Property 5: Session Frequency Tracking**
    - **Validates: Requirements 3.2**

  - [ ]* 5.4 Write property test for every-visit frequency bypass
    - **Property 6: Every-Visit Frequency Bypass**
    - **Validates: Requirements 3.3**

- [x] 6. Integrate banner script into website pages
  - [x] 6.1 Add banner CSS and JS to `frontend/home.html`
    - Add `<link rel="stylesheet" href="css/banner.css">`
    - Add `<script src="js/banner.js"></script>`
    - Call initBannerSystem() on DOMContentLoaded
    - _Requirements: 5.1_

- [x] 7. Checkpoint - Frontend display complete
  - Ensure banner displays correctly on home page, ask the user if questions arise.

- [x] 8. Add banner management to admin panel
  - [x] 8.1 Add banners section HTML to `frontend/admin.html`
    - Add navigation link for Banners section
    - Add banners table with columns: Title, Status, Dates, Impressions, Clicks, Actions
    - Add create/edit banner modal form
    - _Requirements: 4.4, 7.3_

  - [x] 8.2 Add banner management functions to `frontend/js/dashboard.js`
    - Implement loadBanners() to fetch and display all banners
    - Implement showBannerModal() for create/edit form
    - Implement saveBanner() for create/update operations
    - Implement deleteBanner() with confirmation
    - Implement toggleBannerStatus() for quick enable/disable
    - Add showSection('banners') handler
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 8.3 Write property test for update persistence
    - **Property 7: Update Persistence**
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 8.4 Write property test for delete removes banner
    - **Property 8: Delete Removes Banner**
    - **Validates: Requirements 4.2**

- [ ] 9. Add validation and metadata tests
  - [ ]* 9.1 Write property test for validation rejects missing fields
    - **Property 10: Validation Rejects Missing Required Fields**
    - **Validates: Requirements 1.3**

  - [ ]* 9.2 Write property test for metadata auto-population
    - **Property 11: Metadata Auto-Population**
    - **Validates: Requirements 1.4**

- [x] 10. Final checkpoint - All tests pass
  - Ensure all unit tests and property tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The implementation follows existing AECAS patterns (Express routes, Firebase, vanilla JS)
