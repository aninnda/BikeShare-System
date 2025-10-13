/**
 * Reservation Service - Handles all reservation logic for bike reservations.
 * 
 * This service provides methods to:
 * - Expire old reservations automatically (`expireOldReservations`, `expireReservation`)
 * - Check if a user has an active reservation (`getUserActiveReservation`)
 * - Create a new reservation for a bike (`createReservation`)
 * - Complete a reservation when a bike is returned (`completeReservation`)
 * - Retrieve a user's reservation with bike details (`getUserReservationWithBike`)
 * 
 * Each method ensures business rules are enforced, such as:
 * - Only one active reservation per user
 * - Bikes can only be reserved if available and dock is in service
 * - Reservations expire after a set time and update bike status accordingly
 * - Completing a reservation updates both reservation and bike status, and logs the event
 * 
 * Learning: Single Responsibility Principle - one class, one purpose.
 */

const { BMS_STATES, DEFAULT_EXPIRY_MINUTES } = require('../config/constants');
const { addMinutesToDate, isReservationExpired } = require('../utils/helpers');
const fs = require('fs');

class ReservationService {
    constructor(db, bmsService) {
        this.db = db;
        this.bmsService = bmsService;
    }

    /**
     * R-BMS-03: Expire old reservations based on expiresAfterMinutes
     * @returns {Promise<number>} Number of expired reservations
     */
    async expireOldReservations() {
        let totalExpired = 0;
        
        // First, check database reservations
        const now = new Date().toISOString();
        const expiredReservations = await new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM reservations WHERE status = 'active' AND expires_at < ?`,
                [now],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });
        
        // Process database expired reservations
        for (let reservation of expiredReservations) {
            try {
                await this.expireReservation(reservation);
                totalExpired++;
            } catch (error) {
                console.error('Error expiring database reservation:', error);
            }
        }
        
        // Also check configuration file for expired reservations
        totalExpired += await this.expireConfigFileReservations();
        
        return totalExpired;
    }

    /**
     * Check and expire reservations stored in configuration file
     * @returns {Promise<number>} Number of expired reservations from config
     */
    async expireConfigFileReservations() {
        try {
            const configPath = './config/stations-config.json';
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const now = new Date();
            let expiredCount = 0;
            
            // Check each station for expired reservations
            for (let station of config.stations) {
                if (station.bikes) {
                    for (let bike of station.bikes) {
                        if (bike.status === 'reserved' && bike.reservationExpiry) {
                            const expiryTime = new Date(bike.reservationExpiry);
                            if (expiryTime <= now) {
                                // This reservation has expired, clean it up
                                console.log(`⏰ Expiring reservation for bike ${bike.id} (expired at ${bike.reservationExpiry})`);
                                delete bike.reservedBy;
                                delete bike.reservedAt;
                                delete bike.reservationExpiry;
                                bike.status = 'available';
                                expiredCount++;
                            }
                        }
                    }
                }
            }
            
            // Save updated configuration if any changes were made
            if (expiredCount > 0) {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log(`✅ Expired ${expiredCount} reservations from configuration file`);
            }
            
            return expiredCount;
        } catch (error) {
            console.error('Error checking config file for expired reservations:', error);
            return 0;
        }
    }

    /**
     * Expire a single reservation
     * @param {Object} reservation - Reservation to expire
     */
    async expireReservation(reservation) {
        // Update reservation status
        await new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE reservations SET status = 'expired' WHERE id = ?`,
                [reservation.id],
                (err) => err ? reject(err) : resolve()
            );
        });
        
        // Update bike status back to available
        await this.bmsService.updateBikeStatus(
            reservation.bike_id,
            BMS_STATES.BIKE.AVAILABLE,
            reservation.user_id,
            { 
                reservation_id: reservation.id, 
                expired_at: new Date().toISOString(),
                reason: 'Reservation expired automatically'
            }
        );

        // Also update the stations configuration file to clear the reservation
        try {
            const configPath = './config/stations-config.json';
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // Find the bike and clear its reservation
            for (let station of config.stations) {
                for (let bike of station.bikes) {
                    if (bike.id === reservation.bike_id) {
                        delete bike.reservedBy;
                        delete bike.reservedAt;
                        delete bike.reservationExpiry;
                        bike.status = 'available';
                        break;
                    }
                }
            }
            
            // Save the updated configuration
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`Cleared expired reservation for bike ${reservation.bike_id} from stations config`);
        } catch (error) {
            console.error('Error updating stations config after expiry:', error);
        }
    }

    /**
     * Check if user has an active reservation (R-BMS-06)
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Active reservation or null
     */
    async getUserActiveReservation(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM reservations WHERE user_id = ? AND status = 'active'`,
                [userId],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });
    }

    /**
     * Create a new bike reservation (R-BMS-06)
     * @param {number} bikeId - Bike to reserve
     * @param {number} userId - User making reservation
     * @param {number} expiresAfterMinutes - Expiry time in minutes
     * @returns {Promise<Object>} Reservation details
     */
    async createReservation(bikeId, userId, expiresAfterMinutes = DEFAULT_EXPIRY_MINUTES) {
        // Clean up expired reservations first
        await this.expireOldReservations();
        
        // R-BMS-06: Check if user already has an active reservation
        const existingReservation = await this.getUserActiveReservation(userId);
        if (existingReservation) {
            throw new Error('User already has an active reservation. Only one bike can be reserved at a time.');
        }
        
        // Get bike details and validate
        const bike = await this.bmsService.getBikeById(bikeId);
        if (!bike) {
            throw new Error('Bike not found');
        }
        
        if (bike.status !== BMS_STATES.BIKE.AVAILABLE) {
            throw new Error(`Bike is not available for reservation. Current status: ${bike.status}`);
        }
        
        // R-BMS-05: Check if dock is in service
        const isDockAvailable = await this.bmsService.isDockInService(bike.location);
        if (!isDockAvailable) {
            throw new Error('Cannot reserve bike from an out-of-service dock');
        }
        
        // Calculate expiry time
        const now = new Date();
        const expiresAt = addMinutesToDate(now, expiresAfterMinutes);
        
        // Create reservation
        const reservationId = await new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO reservations 
                 (user_id, bike_id, dock_id, expires_at, expires_after_minutes) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, bikeId, bike.location, expiresAt.toISOString(), expiresAfterMinutes],
                function(err) {
                    err ? reject(err) : resolve(this.lastID);
                }
            );
        });
        
        // Update bike status to reserved
        const eventId = await this.bmsService.updateBikeStatus(
            bikeId,
            BMS_STATES.BIKE.RESERVED,
            userId,
            { 
                reservation_id: reservationId, 
                expires_at: expiresAt.toISOString(),
                expires_after_minutes: expiresAfterMinutes 
            }
        );
        
        return {
            id: reservationId,
            bike_id: bikeId,
            user_id: userId,
            expires_at: expiresAt.toISOString(),
            expires_after_minutes: expiresAfterMinutes,
            event_id: eventId
        };
    }

    /**
     * Complete a bike reservation (return bike)
     * @param {number} bikeId - Bike to return
     * @param {number} userId - User returning bike
     * @param {string} dockId - Dock where bike is returned (optional)
     * @returns {Promise<Object>} Return details
     */
    async completeReservation(bikeId, userId, dockId = null) {
        // Find active reservation
        const reservation = await new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM reservations 
                 WHERE bike_id = ? AND user_id = ? AND status = 'active'`,
                [bikeId, userId],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });
        
        if (!reservation) {
            throw new Error('No active reservation found. Bike can only be returned if it was reserved by you.');
        }
        
        // R-BMS-05: Check if return dock is in service
        const returnDock = dockId || reservation.dock_id;
        const isDockAvailable = await this.bmsService.isDockInService(returnDock);
        if (!isDockAvailable) {
            throw new Error('Cannot return bike to an out-of-service dock');
        }
        
        // Complete the reservation
        await new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE reservations SET status = 'completed' WHERE id = ?`,
                [reservation.id],
                (err) => err ? reject(err) : resolve()
            );
        });
        
        // Update bike status and location
        await new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE bikes SET status = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [BMS_STATES.BIKE.AVAILABLE, returnDock, bikeId],
                (err) => err ? reject(err) : resolve()
            );
        });
        
        // Log state transition
        const eventId = await this.bmsService.logStateTransition(
            'BIKE_RETURNED',
            bikeId,
            'bike',
            BMS_STATES.BIKE.RESERVED,
            BMS_STATES.BIKE.AVAILABLE,
            userId,
            { 
                reservation_id: reservation.id, 
                return_dock: returnDock,
                reservation_duration_minutes: Math.round((new Date() - new Date(reservation.reserved_at)) / 60000)
            }
        );
        
        return {
            bike_id: bikeId,
            user_id: userId,
            return_dock: returnDock,
            event_id: eventId,
            reservation_completed: reservation.id
        };
    }

    /**
     * Get reservation with bike details
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Reservation with bike details
     */
    async getUserReservationWithBike(userId) {
        await this.expireOldReservations(); // Clean up first
        
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT r.*, b.bike_id, b.model, b.location, b.battery_level
                FROM reservations r
                JOIN bikes b ON r.bike_id = b.id
                WHERE r.user_id = ? AND r.status = 'active'
            `, [userId], (err, row) => err ? reject(err) : resolve(row));
        });
    }
}

module.exports = ReservationService;