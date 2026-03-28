# Implementation Plan: Centralized API Configuration

## Overview

This implementation creates a centralized API configuration system for the AECAS frontend. The approach involves creating a single config.js module that exports the backend API base URL with automatic environment detection, then updating all five frontend modules (banner.js, events.js, dashboard.js, login.js, registration.js) to import and use this centralized configuration. This eliminates hardcoded URLs and prevents CORS errors when the backend URL changes.

## Tasks

- [x] 1. Create centralized configuration module
  - Create frontend/js/config.js with environment detection logic
  - Export API_BASE_URL constant that detects localhost vs production
  - Use window.location.hostname to determine environment
  - Set http://localhost:3000/api for localhost/127.0.0.1
  - Set https://aecas.onrender.com/api for production
  - Include documentation comments explaining usage
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3_

- [ ]* 1.1 Write unit tests for configuration module
  - Test API_BASE_URL is exported and is a string
  - Test localhost detection returns http://localhost:3000/api
  - Test 127.0.0.1 detection returns http://localhost:3000/api
  - Test production detection returns https://aecas.onrender.com/api
  - Test URL structure (ends with /api, no trailing slash)
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

- [ ]* 1.2 Write property test for URL construction consistency
  - **Property 1: URL Construction Consistency**
  - **Validates: Requirements 2.6, 3.2**
  - Generate random endpoint paths
  - Verify ${API_BASE_URL}${path} produces valid URL starting with API_BASE_URL
  - Run minimum 100 iterations

- [ ]* 1.3 Write property test for production environment detection
  - **Property 2: Production Environment Detection**
  - **Validates: Requirements 5.2**
  - Generate random hostname strings (excluding localhost/127.0.0.1)
  - Verify API_BASE_URL equals https://aecas.onrender.com/api for each hostname
  - Run minimum 100 iterations

- [x] 2. Update banner.js to use centralized config
  - Add import statement for API_BASE_URL from ./config.js
  - Replace BANNER_API_URL variable with imported API_BASE_URL
  - Update fetch call to use API_BASE_URL
  - Remove old environment detection logic
  - _Requirements: 2.1, 2.6, 3.1, 3.2, 4.1_

- [x] 3. Update events.js to use centralized config
  - Add import statement for API_BASE_URL from ./config.js
  - Replace API_URL variable with imported API_BASE_URL
  - Update fetch calls to use API_BASE_URL
  - Remove old environment detection logic
  - _Requirements: 2.2, 2.6, 3.1, 3.2, 4.1_

- [x] 4. Update dashboard.js to use centralized config
  - Add import statement for API_BASE_URL from ./config.js
  - Replace all relative URL patterns (/api/...) with ${API_BASE_URL}/...
  - Update all fetch calls to construct full URLs using API_BASE_URL
  - _Requirements: 2.3, 2.6, 3.1, 3.2, 4.1_

- [x] 5. Update login.js to use centralized config
  - Add import statement for API_BASE_URL from ./config.js
  - Replace all relative URL patterns (/api/...) with ${API_BASE_URL}/...
  - Update all fetch calls to construct full URLs using API_BASE_URL
  - _Requirements: 2.4, 2.6, 3.1, 3.2, 4.1_

- [x] 6. Update registration.js to use centralized config
  - Add import statement for API_BASE_URL from ./config.js
  - Replace all relative URL patterns (/api/...) with ${API_BASE_URL}/...
  - Update all fetch calls to construct full URLs using API_BASE_URL
  - _Requirements: 2.5, 2.6, 3.1, 3.2, 4.1_

- [ ]* 7. Write integration tests for frontend modules
  - Verify banner.js imports API_BASE_URL from config.js
  - Verify events.js imports API_BASE_URL from config.js
  - Verify dashboard.js imports API_BASE_URL from config.js
  - Verify login.js imports API_BASE_URL from config.js
  - Verify registration.js imports API_BASE_URL from config.js
  - Verify old hardcoded URLs are removed from banner.js and events.js
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8. Checkpoint - Verify module integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update HTML files to support ES6 modules
  - Identify all HTML files that load the updated JavaScript modules
  - Add type="module" attribute to script tags loading banner.js
  - Add type="module" attribute to script tags loading events.js
  - Add type="module" attribute to script tags loading dashboard.js
  - Add type="module" attribute to script tags loading login.js
  - Add type="module" attribute to script tags loading registration.js
  - _Requirements: 3.3, 3.4_

- [x] 10. Final checkpoint - Verify complete integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses JavaScript ES6 modules as specified in the design
- Property tests should use a JavaScript property-based testing library (e.g., fast-check)
- All URL construction should follow the pattern: `${API_BASE_URL}/endpoint`
- The config.js file location is frontend/js/config.js for easy discoverability
