const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usage: node tools/set_user_flex.js <username> <expectedCurrent> <newBalance>
// Example: node tools/set_user_flex.js hello 12.5 2.5

const [,, username, expectedCurrentArg, newBalanceArg] = process.argv;
if (!username || !newBalanceArg) {
    console.error('Usage: node tools/set_user_flex.js <username> <expectedCurrent?> <newBalance>');
    process.exit(1);
}

const expectedCurrent = expectedCurrentArg ? parseFloat(expectedCurrentArg) : null;
const newBalance = parseFloat(newBalanceArg);
if (Number.isNaN(newBalance)) {
    console.error('Invalid newBalance:', newBalanceArg);
    process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Failed to open DB:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    db.get('SELECT id, username, flex_dollars FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            console.error('DB error:', err.message);
            db.close();
            process.exit(1);
        }
        if (!row) {
            console.error('User not found:', username);
            db.close();
            process.exit(1);
        }

        const current = Number(row.flex_dollars) || 0;
        console.log(`Found user id=${row.id} username=${row.username} current_flex=$${current.toFixed(2)}`);

        if (expectedCurrent !== null) {
            const diff = Math.abs(current - expectedCurrent);
            if (diff > 0.001) {
                console.error(`Current balance $${current.toFixed(2)} does not match expected $${expectedCurrent.toFixed(2)}. Aborting.`);
                db.close();
                process.exit(1);
            }
        }

        // Update balance
        db.run('UPDATE users SET flex_dollars = ? WHERE id = ?', [newBalance, row.id], function(updateErr) {
            if (updateErr) {
                console.error('Failed to update user balance:', updateErr.message);
                db.close();
                process.exit(1);
            }

            const amountChange = parseFloat((newBalance - current).toFixed(2));

            // Ensure transactions table exists
            db.run(`CREATE TABLE IF NOT EXISTS flex_dollars_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                transaction_type TEXT NOT NULL,
                description TEXT,
                related_rental_id INTEGER,
                related_station_id TEXT,
                balance_after DECIMAL(10,2),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (txErr) => {
                if (txErr) console.warn('Could not ensure transactions table exists:', txErr.message);

                db.run('INSERT INTO flex_dollars_transactions (user_id, amount, transaction_type, description, balance_after) VALUES (?, ?, ?, ?, ?)',
                    [row.id, amountChange, 'admin_adjust', `Admin set balance from ${current.toFixed(2)} to ${newBalance.toFixed(2)}`, newBalance], (insErr) => {
                        if (insErr) console.error('Failed to insert transaction row:', insErr.message);
                        else console.log(`Updated flex: $${current.toFixed(2)} -> $${newBalance.toFixed(2)}; recorded transaction amount $${amountChange.toFixed(2)}`);
                        db.close();
                    }
                );
            });
        });
    });
});
