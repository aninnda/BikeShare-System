# CodeBusters Backend API

This is the Node.js backend server for the CodeBusters Bike Management System (BMS).

## Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite3** - Database
- **CORS** - Cross-origin resource sharing
- **Nodemon** - Development auto-restart

## Installation

1. Navigate to the backend directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Server

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Base URL: `http://localhost:5000`

- **GET /** - API information and available endpoints
- **GET /health** - Health check
- **GET /api/bikes** - Get all bikes
- **GET /api/users** - Get all users  
- **GET /api/rentals** - Get all rentals
- **POST /api/bikes** - Add a new bike

## Database Schema

### Tables Created Automatically:

1. **users** - User accounts
   - id, username, email, password, created_at

2. **bikes** - Bike inventory for BMS
   - id, bike_id, model, status, location, battery_level, created_at, updated_at

3. **rentals** - Bike rental records
   - id, user_id, bike_id, start_time, end_time, total_cost, status

## Environment Variables

Create a `.env` file with:
```
PORT=5001
DB_PATH=./database.sqlite
CORS_ORIGIN=http://localhost:3000
```

## Database File

The SQLite database will be automatically created as `database.sqlite` in the backend directory.

## Integration with React Frontend

The backend is configured to work with your React frontend running on `http://localhost:3000`. CORS is enabled for cross-origin requests.