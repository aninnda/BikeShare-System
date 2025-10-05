import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Content from './pages/Content';
import Register from './pages/Register';
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
        <Route path='/login' element={!user ? <Login /> : <Navigate to={user.role === 'rider' ? '/rider/dashboard' : '/operator/dashboard'} />} />
        <Route path='/register' element={!user ? <Register /> : <Navigate to={user.role === 'rider' ? '/rider/dashboard' : '/operator/dashboard'} />} />
        <Route path='/content' element={<Content />} />
        
        {/* Rider Routes */}
        <Route path='/rider/dashboard' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <div>Rider Dashboard</div>
          </ProtectedRoute>
        } />
        <Route path='/rider/bikes' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <div>Available Bikes</div>
          </ProtectedRoute>
        } />
        <Route path='/rider/rentals' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <div>My Rentals</div>
          </ProtectedRoute>
        } />
        <Route path='/rider/profile' element={
          <ProtectedRoute allowedRoles={['rider']}>
            <div>Rider Profile</div>
          </ProtectedRoute>
        } />
        
        {/* Operator Routes */}
        <Route path='/operator/dashboard' element={
          <ProtectedRoute allowedRoles={['operator']}>
            <div>Operator Dashboard</div>
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
