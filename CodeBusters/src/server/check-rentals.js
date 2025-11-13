const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all(`
    SELECT 
        id, user_id, bike_id, start_time, end_time, status, total_cost
    FROM rentals 
    WHERE status = 'completed'
    ORDER BY end_time DESC
    LIMIT 10
`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Completed Rentals:', rows.length);
        console.table(rows);
    }
    db.close();
});
