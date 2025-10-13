/**
 * reservations.js
 * 
 * This file defines API endpoints for managing bike reservations and returns in the system.
 * It uses the RSCH (Route-Service-Controller-Helper) method, which separates concerns by:
 * - Defining clean routes for HTTP requests (Route)
 * - Delegating business logic to service modules (Service)
 * - Handling request/response logic in route handlers (Controller)
 * - Using helper functions for validation and response formatting (Helper)
 * 
 * This approach improves maintainability, readability, and testability by keeping routing, business logic, and utilities distinct.
 */

const express = require('express');
const { HTTP_STATUS, DEFAULT_EXPIRY_MINUTES } = require('../config/constants');
const { validateRequiredFields, createApiResponse } = require('../utils/helpers');

function createReservationRoutes(reservationService, bmsService) {
    const router = express.Router();

    /**
     * R-BMS-06: Reserve bike (only if no other bike is reserved)
     * POST /api/bikes/:bikeId/reserve
     */
    router.post('/bikes/:bikeId/reserve', async (req, res) => {
        const { bikeId } = req.params;
        const { userId, expiresAfterMinutes = DEFAULT_EXPIRY_MINUTES } = req.body;
        
        // Validate required fields
        const validation = validateRequiredFields(req.body, ['userId']);
        if (!validation.isValid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                createApiResponse(false, `Missing required fields: ${validation.missing.join(', ')}`)
            );
        }
        
        try {
            const reservation = await reservationService.createReservation(
                parseInt(bikeId), 
                parseInt(userId), 
                parseInt(expiresAfterMinutes)
            );
            
            res.json(createApiResponse(
                true, 
                'Bike reserved successfully',
                { reservation }
            ));
            
        } catch (error) {
            console.error('Reservation error:', error.message);
            
            // Handle specific business rule violations
            if (error.message.includes('already has an active reservation')) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(
                    createApiResponse(false, error.message)
                );
            }
            
            if (error.message.includes('not available') || error.message.includes('out-of-service')) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(
                    createApiResponse(false, error.message)
                );
            }
            
            if (error.message.includes('not found')) {
                return res.status(HTTP_STATUS.NOT_FOUND).json(
                    createApiResponse(false, error.message)
                );
            }
            
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
                createApiResponse(false, 'Internal server error during reservation')
            );
        }
    });

    /**
     * R-BMS-06: Return bike (only available if bike is reserved)
     * POST /api/bikes/:bikeId/return
     */
    router.post('/bikes/:bikeId/return', async (req, res) => {
        const { bikeId } = req.params;
        const { userId, dockId } = req.body;
        
        // Validate required fields
        const validation = validateRequiredFields(req.body, ['userId']);
        if (!validation.isValid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                createApiResponse(false, `Missing required fields: ${validation.missing.join(', ')}`)
            );
        }
        
        try {
            const returnInfo = await reservationService.completeReservation(
                parseInt(bikeId),
                parseInt(userId),
                dockId
            );
            
            res.json(createApiResponse(
                true,
                'Bike returned successfully',
                { return_info: returnInfo }
            ));
            
        } catch (error) {
            console.error('Return error:', error.message);
            
            if (error.message.includes('No active reservation')) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(
                    createApiResponse(false, error.message)
                );
            }
            
            if (error.message.includes('out-of-service dock')) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(
                    createApiResponse(false, error.message)
                );
            }
            
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
                createApiResponse(false, 'Internal server error during bike return')
            );
        }
    });

    /**
     * Get user's current reservation status
     * GET /api/users/:userId/reservation
     */
    router.get('/users/:userId/reservation', async (req, res) => {
        const { userId } = req.params;
        
        try {
            const reservation = await reservationService.getUserReservationWithBike(parseInt(userId));
            
            res.json(createApiResponse(
                true,
                'Reservation status retrieved',
                {
                    hasActiveReservation: !!reservation,
                    reservation: reservation || null
                }
            ));
            
        } catch (error) {
            console.error('Error fetching reservation:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
                createApiResponse(false, 'Error fetching reservation status')
            );
        }
    });

    /**
     * Get state transition history
     * GET /api/transitions
     */
    router.get('/transitions', async (req, res) => {
        try {
            const transitions = await bmsService.getStateTransitions(req.query);
            
            res.json({
                transitions,
                count: transitions.length
            });
            
        } catch (error) {
            console.error('Error fetching transitions:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
                createApiResponse(false, 'Error fetching state transitions')
            );
        }
    });

    return router;
}

module.exports = createReservationRoutes;