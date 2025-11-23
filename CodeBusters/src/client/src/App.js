import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import ManageBikes from './pages/ManageBikes';
import Analytics from './pages/Analytics';
import Register from './pages/Register';
import Plans from './pages/Plans';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import MapComponent from './components/MapComponent';
import AvailableBikes from './components/AvailableBikes';
import MyRentals from './components/MyRentals';
import PricingDisplay from './components/PricingDisplay';
import Payment from './components/Payment';
import TierNotification from './components/TierNotification';
import { Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RoleBasedNavbar from './components/RoleBasedNavbar';

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Treat 'dual' users as both rider and operator
  const effectiveRoles = user.role === 'dual' ? ['dual', 'rider', 'operator'] : [user.role];
  if (allowedRoles.length > 0 && !allowedRoles.some(r => effectiveRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Main App Content
const AppContent = () => {
  const { user, logout, tierNotification, clearTierNotification } = useAuth();

  return (
    <div className='App'>
      <TierNotification 
        notification={tierNotification}
        onClose={clearTierNotification}
      />
      <RoleBasedNavbar user={user} onLogout={logout} />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/home' element={<Home />} />
        <Route path='/plans' element={<Plans />} />
        <Route path='/login' element={!user ? <Login /> : <Navigate to={user.role === 'rider' ? '/rider/dashboard' : '/operator/dashboard'} />} />
        <Route path='/register' element={!user ? <Register /> : <Navigate to={user.role === 'rider' ? '/rider/dashboard' : '/operator/dashboard'} />} />
        
        {/* Rider Routes */}
        <Route path='/rider/dashboard' element={
          <ProtectedRoute allowedRoles={['rider', 'dual']}>
            <div style={{ padding: '20px' }}>
              <h1 style={{ color: '#922338', textAlign: 'center', marginBottom: '20px' }}>
                Rider Dashboard
              </h1>
              <PricingDisplay />
            </div>
          </ProtectedRoute>
        } />
        <Route path='/rider/bikes' element={
          <ProtectedRoute allowedRoles={['rider', 'dual']}>
            <AvailableBikes />
          </ProtectedRoute>
        } />
        <Route path='/plans' element={
            <Plans />
        } />
        <Route path='/rider/rentals' element={
          <ProtectedRoute allowedRoles={['rider', 'dual']}>
            <MyRentals />
          </ProtectedRoute>
        } />
        <Route path='/leaderboard' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <Leaderboard />
          </ProtectedRoute>
        } />
        <Route path='/rider/profile' element={
          <ProtectedRoute allowedRoles={['rider', 'dual']}>
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Profile Route - Available to both riders and operators */}
        <Route path='/profile' element={
          <ProtectedRoute allowedRoles={['rider', 'operator', 'dual']}>
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* R-BMS-01 Map Routes - Available to both riders and operators */}
        <Route path='/map' element={
          <ProtectedRoute allowedRoles={['rider', 'operator', 'dual']}>
            <div style={{ padding: '20px' }}>
              <MapComponent />
            </div>
          </ProtectedRoute>
        } />
        
        {/* Operator Routes */}
        <Route path='/operator/bikes' element={
          <ProtectedRoute allowedRoles={['operator', 'dual']}>
            <ManageBikes/>
          </ProtectedRoute>
        } />
        <Route path='/operator/rentals' element={
          <ProtectedRoute allowedRoles={['operator', 'dual']}>
            <div>All Rentals</div>
          </ProtectedRoute>
        } />
        <Route path='/operator/analytics' element={
          <ProtectedRoute allowedRoles={['operator', 'dual']}>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path='/payment' element={
          <ProtectedRoute allowedRoles={['rider', 'dual']}>
            <PaymentWrapper />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
};

// Wrapper to bridge router state to Payment component props
const PaymentWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selected = location.state && location.state.selectedPlan ? location.state.selectedPlan : null;
  const onBack = () => navigate(-1);
  return <Payment selectedPlan={selected} onBack={onBack} />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
