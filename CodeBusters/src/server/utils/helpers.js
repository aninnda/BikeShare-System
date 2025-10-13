/**
 * Utility functions for server-side operations in the bike reservation system.
 * 
 * Includes:
 * - Unique event ID generation for state transitions
 * - Date manipulation helpers (add minutes, check expiry)
 * - Promisification of callback-based database queries
 * - Request body validation for required fields
 * - Standardized API response formatting
 * 
 * All functions are pure and stateless, designed for reuse across server modules.
 */

/**
 * Generate unique event ID for state transitions
 * @returns {string} Unique event identifier
 */
function generateEventId() {
    return 'EVT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Add minutes to a date object
 * @param {Date} date - Base date
 * @param {number} minutes - Minutes to add
 * @returns {Date} New date with minutes added
 */
function addMinutesToDate(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

/**
 * Check if a reservation has expired
 * @param {string} expiresAt - ISO string of expiry time
 * @returns {boolean} True if expired
 */
function isReservationExpired(expiresAt) {
    return new Date() > new Date(expiresAt);
}

/**
 * Convert database callback to Promise
 * Learning: Modern async pattern for better error handling
 * @param {Function} dbOperation - Database operation function
 * @returns {Promise} Promise wrapper around database operation
 */
function promiseQuery(dbOperation) {
    return new Promise((resolve, reject) => {
        dbOperation((err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} { isValid: boolean, missing: Array }
 */
function validateRequiredFields(body, requiredFields) {
    const missing = requiredFields.filter(field => !body[field]);
    return {
        isValid: missing.length === 0,
        missing
    };
}

/**
 * Create standardized API response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {Object} data - Additional data
 * @returns {Object} Standardized response object
 */
function createApiResponse(success, message, data = null) {
    const response = { success, message };
    if (data) {
        Object.assign(response, data);
    }
    return response;
}

module.exports = {
    generateEventId,
    addMinutesToDate,
    isReservationExpired,
    promiseQuery,
    validateRequiredFields,
    createApiResponse
};