const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Creating payment_methods table...\n');

const createTableQuery = `CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_number_last4 TEXT NOT NULL,
    card_holder_name TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    is_default INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)`;

db.run(createTableQuery, (err) => {
    if (err) {
        console.error('Error creating table:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('payment_methods table created successfully!');
    
    // Verify the table was created
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='payment_methods'", [], (err, tables) => {
        if (err) {
            console.error('Error verifying table:', err);
        } else if (tables.length > 0) {
            console.log('Table verified in database');
            
            // Show table structure
            db.all("PRAGMA table_info(payment_methods)", [], (err, columns) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    console.log('\nTable structure:');
                    columns.forEach(col => console.log(`  ${col.name} (${col.type})`));
                }
                
                console.log('\nMigration complete! You can now register users with card information.');
                db.close();
            });
        } else {
            console.log('Table not found after creation');
            db.close();
        }
    });
});
