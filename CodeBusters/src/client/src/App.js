import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Content from './pages/Content';
import Register from './pages/Register';
import Plans from './pages/Plans';
import Profile from './pages/Profile';
import MapComponent from './components/MapComponent';
import AvailableBikes from './components/AvailableBikes';
import MyRentals from './components/MyRentals';
import PricingDisplay from './components/PricingDisplay';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RoleBasedNavbar from './components/RoleBasedNavbar';

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Main App Content
const AppContent = () => {
  const { user, logout } = useAuth();

  return (
    <div className='App'>
      <RoleBasedNavbar user={user} onLogout={logout} />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/home' element={<Home />} />
        <Route path='/plans' element={<Plans />} />
        <Route path='/login' element={!user ? <Login /> : <Navigate to={user.role === 'rider' ? '/rider/dashboard' : '/operator/dashboard'} />} />
        <Route path='/register' element={!user ? <Register /> : <Navigate to={user.role === 'rider' ? '/rider/dashboard' : '/operator/dashboard'} />} />
        <Route path='/content' element={<Content />} />
        
        {/* Rider Routes */}
        <Route path='/rider/dashboard' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <div style={{ padding: '20px' }}>
              <h1 style={{ color: '#922338', textAlign: 'center', marginBottom: '20px' }}>
                Rider Dashboard
              </h1>
              <PricingDisplay />
            </div>
          </ProtectedRoute>
        } />
        <Route path='/rider/bikes' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <AvailableBikes />
          </ProtectedRoute>
        } />
        <Route path='/rider/plans' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <Plans />
          </ProtectedRoute>
        } />
        <Route path='/rider/rentals' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <MyRentals />
          </ProtectedRoute>
        } />
        <Route path='/rider/profile' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Profile Route - Available to both riders and operators */}
        <Route path='/profile' element={
          <ProtectedRoute allowedRoles={['rider', 'operator']}>
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* R-BMS-01 Map Routes - Available to both riders and operators */}
        <Route path='/map' element={
          <ProtectedRoute allowedRoles={['rider', 'operator']}>
            <div style={{ padding: '20px' }}>
              <MapComponent />
            </div>
          </ProtectedRoute>
        } />
        
        {/* Operator Routes */}
        <Route path='/operator/dashboard' element={
          <ProtectedRoute allowedRoles={['operator']}>
            <div style={{ padding: '20px' }}>
              <h1 style={{ color: '#922338', textAlign: 'center', marginBottom: '20px' }}>
                Operator Dashboard
              </h1>
              <PricingDisplay />
            </div>
          </ProtectedRoute>
        } />
        <Route path='/operator/bikes' element={
          <ProtectedRoute allowedRoles={['operator']}>
            <div>Manage Bikes</div>
          </ProtectedRoute>
        } />
        <Route path='/operator/users' element={
          <ProtectedRoute allowedRoles={['operator']}>
            <div>Manage Users</div>
          </ProtectedRoute>
        } />
        <Route path='/operator/rentals' element={
          <ProtectedRoute allowedRoles={['operator']}>
            <div>All Rentals</div>
          </ProtectedRoute>
        } />
        <Route path='/operator/analytics' element={
          <ProtectedRoute allowedRoles={['operator']}>
            <div>Analytics</div>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
