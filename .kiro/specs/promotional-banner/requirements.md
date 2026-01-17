# Requirements Document

## Introduction

This document defines the requirements for a promotional banner/popup system for the AECAS website. The system enables administrators to create, manage, and display promotional banners that appear as overlays when users visit the website. Banners can promote events, announcements, or other content with configurable display settings, redirect URLs, and analytics tracking.

## Glossary

- **Banner**: A promotional overlay/modal that displays content to website visitors
- **Admin_Panel**: The administrative interface where authorized users manage banners
- **Display_Duration**: The time in seconds a banner remains visible before auto-closing
- **Session**: A single browser session from when a user opens the website until they close it
- **Click_Through**: When a user clicks on a banner to navigate to the redirect URL
- **Banner_Manager**: The backend service responsible for banner CRUD operations and retrieval
- **Banner_Display_Controller**: The frontend component that handles banner rendering and user interactions

## Requirements

### Requirement 1: Banner Creation

**User Story:** As an admin, I want to create promotional banners, so that I can promote events and announcements to website visitors.

#### Acceptance Criteria

1. WHEN an admin submits a new banner with title, description, and redirect URL, THE Banner_Manager SHALL create a new banner record in Firebase
2. WHEN an admin provides an image URL for a banner, THE Banner_Manager SHALL store the image URL with the banner data
3. WHEN an admin does not provide required fields (title), THE Banner_Manager SHALL reject the creation and return a validation error
4. THE Banner_Manager SHALL store the creation timestamp and creator username with each banner

### Requirement 2: Banner Scheduling

**User Story:** As an admin, I want to set start and end dates for banners, so that promotions display only during relevant time periods.

#### Acceptance Criteria

1. WHEN an admin sets a start date for a banner, THE Banner_Manager SHALL not display the banner before that date
2. WHEN an admin sets an end date for a banner, THE Banner_Manager SHALL not display the banner after that date
3. WHEN the current date is between start and end dates, THE Banner_Display_Controller SHALL consider the banner eligible for display
4. IF a banner has no start date, THEN THE Banner_Manager SHALL treat it as immediately active
5. IF a banner has no end date, THEN THE Banner_Manager SHALL treat it as indefinitely active

### Requirement 3: Banner Display Configuration

**User Story:** As an admin, I want to configure how banners display, so that I can control the user experience.

#### Acceptance Criteria

1. WHEN an admin sets a display duration, THE Banner_Display_Controller SHALL auto-close the banner after that duration in seconds
2. WHEN an admin sets display frequency to "once per session", THE Banner_Display_Controller SHALL show the banner only once per browser session
3. WHEN an admin sets display frequency to "every visit", THE Banner_Display_Controller SHALL show the banner on each page load
4. THE Banner_Display_Controller SHALL default to 10 seconds display duration if not specified
5. THE Banner_Display_Controller SHALL default to "once per session" if display frequency is not specified

### Requirement 4: Banner Management

**User Story:** As an admin, I want to edit and delete banners, so that I can keep promotional content current.

#### Acceptance Criteria

1. WHEN an admin updates banner content, THE Banner_Manager SHALL persist the changes and record the update timestamp
2. WHEN an admin deletes a banner, THE Banner_Manager SHALL remove the banner from Firebase
3. WHEN an admin toggles banner active status, THE Banner_Manager SHALL update the active flag accordingly
4. THE Admin_Panel SHALL display all banners with their current status and configuration

### Requirement 5: Banner Display

**User Story:** As a website visitor, I want to see promotional banners, so that I can learn about events and announcements.

#### Acceptance Criteria

1. WHEN a user visits the website, THE Banner_Display_Controller SHALL check for active banners eligible for display
2. WHEN an eligible banner exists, THE Banner_Display_Controller SHALL render it as a centered modal overlay
3. WHEN a user clicks the banner content area, THE Banner_Display_Controller SHALL redirect to the configured URL
4. WHEN a user clicks the close button, THE Banner_Display_Controller SHALL hide the banner immediately
5. THE Banner_Display_Controller SHALL display banner title, description, and image (if provided)

### Requirement 6: Banner Retrieval

**User Story:** As a system component, I want to retrieve active banners, so that the frontend can display them to users.

#### Acceptance Criteria

1. WHEN the frontend requests active banners, THE Banner_Manager SHALL return only banners where active is true
2. WHEN the frontend requests active banners, THE Banner_Manager SHALL filter out banners outside their scheduled date range
3. THE Banner_Manager SHALL return banners ordered by creation date (newest first)
4. THE Banner_Manager SHALL provide a public endpoint that does not require authentication

### Requirement 7: Click Analytics (Optional)

**User Story:** As an admin, I want to track banner click-through rates, so that I can measure promotional effectiveness.

#### Acceptance Criteria

1. WHEN a user clicks on a banner, THE Banner_Display_Controller SHALL send a click event to the backend
2. WHEN a click event is received, THE Banner_Manager SHALL increment the click count for that banner
3. THE Admin_Panel SHALL display click count and impression count for each banner
4. WHEN a banner is displayed to a user, THE Banner_Display_Controller SHALL send an impression event to the backend

### Requirement 8: Banner Data Persistence

**User Story:** As a system administrator, I want banner data stored reliably, so that promotional content is not lost.

#### Acceptance Criteria

1. THE Banner_Manager SHALL store all banner data in the Firebase 'banners' collection
2. THE Banner_Manager SHALL serialize banner objects to JSON for storage
3. WHEN retrieving banners, THE Banner_Manager SHALL deserialize JSON data back to banner objects
4. FOR ALL valid banner objects, serializing then deserializing SHALL produce an equivalent object (round-trip property)
