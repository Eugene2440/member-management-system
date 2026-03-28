# Requirements Document

## Introduction

The AECAS frontend application currently has hardcoded backend API URLs scattered across multiple JavaScript files (banner.js and events.js). When the backend URL changed from `https://member-management-system-e52u.onrender.com` to `https://aecas.onrender.com`, this caused CORS errors because the old URL remained hardcoded in the frontend files. This feature introduces a centralized API configuration system that defines the backend base URL in one location, making future URL updates simple and preventing similar issues.

## Glossary

- **API_Config**: A centralized configuration module that exports the backend API base URL
- **Frontend_Module**: Any JavaScript file in the frontend that makes API calls (banner.js, dashboard.js, events.js, login.js, registration.js)
- **Base_URL**: The root URL of the backend API server (e.g., https://aecas.onrender.com)
- **Environment_Detection**: Logic that determines whether the application is running locally or in production
- **CORS_Error**: Cross-Origin Resource Sharing error that occurs when frontend tries to access a backend at a different origin than configured

## Requirements

### Requirement 1: Centralized Configuration Module

**User Story:** As a developer, I want a single configuration file that defines the backend API URL, so that I can update it in one place when the backend URL changes.

#### Acceptance Criteria

1. THE API_Config SHALL export a constant named API_BASE_URL that contains the backend base URL
2. WHEN the application runs on localhost, THE API_Config SHALL set API_BASE_URL to 'http://localhost:3000/api'
3. WHEN the application runs in production, THE API_Config SHALL set API_BASE_URL to 'https://aecas.onrender.com/api'
4. THE API_Config SHALL use window.location.hostname for environment detection
5. THE API_Config SHALL be implemented as a standalone JavaScript file that can be imported by other modules

### Requirement 2: Frontend Module Integration

**User Story:** As a developer, I want all frontend modules to use the centralized API configuration, so that API calls consistently point to the correct backend URL.

#### Acceptance Criteria

1. THE Frontend_Module banner.js SHALL import and use API_BASE_URL from API_Config instead of its hardcoded BANNER_API_URL
2. THE Frontend_Module events.js SHALL import and use API_BASE_URL from API_Config instead of its hardcoded API_URL
3. THE Frontend_Module dashboard.js SHALL import and use API_BASE_URL from API_Config for all API calls
4. THE Frontend_Module login.js SHALL import and use API_BASE_URL from API_Config for all API calls
5. THE Frontend_Module registration.js SHALL import and use API_BASE_URL from API_Config for all API calls
6. WHEN a Frontend_Module makes an API call, THE Frontend_Module SHALL construct the full URL using API_BASE_URL as the base

### Requirement 3: Backward Compatibility

**User Story:** As a developer, I want the centralized configuration to work with existing code patterns, so that minimal changes are required to integrate it.

#### Acceptance Criteria

1. THE API_Config SHALL maintain the same URL structure as existing hardcoded URLs (including the /api path)
2. WHEN Frontend_Modules construct API endpoints, THE Frontend_Modules SHALL append endpoint paths to API_BASE_URL (e.g., `${API_BASE_URL}/banners/active`)
3. THE API_Config SHALL support both relative and absolute URL patterns used in existing code
4. WHEN the centralized configuration is implemented, THE application SHALL function identically to before the change

### Requirement 4: Easy Maintenance

**User Story:** As a developer, I want to update the backend URL by changing only one file, so that I can quickly respond to infrastructure changes without searching through multiple files.

#### Acceptance Criteria

1. WHEN the backend URL changes, THE developer SHALL only need to modify the production URL in API_Config
2. THE API_Config SHALL include comments documenting how to update the backend URL
3. THE API_Config SHALL be located in a predictable location (frontend/js/config.js)
4. WHEN reviewing the codebase, THE API_Config file SHALL be easily discoverable by developers

### Requirement 5: Environment-Specific Configuration

**User Story:** As a developer, I want the application to automatically use the correct backend URL based on the environment, so that I don't need to manually switch configurations when testing locally versus deploying to production.

#### Acceptance Criteria

1. WHEN window.location.hostname equals 'localhost' or '127.0.0.1', THE API_Config SHALL use the local development URL
2. WHEN window.location.hostname is any other value, THE API_Config SHALL use the production URL
3. THE Environment_Detection logic SHALL execute at module load time
4. THE API_Config SHALL not require manual configuration changes when deploying between environments
