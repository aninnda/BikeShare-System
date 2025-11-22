const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== Adding Payment Methods for All Riders ===\n');

// Get all riders
db.all("SELECT id, username, first_name, last_name FROM users WHERE role IN ('rider', 'dual')", [], (err, riders) => {
    if (err) {
        console.error('Error fetching riders:', err);
        db.close();
        return;
    }
    
    console.log(`Found ${riders.length} riders/dual users\n`);
    
    let processed = 0;
    let added = 0;
    let skipped = 0;
    
    riders.forEach((rider, index) => {
        // Check if rider already has a payment method
        db.get("SELECT id FROM payment_methods WHERE user_id = ?", [rider.id], (err, existing) => {
            if (err) {
                console.error(`Error checking payment method for ${rider.username}:`, err);
                processed++;
                return;
            }
            
            if (existing) {
                console.log(`${rider.username} - Already has payment method`);
                skipped++;
                processed++;
                checkComplete();
            } else {
                // Generate a fake card for this user
                const last4 = String(1000 + (rider.id % 9000)).padStart(4, '0');
                const cardHolderName = `${rider.first_name || 'User'} ${rider.last_name || rider.username}`;
                const expiryDate = '12/29'; // Default expiry
                
                db.run(
                    'INSERT INTO payment_methods (user_id, card_number_last4, card_holder_name, expiry_date, is_default) VALUES (?, ?, ?, ?, 1)',
                    [rider.id, last4, cardHolderName, expiryDate],
                    function(insertErr) {
                        if (insertErr) {
                            console.error(`${rider.username} - Error adding payment method:`, insertErr.message);
                        } else {
                            console.log(`${rider.username} - Added card ending in ${last4}`);
                            added++;
                        }
                        processed++;
                        checkComplete();
                    }
                );
            }
        });
    });
    
    function checkComplete() {
        if (processed === riders.length) {
            console.log(`\n=== Summary ===`);
            console.log(`Total riders: ${riders.length}`);
            console.log(`Payment methods added: ${added}`);
            console.log(`Already had payment methods: ${skipped}`);
            db.close();
        }
    }
    
    // Handle case where there are no riders
    if (riders.length === 0) {
        console.log('No riders found.');
        db.close();
    }
});
