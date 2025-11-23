const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Removing card columns from users table...\n');

// SQLite doesn't support DROP COLUMN directly, so we need to:
// 1. Create a new table without the card columns
// 2. Copy data from old table to new table
// 3. Drop old table
// 4. Rename new table to users

const steps = [
    // Create new users table without card columns
    `CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'rider',
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        address TEXT,
        flex_dollars REAL DEFAULT 0,
        loyalty_tier TEXT,
        roles TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Copy data from old table to new table (excluding card columns)
    `INSERT INTO users_new (id, username, password, role, first_name, last_name, email, address, flex_dollars, loyalty_tier, roles, created_at)
     SELECT id, username, password, role, first_name, last_name, email, address, flex_dollars, loyalty_tier, roles, created_at
     FROM users`,
    
    // Drop old table
    `DROP TABLE users`,
    
    // Rename new table to users
    `ALTER TABLE users_new RENAME TO users`
];

function executeStep(index) {
    if (index >= steps.length) {
        console.log('\nAll card columns removed successfully!');
        
        // Verify the new structure
        db.all('PRAGMA table_info(users)', [], (err, columns) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log('\nUpdated users table columns:');
                columns.forEach(col => console.log(`  ${col.name} (${col.type})`));
            }
            db.close();
        });
        return;
    }
    
    console.log(`Step ${index + 1}/${steps.length}...`);
    db.run(steps[index], (err) => {
        if (err) {
            console.error(`Error at step ${index + 1}:`, err.message);
            db.close();
            process.exit(1);
        }
        executeStep(index + 1);
    });
}

executeStep(0);
