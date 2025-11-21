/**
 * Flex Dollars Service
 * Manages flex dollars rewards and usage for riders
 * 
 * Business Rules:
 * - Riders receive flex dollars when returning a bike to a station below 25% capacity
 * - Flex dollars do not expire
 * - Flex dollars are automatically applied to trips and reservations
 * - Each transaction is tracked for audit purposes
 */

const { FLEX_DOLLARS_CONFIG } = require('../../config/constants');

class FlexDollarsService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Award flex dollars to a rider for returning a bike to an understocked station
     * Business Rule: Return bike to station below 25% capacity → award flex dollars
     */
    awardFlexDollars(userId, amount, description = '', relatedRentalId = null, relatedStationId = null) {
        return new Promise((resolve, reject) => {
            // First, get current balance
            this.db.get(
                'SELECT flex_dollars FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        console.error('Error retrieving user flex dollars balance:', err);
                        return reject(err);
                    }

                    if (!row) {
                        return reject(new Error(`User ${userId} not found`));
                    }

                    const currentBalance = row.flex_dollars || 0;
                    const newBalance = currentBalance + amount;

                    // Update user balance
                    this.db.run(
                        'UPDATE users SET flex_dollars = ? WHERE id = ?',
                        [newBalance, userId],
                        (err) => {
                            if (err) {
                                console.error('Error updating user flex dollars:', err);
                                return reject(err);
                            }

                            // Record transaction
                            this.db.run(
                                `INSERT INTO flex_dollars_transactions 
                                (user_id, amount, transaction_type, description, related_rental_id, related_station_id, balance_after) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [userId, amount, FLEX_DOLLARS_CONFIG.TRANSACTION_TYPE.AWARD, description, relatedRentalId, relatedStationId, newBalance],
                                (err) => {
                                    if (err) {
                                        console.error('Error recording flex dollars transaction:', err);
                                        return reject(err);
                                    }

                                    console.log(`Flex dollars awarded: User ${userId} received $${amount.toFixed(2)} for ${description}`);
                                    resolve({
                                        success: true,
                                        userId,
                                        amount,
                                        newBalance,
                                        description
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    }

    /**
     * Deduct flex dollars from a rider's account for trip/reservation expenses
     * Business Rule: Automatically apply flex dollars to next trip or reservation
     */
    deductFlexDollars(userId, amount, description = '', relatedRentalId = null) {
        return new Promise((resolve, reject) => {
            // Get current balance
            this.db.get(
                'SELECT flex_dollars FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        console.error('Error retrieving user flex dollars balance:', err);
                        return reject(err);
                    }

                    if (!row) {
                        return reject(new Error(`User ${userId} not found`));
                    }

                    const currentBalance = Number(row.flex_dollars) || 0;
                    const requestedAmount = Number(amount) || 0;
                    const deductionAmount = Math.min(currentBalance, requestedAmount);
                    const newBalance = Math.max(0, currentBalance - deductionAmount);

                    // Debug logging to help trace why deduction may be zero
                    console.log(`[FlexDollarsService] deductFlexDollars called for user=${userId} requestedAmount=${requestedAmount.toFixed(2)} currentBalance=${currentBalance.toFixed(2)} deductionAmount=${deductionAmount.toFixed(2)} newBalance=${newBalance.toFixed(2)}`);

                    // Update user balance
                    this.db.run(
                        'UPDATE users SET flex_dollars = ? WHERE id = ?',
                        [newBalance, userId],
                        (err) => {
                            if (err) {
                                console.error('Error updating user flex dollars:', err);
                                return reject(err);
                            }

                            // Record transaction
                            this.db.run(
                                `INSERT INTO flex_dollars_transactions 
                                (user_id, amount, transaction_type, description, related_rental_id, balance_after) 
                                VALUES (?, ?, ?, ?, ?, ?)`,
                                [userId, -deductionAmount, FLEX_DOLLARS_CONFIG.TRANSACTION_TYPE.DEDUCT, description, relatedRentalId, newBalance],
                                (err) => {
                                    if (err) {
                                        console.error('Error recording flex dollars transaction:', err);
                                        return reject(err);
                                    }

                                    const remainingBalance = Math.max(0, requestedAmount - deductionAmount);

                                    console.log(`[FlexDollarsService] deduction recorded user=${userId} amountDeducted=${deductionAmount.toFixed(2)} remainingBalance=${remainingBalance.toFixed(2)} balanceAfter=${newBalance.toFixed(2)} description="${description}" relatedRentalId=${relatedRentalId}`);
                                    resolve({
                                        success: true,
                                        userId,
                                        amountRequested: requestedAmount,
                                        amountDeducted: deductionAmount,
                                        remainingBalance: remainingBalance,
                                        newBalance,
                                        description
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    }

    /**
     * Refund flex dollars (e.g., when a trip is cancelled)
     */
    refundFlexDollars(userId, amount, description = '', relatedRentalId = null) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT flex_dollars FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        console.error('Error retrieving user flex dollars balance:', err);
                        return reject(err);
                    }

                    if (!row) {
                        return reject(new Error(`User ${userId} not found`));
                    }

                    const currentBalance = row.flex_dollars || 0;
                    const newBalance = currentBalance + amount;

                    this.db.run(
                        'UPDATE users SET flex_dollars = ? WHERE id = ?',
                        [newBalance, userId],
                        (err) => {
                            if (err) {
                                console.error('Error updating user flex dollars:', err);
                                return reject(err);
                            }

                            this.db.run(
                                `INSERT INTO flex_dollars_transactions 
                                (user_id, amount, transaction_type, description, related_rental_id, balance_after) 
                                VALUES (?, ?, ?, ?, ?, ?)`,
                                [userId, amount, FLEX_DOLLARS_CONFIG.TRANSACTION_TYPE.REFUND, description, relatedRentalId, newBalance],
                                (err) => {
                                    if (err) {
                                        console.error('Error recording flex dollars refund:', err);
                                        return reject(err);
                                    }

                                    console.log(`Flex dollars refunded: User ${userId} received refund of $${amount.toFixed(2)} for ${description}`);
                                    resolve({
                                        success: true,
                                        userId,
                                        amount,
                                        newBalance,
                                        description
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    }

    /**
     * Get current flex dollars balance for a rider
     */
    getBalance(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, username, flex_dollars FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        return reject(err);
                    }

                    if (!row) {
                        return reject(new Error(`User ${userId} not found`));
                    }

                    resolve({
                        userId: row.id,
                        username: row.username,
                        balance: row.flex_dollars || 0
                    });
                }
            );
        });
    }

    /**
     * Get transaction history for a rider
     */
    getTransactionHistory(userId, limit = 50, offset = 0) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM flex_dollars_transactions 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?`,
                [userId, limit, offset],
                (err, rows) => {
                    if (err) {
                        return reject(err);
                    }

                    const transactions = rows || [];

                    // Get total count
                    this.db.get(
                        'SELECT COUNT(*) as count FROM flex_dollars_transactions WHERE user_id = ?',
                        [userId],
                        (err, countRow) => {
                            if (err) {
                                return reject(err);
                            }

                            resolve({
                                userId,
                                transactions: transactions.map(t => ({
                                    id: t.id,
                                    amount: t.amount,
                                    type: t.transaction_type,
                                    description: t.description,
                                    relatedRentalId: t.related_rental_id,
                                    relatedStationId: t.related_station_id,
                                    balanceAfter: t.balance_after,
                                    createdAt: t.created_at
                                })),
                                totalCount: countRow.count,
                                limit,
                                offset
                            });
                        }
                    );
                }
            );
        });
    }

    /**
     * Check if a station is below minimum occupancy threshold
     * Business Rule: < 25% capacity = eligible for flex dollars reward
     */
    isBelowMinimumOccupancy(occupiedDocks, totalCapacity) {
        if (totalCapacity === 0) return false;
        const occupancyPercent = occupiedDocks / totalCapacity;
        return occupancyPercent < FLEX_DOLLARS_CONFIG.MINIMUM_OCCUPANCY_PERCENT;
    }

    /**
     * Get flex dollars reward amount
     */
    getRewardAmount() {
        return FLEX_DOLLARS_CONFIG.REWARD_AMOUNT;
    }
}

module.exports = FlexDollarsService;
