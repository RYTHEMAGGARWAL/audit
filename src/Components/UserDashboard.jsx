import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../contexts/UsersContext';
import Audit from './Audit';
import './Admin.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { users } = useUsers();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');

  useEffect(() => {
    const role = loggedUser?.Role?.toLowerCase();
    if (!loggedUser || (role !== 'user' && role !== 'audit user')) {
      alert('Unauthorized! Redirecting to login.');
      navigate('/');
    }
  }, [navigate, loggedUser]);

  if (users.length === 0) return <div className="admin-container">Loading...</div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>User Dashboard - Welcome, {loggedUser.firstname}</h1>
        <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>Logout</button>
      </header>
      
      <main className="admin-content">
        <Audit />
      </main>
    </div>
  );
};

export default UserDashboard;