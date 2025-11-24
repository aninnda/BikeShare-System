/**
 * Loyalty Service - Manages rider loyalty tier system
 * 
 * This service handles:
 * - Calculating rider loyalty tiers (Bronze, Silver, Gold)
 * - Checking tier eligibility based on specified criteria
 * - Managing tier upgrades and downgrades
 * - Tracking loyalty tier history
 * - Calculating tier benefits (discounts, reservation extensions)
 * 
 * Tier Requirements:
 * Bronze (BR):
 *   - BR-001: No missed reservations in last year
 *   - BR-002: All bikes returned successfully (assumed all are returned)
 *   - BR-003: Surpassed 10 trips in last year
 *   - BR-004: 5% discount
 * 
 * Silver (SL):
 *   - SL-001: Covers Bronze requirements
 *   - SL-002: At least 5 successful bike claims in last year
 *   - SL-003: 5+ trips per month for last 3 months
 *   - SL-004: 10% discount + 2 minute extension
 * 
 * Gold (GL):
 *   - GL-001: Covers Silver requirements
 *   - GL-002: 5+ trips per week for last 3 months
 *   - GL-003: 15% discount + 5 minute extension
 */

class LoyaltyService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Calculate a user's loyalty tier based on their activity history
     * @param {number} userId - The user ID
     * @returns {Promise<string>} The tier: 'entry', 'bronze', 'silver', 'gold'
     */
    async calculateUserTier(userId) {
        try {
            // Get user's current tier
            const user = await this.getUserData(userId);
            const currentTier = user?.loyalty_tier || 'entry';

            // Check all tier eligibility
            const isGoldEligible = await this.isGoldEligible(userId);
            const isSilverEligible = await this.isSilverEligible(userId);
            const isBronzeEligible = await this.isBronzeEligible(userId);

            // Determine tier (highest to lowest)
            let newTier = 'entry';
            if (isGoldEligible) {
                newTier = 'gold';
            } else if (isSilverEligible) {
                newTier = 'silver';
            } else if (isBronzeEligible) {
                newTier = 'bronze';
            }

            return newTier;
        } catch (error) {
            console.error('Error calculating user tier:', error);
            return 'entry';
        }
    }

    /**
     * Update user's tier and track history
     * @param {number} userId - The user ID
     * @param {string} newTier - The new tier
     * @returns {Promise<object>} Updated user data with tier change info
     */
    async updateUserTier(userId, newTier) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            
            // First get current tier
            this.db.get(
                'SELECT loyalty_tier FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    if (err) return reject(err);
                    
                    const oldTier = user?.loyalty_tier || 'entry';
                    
                    // Update user tier
                    this.db.run(
                        'UPDATE users SET loyalty_tier = ?, last_tier_check = ? WHERE id = ?',
                        [newTier, now, userId],
                        (updateErr) => {
                            if (updateErr) return reject(updateErr);
                            
                            // Record tier change in history (if tier changed)
                            if (oldTier !== newTier) {
                                const reason = this.getTierChangeReason(oldTier, newTier);
                                this.db.run(
                                    'INSERT INTO loyalty_history (user_id, old_tier, new_tier, reason) VALUES (?, ?, ?, ?)',
                                    [userId, oldTier, newTier, reason],
                                    (historyErr) => {
                                        if (historyErr) console.error('Error recording tier history:', historyErr);
                                        resolve({
                                            success: true,
                                            oldTier,
                                            newTier,
                                            tierChanged: true,
                                            reason
                                        });
                                    }
                                );
                            } else {
                                resolve({
                                    success: true,
                                    oldTier,
                                    newTier,
                                    tierChanged: false
                                });
                            }
                        }
                    );
                }
            );
        });
    }

    /**
     * Check if user is eligible for Bronze tier
     * BR-001: No missed reservations in last year
     * BR-002: All bikes returned (assumed true)
     * BR-003: Surpassed 10 trips in last year
     */
    async isBronzeEligible(userId) {
        try {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            // BR-001: Check for missed reservations (expired without claiming bike)
            const missedReservations = await this.countMissedReservations(userId, oneYearAgo);
            if (missedReservations > 0) {
                return false;
            }

            // BR-003: Check trip count
            const tripCount = await this.countTripsInPeriod(userId, oneYearAgo);
            if (tripCount < 10) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking Bronze eligibility:', error);
            return false;
        }
    }

    /**
     * Check if user is eligible for Silver tier
     * SL-001: Must cover Bronze requirements
     * SL-002: At least 5 successful bike claims in last year
     * SL-003: 5+ trips per month for last 3 months
     */
    async isSilverEligible(userId) {
        try {
            // SL-001: First check Bronze eligibility
            const isBronze = await this.isBronzeEligible(userId);
            if (!isBronze) {
                return false;
            }

            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            // SL-002: Check successful bike claims (reservations that were actually rented)
            const successfulClaims = await this.countSuccessfulBikeClaims(userId, oneYearAgo);
            if (successfulClaims < 5) {
                return false;
            }

            
            // SL-003: Check 5+ trips per month for last 3 months
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            const monthlyTripsValid = await this.checkMonthlyTrips(userId, threeMonthsAgo, 5);
            if (!monthlyTripsValid) {
                return false;
            }
            

            return true;
        } catch (error) {
            console.error('Error checking Silver eligibility:', error);
            return false;
        }
    }

    /**
     * Check if user is eligible for Gold tier
     * GL-001: Must cover Silver requirements
     * GL-002: 5+ trips per week for last 3 months
     */
    async isGoldEligible(userId) {
        try {
            // GL-001: First check Silver eligibility
            const isSilver = await this.isSilverEligible(userId);
            if (!isSilver) {
                return false;
            }

            // GL-002: Check 5+ trips per week for last 3 months
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            const weeklyTripsValid = await this.checkWeeklyTrips(userId, threeMonthsAgo, 5);
            if (!weeklyTripsValid) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking Gold eligibility:', error);
            return false;
        }
    }

    /**
     * Count missed reservations (expired without being claimed)
     */
    async countMissedReservations(userId, sinceDate) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM reservations 
                 WHERE user_id = ? AND status = 'expired' AND expires_at > ?`,
                [userId, sinceDate.toISOString()],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result?.count || 0);
                }
            );
        });
    }

    /**
     * Count trips in a period
     */
    async countTripsInPeriod(userId, sinceDate) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM rentals 
                 WHERE user_id = ? AND status IN ('completed', 'active') AND start_time > ?`,
                [userId, sinceDate.toISOString()],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result?.count || 0);
                }
            );
        });
    }

    /**
     * Count successful bike claims (reservations that became rentals)
     */
    async countSuccessfulBikeClaims(userId, sinceDate) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM rentals 
                 WHERE user_id = ? AND status IN ('completed', 'active') AND start_time > ?`,
                [userId, sinceDate.toISOString()],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result?.count || 0);
                }
            );
        });
    }

    /**
     * Check if user meets monthly trip requirement for all months in period
     */
    async checkMonthlyTrips(userId, sinceDate, tripsPerMonth) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    strftime('%Y-%m', start_time) as month,
                    COUNT(*) as count
                FROM rentals 
                WHERE user_id = ? AND status IN ('completed', 'active') AND start_time > ?
                GROUP BY month
                ORDER BY month DESC
                LIMIT 3
            `;
            
            this.db.all(query, [userId, sinceDate.toISOString()], (err, rows) => {
                if (err) return reject(err);
                
                // Must have data for at least 3 months
                if (!rows || rows.length < 3) {
                    return resolve(false);
                }
                
                // All 3 months must have >= tripsPerMonth
                const allMonthsValid = rows.every(row => row.count >= tripsPerMonth);
                resolve(allMonthsValid);
            });
        });
    }

    /**
     * Check if user meets weekly trip requirement for all weeks in period
     */
    async checkWeeklyTrips(userId, sinceDate, tripsPerWeek) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    strftime('%Y-%W', start_time) as week,
                    COUNT(*) as count
                FROM rentals 
                WHERE user_id = ? AND status IN ('completed', 'active') AND start_time > ?
                GROUP BY week
                ORDER BY week DESC
                LIMIT 12
            `;
            
            this.db.all(query, [userId, sinceDate.toISOString()], (err, rows) => {
                if (err) return reject(err);
                
                // Must have data for at least 12 weeks (3 months)
                if (!rows || rows.length < 12) {
                    return resolve(false);
                }
                
                // All 12 weeks must have >= tripsPerWeek
                const allWeeksValid = rows.every(row => row.count >= tripsPerWeek);
                resolve(allWeeksValid);
            });
        });
    }

    /**
     * Get tier benefits (discounts and reservation extensions)
     */
    getTierBenefits(tier) {
        const benefits = {
            entry: {
                discountPercentage: 0,
                reservationExtensionMinutes: 0
            },
            bronze: {
                discountPercentage: 5,
                reservationExtensionMinutes: 0
            },
            silver: {
                discountPercentage: 10,
                reservationExtensionMinutes: 2
            },
            gold: {
                discountPercentage: 15,
                reservationExtensionMinutes: 5
            }
        };
        return benefits[tier] || benefits.entry;
    }

    /**
     * Apply discount to cost based on tier
     */
    applyTierDiscount(originalCost, tier) {
        const benefits = this.getTierBenefits(tier);
        const discountAmount = originalCost * (benefits.discountPercentage / 100);
        const finalCost = originalCost - discountAmount;
        
        return {
            originalCost,
            discountPercentage: benefits.discountPercentage,
            discountAmount: Math.round(discountAmount * 100) / 100,
            finalCost: Math.round(finalCost * 100) / 100
        };
    }

    /**
     * Get tier change reason
     */
    getTierChangeReason(oldTier, newTier) {
        if (!oldTier || oldTier === 'entry') {
            return `Promoted to ${newTier}`;
        }
        if (newTier === 'entry' || !newTier) {
            return `Demoted from ${oldTier}`;
        }
        const tierOrder = { bronze: 1, silver: 2, gold: 3 };
        const oldRank = tierOrder[oldTier] || 0;
        const newRank = tierOrder[newTier] || 0;
        
        if (newRank > oldRank) {
            return `Promoted from ${oldTier} to ${newTier}`;
        } else {
            return `Demoted from ${oldTier} to ${newTier}`;
        }
    }

    /**
     * Get user data including tier
     */
    async getUserData(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    if (err) return reject(err);
                    resolve(user);
                }
            );
        });
    }

    /**
     * Get loyalty history for a user
     */
    async getLoyaltyHistory(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM loyalty_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
                [userId, limit],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows || []);
                }
            );
        });
    }

    /**
     * Check and update all users' tiers (maintenance task)
     */
    async checkAllUsersTiers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT id FROM users WHERE role = "rider"', [], async (err, users) => {
                if (err) return reject(err);
                
                let updated = 0;
                const results = [];
                
                for (const user of users || []) {
                    try {
                        const newTier = await this.calculateUserTier(user.id);
                        const result = await this.updateUserTier(user.id, newTier);
                        if (result.tierChanged) {
                            updated++;
                            results.push({
                                userId: user.id,
                                ...result
                            });
                        }
                    } catch (error) {
                        console.error(`Error updating tier for user ${user.id}:`, error);
                    }
                }
                
                resolve({
                    totalChecked: (users || []).length,
                    tierChanges: updated,
                    changes: results
                });
            });
        });
    }
}

module.exports = LoyaltyService;
