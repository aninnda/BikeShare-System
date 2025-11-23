const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== Debugging User "pol" ===\n');

// Check user pol
db.get("SELECT * FROM users WHERE username = 'pol'", [], (err, user) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }
    
    if (!user) {
        console.log('User "pol" not found!');
        db.close();
        return;
    }
    
    console.log('User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    
    // Check payment methods
    db.all("SELECT * FROM payment_methods WHERE user_id = ?", [user.id], (err, cards) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }
        
        console.log('Payment methods (${cards.length}):')
        if (cards.length === 0) {
            console.log('   No payment methods found!');
        } else {
            cards.forEach((card, index) => {
                console.log(`\n   Card ${index + 1}:`);
                console.log(`   - ID: ${card.id}`);
                console.log(`   - Last 4: ${card.card_number_last4}`);
                console.log(`   - Holder: ${card.card_holder_name}`);
                console.log(`   - Expiry: ${card.expiry_date}`);
                console.log(`   - Default: ${card.is_default ? 'Yes' : 'No'}`);
                console.log(`   - Created: ${card.created_at}`);
            });
        }
        
        // Test the API endpoint query
        console.log(`\n🔍 Testing API query:`);
        console.log(`   SELECT * FROM payment_methods WHERE user_id = ${user.id} AND is_default = 1`);
        
        db.get("SELECT * FROM payment_methods WHERE user_id = ? AND is_default = 1", [user.id], (err, defaultCard) => {
            if (err) {
                console.error('Error:', err);
            } else if (defaultCard) {
                console.log(`\nDefault card found:`);
                console.log(`   Last 4: ${defaultCard.card_number_last4}`);
                console.log(`   Holder: ${defaultCard.card_holder_name}`);
            } else {
                console.log(`\nNo default card found!`);
            }
            db.close();
        });
    });
});
