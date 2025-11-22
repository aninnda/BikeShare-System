const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== Checking Database Tables ===\n');

// Check all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('Error fetching tables:', err);
        db.close();
        return;
    }
    
    console.log('Existing tables:');
    tables.forEach(t => console.log('  -', t.name));
    console.log();
    
    // Check if payment_methods table exists
    const hasPaymentMethods = tables.some(t => t.name === 'payment_methods');
    
    if (hasPaymentMethods) {
        console.log('payment_methods table structure:');
        db.all("PRAGMA table_info(payment_methods)", [], (err, columns) => {
            if (err) {
                console.error('Error:', err);
            } else {
                columns.forEach(col => console.log(`  ${col.name} (${col.type})`));
            }
            
            console.log('\nChecking for user "pol":');
            db.get("SELECT id, username FROM users WHERE username = 'pol'", [], (err, user) => {
                if (err) {
                    console.error('Error:', err);
                    db.close();
                    return;
                }
                
                if (user) {
                    console.log(`Found user: ${user.username} (ID: ${user.id})`);
                    
                    // Check payment methods for this user
                    db.all("SELECT * FROM payment_methods WHERE user_id = ?", [user.id], (err, cards) => {
                        if (err) {
                            console.error('Error:', err);
                        } else if (cards.length === 0) {
                            console.log('No payment methods found for this user.');
                        } else {
                            console.log(`\nPayment methods for user "${user.username}":`);
                            cards.forEach(card => {
                                console.log(`  Card ending in: ${card.card_number_last4}`);
                                console.log(`  Cardholder: ${card.card_holder_name}`);
                                console.log(`  Expiry: ${card.expiry_date}`);
                                console.log(`  Created: ${card.created_at}`);
                            });
                        }
                        db.close();
                    });
                } else {
                    console.log('User "pol" not found in database.');
                    db.close();
                }
            });
        });
    } else {
        console.log('payment_methods table does NOT exist!');
        console.log('\nThe table needs to be created. The server needs to be restarted for the new table to be created.');
        db.close();
    }
});
