/**
 * Centralized API Configuration Module
 * 
 * This module provides a single source of truth for the backend API base URL.
 * It automatically detects the environment (local vs production) and exports
 * the appropriate API base URL.
 * 
 * Usage:
 *   import { API_BASE_URL } from './config.js';
 *   fetch(`${API_BASE_URL}/endpoint`);
 * 
 * To update the backend URL:
 *   - For production: Update the production URL constant below
 *   - For local development: Update the local URL constant below
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3
 */

// Environment detection using window.location.hostname
// Requirements: 1.4, 5.3
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

// API base URL constants
// Requirements: 1.2, 1.3
const LOCAL_API_URL = 'http://localhost:3000/api';
const PRODUCTION_API_URL = 'https://aecas.onrender.com/api';

/**
 * API_BASE_URL - The backend API base URL
 * 
 * This constant is automatically set based on the current environment:
 * - Local development (localhost/127.0.0.1): http://localhost:3000/api
 * - Production (any other hostname): https://aecas.onrender.com/api
 * 
 * All frontend modules should import and use this constant for API calls.
 * 
 * Requirements: 1.1, 1.5, 5.1, 5.2
 */
export const API_BASE_URL = isLocalhost ? LOCAL_API_URL : PRODUCTION_API_URL;
