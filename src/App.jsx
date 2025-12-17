import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UsersProvider } from './contexts/UsersContext';
import Login from './Components/Login';
import Admin from './Components/Admin';
import UserDashboard from './Components/UserDashboard';
import CenterDashboard from './Components/CenterDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <UsersProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/center-dashboard" element={<CenterDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </UsersProvider>
    </Router>
  );
}

export default App;