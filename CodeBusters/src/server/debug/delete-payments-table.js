const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Deleting payments table...\n');

db.run('DROP TABLE IF EXISTS payments', (err) => {
    if (err) {
        console.error('Error deleting table:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('payments table deleted successfully!');
    
    // Verify the table was deleted
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'", [], (err, tables) => {
        if (err) {
            console.error('Error verifying deletion:', err);
        } else if (tables.length === 0) {
            console.log('Verified: payments table no longer exists');
        } else {
            console.log('Table still exists after deletion attempt');
        }
        
        // Show remaining tables
        db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, allTables) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log('\nRemaining tables:');
                allTables.forEach(t => console.log(`  - ${t.name}`));
            }
            db.close();
        });
    });
});
