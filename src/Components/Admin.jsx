import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../contexts/UsersContext';
import UserManagement from './UserManagement';
import Audit from './Audit';
import PendingApprovals from './PendingApprovals';
import { API_URL } from '../config';
import './Admin.css';

const Admin = () => {
  const navigate = useNavigate();
  const { users } = useUsers();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  
  // Set default tab based on role
  const [activeTab, setActiveTab] = useState(
    loggedUser.Role === 'User' ? 'Audit' : 'User Management'
  );

  const [pendingCount, setPendingCount] = useState(0);

  // Load pending count for Admin
  useEffect(() => {
    if (loggedUser.Role === 'Admin') {
      loadPendingCount();
    }
  }, [loggedUser.Role]);

  // ========================================
  // LOAD PENDING COUNT FROM MONGODB
  // ========================================
  const loadPendingCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/audit-reports/pending/count`);
      
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.count || 0);
        console.log('📋 Pending count:', data.count);
      }
    } catch (err) {
      console.error('Error loading pending count:', err);
      setPendingCount(0);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    if (!loggedUser || !loggedUser.username) {
      alert('Unauthorized! Please login first.');
      navigate('/');
      return;
    }

    // Allow both Admin and User roles
    if (loggedUser.Role !== 'Admin' && loggedUser.Role !== 'User') {
      alert('Unauthorized! Redirecting to login.');
      navigate('/');
    }
  }, [navigate, loggedUser]);

  if (users.length === 0) return <div className="admin-container">Loading users...</div>;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>
          {loggedUser.Role === 'Admin' ? 'Admin Dashboard' : 'User Dashboard'} - Welcome, {loggedUser.firstname}
        </h1>
        <button onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}>
          Logout
        </button>
      </header>

      {/* Show tabs based on user role */}
      <div className="tabs">
        {/* Admin sees 3 tabs */}
        {loggedUser.Role === 'Admin' && (
          <>
            <button 
              className={activeTab === 'User Management' ? 'active' : ''} 
              onClick={() => setActiveTab('User Management')}
            >
              👥 User Management
            </button>
            <button 
              className={activeTab === 'Audit' ? 'active' : ''} 
              onClick={() => setActiveTab('Audit')}
            >
              📋 Audit
            </button>
            <button 
              className={activeTab === 'Pending Approvals' ? 'active' : ''} 
              onClick={() => {
                setActiveTab('Pending Approvals');
                loadPendingCount(); // Refresh count when tab clicked
              }}
              style={{
                position: 'relative',
                paddingRight: pendingCount > 0 ? '45px' : '20px'
              }}
            >
              ⏳ Pending Approvals
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  right: '10px',
                  transform: 'translateY(-50%)',
                  background: '#ff5722',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(255, 87, 34, 0.4)'
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* User sees only Audit tab */}
        {loggedUser.Role === 'User' && (
          <button className="active">
            📋 Audit Management
          </button>
        )}
      </div>

      <main className="admin-content">
        {/* Admin can access all 3 sections */}
        {loggedUser.Role === 'Admin' && (
          <>
            {activeTab === 'User Management' && <UserManagement />}
            {activeTab === 'Audit' && <Audit />}
            {activeTab === 'Pending Approvals' && <PendingApprovals onApprovalUpdate={loadPendingCount} />}
          </>
        )}

        {/* User can only access Audit */}
        {loggedUser.Role === 'User' && <Audit />}
      </main>
    </div>
  );
};

export default Admin;