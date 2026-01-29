import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Layout/Sidebar';
import MyProfile from './pages/MyProfile';
import ManageSchools from './pages/ManageSchools';
import Compare from './pages/Compare';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RoleRoute = ({ children, allowed }) => {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const Layout = () => {
  const { user } = useAuth();
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<MyProfile />} />
          <Route path="/schools" element={<ManageSchools />} />
          <Route path="/compare" element={<Compare />} />
          <Route
            path="/settings"
            element={
              <RoleRoute allowed={['admin', 'moderator', 'staff']}>
                <Settings />
              </RoleRoute>
            }
          />
          <Route path="/admin" element={
            <RoleRoute allowed={['admin', 'moderator']}>
              <AdminDashboard />
            </RoleRoute>
          } />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
