/**
 * bmsService.js - BMS Core Service (Business Logic Layer)
 * 
 * This file implements the main business logic for the Bike Management System (BMS).
 * It provides methods to interact with bikes, docks, and state transitions in the database.
 * 
 * Methods:
 * - logStateTransition(eventType, entityId, entityType, fromState, toState, userId, metadata):
 *     Logs a state change event for a bike or dock, storing event details and metadata.
 * 
 * - getBikeById(bikeId):
 *     Retrieves a bike's data by its ID.
 * 
 * - getDockByDockId(dockId):
 *     Retrieves a dock's data by its dock identifier.
 * 
 * - isDockInService(dockId):
 *     Checks if a dock is currently in service and available for operations.
 * 
 * - updateBikeStatus(bikeId, newStatus, userId, metadata):
 *     Updates a bike's status and logs the state transition event.
 * 
 * - getStateTransitions(filters):
 *     Retrieves state transition events, optionally filtered by event type, bike ID, user ID, and limit.
 */

const { BMS_STATES } = require('../config/constants');
const { generateEventId } = require('../utils/helpers');

class BMSService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Log state transition with event ID (R-BMS-04)
     * @param {string} eventType - Type of event
     * @param {number} entityId - ID of entity (bike/dock)
     * @param {string} entityType - Type of entity (bike/dock)
     * @param {string} fromState - Previous state
     * @param {string} toState - New state
     * @param {number} userId - User ID (optional)
     * @param {Object} metadata - Additional data (optional)
     * @returns {Promise<string>} Event ID
     */
    async logStateTransition(eventType, entityId, entityType, fromState, toState, userId = null, metadata = null) {
        const eventId = generateEventId();
        
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO state_transitions 
                (event_id, ${entityType}_id, user_id, from_state, to_state, event_type, metadata) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [eventId, entityId, userId, fromState, toState, eventType, JSON.stringify(metadata)], 
                function(err) {
                    if (err) {
                        console.error('State transition logging failed:', err.message);
                        reject(err);
                    } else {
                        console.log(`State transition logged: ${eventId} - ${fromState} → ${toState}`);
                        resolve(eventId);
                    }
                }
            );
        });
    }

    /**
     * Get bike by ID with current status
     * @param {number} bikeId - Bike ID
     * @returns {Promise<Object>} Bike data
     */
    async getBikeById(bikeId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM bikes WHERE id = ?`,
                [bikeId],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });
    }

    /**
     * Get dock by dock_id with service status
     * @param {string} dockId - Dock identifier
     * @returns {Promise<Object>} Dock data
     */
    async getDockByDockId(dockId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM docks WHERE dock_id = ?`,
                [dockId],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });
    }

    /**
     * Check if dock is available for operations (R-BMS-05)
     * @param {string} dockId - Dock identifier
     * @returns {Promise<boolean>} True if dock is in service
     */
    async isDockInService(dockId) {
        if (!dockId) return true; // No dock specified, assume OK
        
        const dock = await this.getDockByDockId(dockId);
        return dock ? dock.status === BMS_STATES.DOCK.IN_SERVICE : true;
    }

    /**
     * Update bike status with state logging
     * @param {number} bikeId - Bike ID
     * @param {string} newStatus - New bike status
     * @param {number} userId - User performing action
     * @param {Object} metadata - Additional context
     * @returns {Promise<string>} Event ID
     */
    async updateBikeStatus(bikeId, newStatus, userId = null, metadata = null) {
        const currentBike = await this.getBikeById(bikeId);
        
        if (!currentBike) {
            throw new Error('Bike not found');
        }

        // Update bike status
        await new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE bikes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [newStatus, bikeId],
                (err) => err ? reject(err) : resolve()
            );
        });

        // Log state transition
        return await this.logStateTransition(
            'BIKE_STATUS_CHANGED',
            bikeId,
            'bike',
            currentBike.status,
            newStatus,
            userId,
            metadata
        );
    }

    /**
     * Get all state transitions with optional filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Array of state transitions
     */
    async getStateTransitions(filters = {}) {
        const { limit = 50, event_type, bike_id, user_id } = filters;
        
        let query = `
            SELECT st.*, u.username, b.bike_id as bike_identifier
            FROM state_transitions st
            LEFT JOIN users u ON st.user_id = u.id
            LEFT JOIN bikes b ON st.bike_id = b.id
            WHERE 1=1
        `;
        const params = [];
        
        if (event_type) {
            query += ` AND st.event_type = ?`;
            params.push(event_type);
        }
        
        if (bike_id) {
            query += ` AND st.bike_id = ?`;
            params.push(bike_id);
        }
        
        if (user_id) {
            query += ` AND st.user_id = ?`;
            params.push(user_id);
        }
        
        query += ` ORDER BY st.timestamp DESC LIMIT ?`;
        params.push(parseInt(limit));
        
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                err ? reject(err) : resolve(rows);
            });
        });
    }
}

module.exports = BMSService;