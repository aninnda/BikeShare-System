const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Remove specific users from the database
 */
async function removeUsers() {
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error('Failed to open DB:', err.message);
            process.exit(1);
        }
        console.log('Connected to database:', dbPath);
    });

    const usersToRemove = ['nigga', 'niggas'];

    db.serialize(() => {
        // First, check if these users exist
        const placeholders = usersToRemove.map(() => '?').join(',');
        db.all(`SELECT id, username, email FROM users WHERE username IN (${placeholders})`, usersToRemove, (err, rows) => {
            if (err) {
                console.error('Error querying users:', err.message);
                db.close();
                process.exit(1);
            }

            if (rows.length === 0) {
                console.log('No matching users found to remove.');
                db.close();
                return;
            }

            console.log(`\nFound ${rows.length} user(s) to remove:`);
            rows.forEach(user => {
                console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
            });

            // Delete the users
            db.run(`DELETE FROM users WHERE username IN (${placeholders})`, usersToRemove, function(deleteErr) {
                if (deleteErr) {
                    console.error('Error deleting users:', deleteErr.message);
                    db.close();
                    process.exit(1);
                }

                console.log(`\nSuccessfully removed ${this.changes} user(s) from the database.`);
                db.close();
            });
        });
    });
}

// Run the removal
removeUsers();
