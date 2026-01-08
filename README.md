# 🚴 Bike Sharing Management System

> A full-stack, production-ready bike-sharing platform demonstrating enterprise software architecture, real-time data management, and cloud deployment expertise.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://bike-share-system.vercel.app)
[![Frontend](https://img.shields.io/badge/frontend-Vercel-black)](https://bike-share-system.vercel.app)
[![Backend](https://img.shields.io/badge/backend-Render-46E3B7)](https://bikeshare-system.onrender.com)

**🌐 Live Application:** [bike-share-system.vercel.app](https://bike-share-system.vercel.app)

---

## 📋 Project Overview

Enterprise-grade Bike Sharing Management System (BMS) developed as part of **SOEN 343 – Software Architecture and Design** at Concordia University. This full-stack application simulates a real-world bike-sharing service with robust architecture, implementing industry best practices in software design patterns, RESTful API development, and cloud deployment.

### 🎯 Key Achievements
- ✅ **Full-Stack Development:** React frontend + Node.js/Express backend
- ✅ **Cloud Deployment:** Successfully deployed on Vercel (frontend) and Render (backend)
- ✅ **Real-Time System:** Live bike availability tracking and reservation management
- ✅ **Role-Based Access Control:** Implemented secure authentication and authorization
- ✅ **Scalable Architecture:** Clean separation of concerns with layered design patterns
- ✅ **Production-Ready:** CORS configuration, environment management, and error handling

---

## 🚀 Live Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| **Frontend** | Vercel | [bike-share-system.vercel.app](https://bike-share-system.vercel.app) |
| **Backend API** | Render | [bikeshare-system.onrender.com](https://bikeshare-system.onrender.com) |
| **Repository** | GitHub | [BikeShare-System](https://github.com/aninnda/BikeShare-System) |

---

## 💼 Technical Highlights

### Architecture & Design Patterns
- **Layered Architecture:** Presentation → Business Logic → Data Access
- **MVC Pattern:** Clean separation of models, views, and controllers
- **Service Layer Pattern:** Encapsulated business logic (BMS, Reservation, Loyalty services)
- **Middleware Pattern:** Authentication, authorization, and CORS handling
- **Repository Pattern:** Database abstraction for maintainability

### Key Features Implemented
- 🔐 **Authentication & Authorization:** JWT-based secure login system with role-based access
- 🗺️ **Interactive Map:** Real-time station and bike visualization using Leaflet.js
- 📊 **Analytics Dashboard:** Comprehensive ride history, billing, and system metrics
- 💳 **Payment Integration:** Multi-payment method support with Flex Dollars loyalty system
- 🔔 **Notification System:** Real-time alerts for reservations, damage reports, and system events
- 📱 **Responsive Design:** Mobile-first approach with modern CSS

- 📱 **Responsive Design:** Mobile-first approach with modern CSS

---

## 🛠️ Technology Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)

- **React.js** - Component-based UI architecture
- **React Router** - Client-side routing and navigation
- **Leaflet.js** - Interactive mapping and geolocation
- **Context API** - Global state management
- **CSS3** - Custom styling with modern layouts

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

- **Node.js** - Asynchronous event-driven JavaScript runtime
- **Express.js** - RESTful API framework
- **SQLite3** - Lightweight relational database
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### DevOps & Deployment
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)

- **Vercel** - Frontend deployment with CI/CD
- **Render** - Backend hosting with automatic deployments
- **Git/GitHub** - Version control and collaboration
- **Environment Variables** - Secure configuration management

---

## 👥 User Roles & Capabilities

### 🚴‍♂️ Rider
- User registration and authentication
- Real-time bike availability search
- One-click bike reservation system
- Ride checkout and return workflow
- Comprehensive ride history and billing dashboard
- Loyalty points and Flex Dollars rewards
- Push notifications for reservations and trip summaries

### 🔧 Operator
- Secure operator dashboard access
- Bike and station management tools
- System rebalancing and maintenance workflows
- Damage report handling and resolution
- System-wide analytics and reporting
- Real-time alerts for critical system conditions

### 👀 Guest
- Public station map viewing
- Pricing plan comparison
- System overview (read-only access)

---

## 📦 Local Development Setup

### Prerequisites
```bash
Node.js >= 14.x
npm >= 6.x
Git
```

### Quick Start

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/aninnda/BikeShare-System.git
cd BikeShare-System/codebusters
```

#### 2️⃣ Backend Setup
```bash
cd src/server
npm install

# Create .env file
echo "PORT=5001
DB_PATH=./database.sqlite
CORS_ORIGIN=http://localhost:3000" > .env

# Start the server
npm start
```
**Backend runs on:** `http://localhost:5001`

#### 3️⃣ Frontend Setup
```bash
cd ../client
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5001" > .env

# Start the development server
npm start
```
**Frontend runs on:** `http://localhost:3000`

### Environment Configuration

#### Backend (.env)
```env
PORT=5001
DB_PATH=./database.sqlite
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5001
```

---

## 🧪 Testing the Application

### Create a Rider Account
1. Navigate to the live site or local instance
2. Click "Register"
3. Fill in user details and payment information
4. Start reserving bikes!

### Operator Access
- **Username:** `demo_operator`
- **Role:** Dual (Rider + Operator capabilities)
- Contact the development team for credentials

---

## 📚 Software Engineering Principles

### Design Documentation
- **UML Diagrams:** Context, Domain Model, Use Case, Sequence, Activity, Class diagrams
- **Architectural Patterns:** Layered architecture, MVC, Service-oriented design
- **Documentation Links:**
  - [Phase 1 Documentation →](https://drive.google.com/file/d/1lk3JbIuAyQcq7GDUnzFM8zGn8SzPd2Ju/view?usp=drive_link)
  - [Phase 2 Documentation →](https://drive.google.com/file/d/1kOQCrmGvSbimVs74_45PapdJ0_3nIBZk/view?usp=drive_link)

### Best Practices Implemented
- ✅ RESTful API design principles
- ✅ Secure authentication and authorization
- ✅ Input validation and error handling
- ✅ Responsive and accessible UI/UX
- ✅ Clean code with separation of concerns
- ✅ Environment-based configuration
- ✅ Git workflow and version control

---

## 🎓 Academic Context

**Course:** SOEN 343 – Software Architecture and Design  
**Institution:** Concordia University  
**Focus Areas:**
- Object-Oriented Design & Analysis
- Software Architecture Patterns
- UML Modeling & Documentation
- Full-Stack Development
- Agile Development Methodology

---

## 👨‍💻 Contributors

| Name | Student ID |
|------|------------|
| Samy Mezimez | 40275766 |
| Yassine Abdellatif | 40279279 |
| **Aninnda Kumar Datta** | **40298954** |
| Sitherankan Sinnappu | 40264048 |
| Hong Phuc Paul Pham | 40264687 |

---

<p align="center">Made with ❤️ by the CodeBusters Team</p>

