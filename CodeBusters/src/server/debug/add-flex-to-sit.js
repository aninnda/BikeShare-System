const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== Adding Flex Dollars to User "sit" ===\n');

// Get user sit
db.get("SELECT id, username FROM users WHERE username = 'sit'", [], (err, user) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }
    
    if (!user) {
        console.log('User "sit" not found!');
        db.close();
        return;
    }
    
    console.log(`Found user: ${user.username} (ID: ${user.id})`);
    
    // Add $13 flex dollars ($3 + $10)
    const amount = 13.00;
    
    // Get current balance
    db.get("SELECT COALESCE(SUM(amount), 0) as balance FROM flex_dollars_transactions WHERE user_id = ?", [user.id], (err, result) => {
        if (err) {
            console.error('Error getting balance:', err);
            db.close();
            return;
        }
        
        const currentBalance = Number(result.balance) || 0;
        const newBalance = currentBalance + amount;
        
        console.log(`Current balance: $${currentBalance.toFixed(2)}`);
        console.log(`Adding: $${amount.toFixed(2)}`);
        console.log(`New balance: $${newBalance.toFixed(2)}`);
        
        // Insert transaction
        db.run(
            'INSERT INTO flex_dollars_transactions (user_id, amount, transaction_type, description, balance_after, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [user.id, amount, 'credit', 'Manual adjustment - $3 flex + $10 credit', newBalance, new Date().toISOString()],
            function(insertErr) {
                if (insertErr) {
                    console.error('Error adding flex dollars:', insertErr.message);
                } else {
                    console.log('\nSuccessfully added $13.00 flex dollars to user "sit"!');
                    console.log(`   Transaction ID: ${this.lastID}`);
                }
                db.close();
            }
        );
    });
});
