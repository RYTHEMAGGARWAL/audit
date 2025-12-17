import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUsers } from '../contexts/UsersContext';
import { API_URL } from '../config';
import './UserManagement.css';

const UserManagement = () => {
  const { users: globalUsers, setUsers: setGlobalUsers } = useUsers();
  const [activeOption, setActiveOption] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', Role: 'Audit User' });
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', Role: 'Audit User' });
  const [tableUsers, setTableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ message: '', color: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const checkPasswordStrength = (password) => {
    if (!password) return { message: '', color: '' };
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) s++;
    if (s <= 2) return { message: '❌ Weak', color: '#f44336' };
    if (s === 3) return { message: '⚠️ Medium', color: '#ff9800' };
    if (s === 4) return { message: '✅ Strong', color: '#4caf50' };
    return { message: '✅ Very Strong', color: '#2196f3' };
  };

  const loadUsersData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const usersData = await response.json();
      setTableUsers([...usersData]);
      setGlobalUsers([...usersData]);
    } catch (err) {
      showMessage('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsersData(); }, []);

  const resetForm = () => {
    setNewUserForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', Role: 'Audit User' });
    setPasswordStrength({ message: '', color: '' });
    setValidationErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!newUserForm.username?.trim()) errors.username = 'Required';
    else if (newUserForm.username.length < 3) errors.username = 'Min 3 characters';
    if (!newUserForm.password?.trim()) errors.password = 'Required';
    else if (newUserForm.password.length < 4) errors.password = 'Min 4 characters';
    if (!newUserForm.firstname?.trim()) errors.firstname = 'Required';
    if (!newUserForm.lastname?.trim()) errors.lastname = 'Required';
    if (!newUserForm.email?.trim()) errors.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserForm.email)) errors.email = 'Invalid email';
    if (!newUserForm.mobile?.trim()) errors.mobile = 'Required';
    else if (!/^[0-9]{10}$/.test(newUserForm.mobile)) errors.mobile = '10 digits required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return showMessage('Fix validation errors', 'error');
    if (globalUsers.some(u => u.username?.toLowerCase() === newUserForm.username?.toLowerCase())) 
      return showMessage('Username already exists!', 'error');
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUserForm, username: newUserForm.username.toLowerCase(), email: newUserForm.email?.toLowerCase() || '' })
      });
      if (res.ok) {
        showMessage('✅ User created successfully!', 'success');
        resetForm();
        await loadUsersData();
      } else {
        showMessage(`❌ ${(await res.json()).error}`, 'error');
      }
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const user = globalUsers.find(u => u.username === selectedUser);
      if (user?._id) {
        const res = await fetch(`${API_URL}/api/users/${user._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm)
        });
        if (res.ok) {
          showMessage('✅ Updated!', 'success');
          await loadUsersData();
        }
      }
      setSelectedUser(null);
      setEditForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', Role: 'Audit User' });
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser || !window.confirm(`Delete "${selectedUser}"?`)) return;
    try {
      setLoading(true);
      const user = globalUsers.find(u => u.username === selectedUser);
      if (user?._id) {
        const res = await fetch(`${API_URL}/api/users/${user._id}`, { method: 'DELETE' });
        if (res.ok) {
          showMessage('✅ Deleted!', 'success');
          await loadUsersData();
        }
      }
      setSelectedUser(null);
      setEditForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', Role: 'Audit User' });
    } catch (err) {
      showMessage(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (e) => {
    const username = e.target.value;
    if (!username) {
      setSelectedUser(null);
      setEditForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', Role: 'Audit User' });
      return;
    }
    setSelectedUser(username);
    const user = globalUsers.find(u => u.username === username);
    if (user) {
      setEditForm({
        username: user.username || '',
        password: user.password || '',
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        email: user.email || '',
        mobile: user.mobile || '',
        Role: user.Role || 'User'
      });
    }
  };

  const togglePwd = (i) => {
    const s = new Set(visiblePasswords);
    s.has(i) ? s.delete(i) : s.add(i);
    setVisiblePasswords(s);
  };

  return (
    <div className="management-section">
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
      
      <h2>👥 User Management</h2>
      
      <div className="status-bar">
        <span>📊 Total Users: {globalUsers.length}</span>
        <button onClick={async () => { await loadUsersData(); showMessage('✅ Refreshed!', 'success'); }} disabled={loading}>
          {loading ? '⏳' : '🔄 Refresh'}
        </button>
      </div>

      <div className="options">
        <button className={activeOption === 'create' ? 'active' : ''} onClick={() => { resetForm(); setActiveOption('create'); }}>
          ➕ Create User
        </button>
        <button className={activeOption === 'view' ? 'active' : ''} onClick={async () => { await loadUsersData(); setActiveOption('view'); }}>
          👁️ View User
        </button>
        <button className={activeOption === 'modify' ? 'active' : ''} onClick={async () => { await loadUsersData(); setActiveOption('modify'); setSelectedUser(null); }}>
          ✏️ Modify User
        </button>
      </div>

      {/* CREATE USER */}
      {activeOption === 'create' && (
        <div className="create-user">
          <h3>➕ Create New User</h3>
          
          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="info-box">
              <span>📋 Required fields marked with *</span>
            </div>

            <div className="field-box">
              <label>👤 Username *</label>
              <input 
                name="create_username_field"
                autoComplete="off"
                type="text" 
                placeholder="Enter username (min 3 characters)" 
                value={newUserForm.username} 
                onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                className={validationErrors.username ? 'error' : ''}
              />
              {validationErrors.username && <div className="error-text">{validationErrors.username}</div>}
            </div>

            <div className="field-box">
              <label>🔐 Password *</label>
              <div className="password-wrapper">
                <input 
                  name="create_password_field"
                  autoComplete="new-password"
                  type={showCreatePassword ? 'text' : 'password'} 
                  placeholder="Enter password (min 4 characters)" 
                  value={newUserForm.password} 
                  onChange={(e) => { 
                    setNewUserForm({...newUserForm, password: e.target.value}); 
                    setPasswordStrength(checkPasswordStrength(e.target.value)); 
                  }}
                  className={validationErrors.password ? 'error' : ''}
                />
                <button type="button" className="password-toggle" onClick={() => setShowCreatePassword(!showCreatePassword)}>
                  {showCreatePassword ? '🙈' : '👁️'}
                </button>
              </div>
              {passwordStrength.message && <div className="helper-text" style={{ color: passwordStrength.color }}>{passwordStrength.message}</div>}
              {validationErrors.password && <div className="error-text">{validationErrors.password}</div>}
            </div>

            <div className="field-box">
              <label>📝 First Name *</label>
              <input 
                autoComplete="off"
                type="text" 
                placeholder="Enter first name" 
                value={newUserForm.firstname} 
                onChange={(e) => setNewUserForm({...newUserForm, firstname: e.target.value})}
                className={validationErrors.firstname ? 'error' : ''}
              />
              {validationErrors.firstname && <div className="error-text">{validationErrors.firstname}</div>}
            </div>

            <div className="field-box">
              <label>📝 Last Name *</label>
              <input 
                autoComplete="off"
                type="text" 
                placeholder="Enter last name" 
                value={newUserForm.lastname} 
                onChange={(e) => setNewUserForm({...newUserForm, lastname: e.target.value})}
                className={validationErrors.lastname ? 'error' : ''}
              />
              {validationErrors.lastname && <div className="error-text">{validationErrors.lastname}</div>}
            </div>

            <div className="field-box">
              <label>📧 Email *</label>
              <input 
                autoComplete="off"
                type="email" 
                placeholder="Enter email" 
                value={newUserForm.email} 
                onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                className={validationErrors.email ? 'error' : ''}
              />
              {validationErrors.email && <div className="error-text">{validationErrors.email}</div>}
            </div>

            <div className="field-box">
              <label>📱 Mobile *</label>
              <input 
                autoComplete="off"
                type="text" 
                placeholder="Enter 10 digit mobile" 
                value={newUserForm.mobile} 
                onChange={(e) => setNewUserForm({...newUserForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                maxLength="10"
                className={validationErrors.mobile ? 'error' : ''}
              />
              {newUserForm.mobile && <div className="helper-text" style={{ color: newUserForm.mobile.length === 10 ? '#4caf50' : '#ff9800' }}>{newUserForm.mobile.length}/10 digits</div>}
              {validationErrors.mobile && <div className="error-text">{validationErrors.mobile}</div>}
            </div>

            <div className="field-box">
              <label>👥 Role</label>
              <select value={newUserForm.Role} onChange={(e) => setNewUserForm({...newUserForm, Role: e.target.value})}>
                <option value="Audit User">Audit User</option>
                <option value="Center User">Center User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="btn-group">
              <button type="button" className="btn-green" onClick={handleCreate} disabled={loading}>
                {loading ? '⏳ Creating...' : '✅ Create User'}
              </button>
              <button type="button" className="btn-gray" onClick={resetForm}>
                🔄 Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW USERS */}
      {activeOption === 'view' && (
        <div className="view-user">
          <h3>👁️ Users List ({tableUsers.length})</h3>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {tableUsers.map((u, i) => (
                  <tr key={u._id || i}>
                    <td>{i + 1}</td>
                    <td><span className="username-badge">{u.username}</span></td>
                    <td>
                      <span style={{ fontFamily: 'monospace' }}>{visiblePasswords.has(i) ? u.password : '••••••'}</span>
                      <button onClick={() => togglePwd(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}>
                        {visiblePasswords.has(i) ? '🙈' : '👁️'}
                      </button>
                    </td>
                    <td>{u.firstname}</td>
                    <td>{u.lastname || '-'}</td>
                    <td>{u.email || '-'}</td>
                    <td>{u.mobile || '-'}</td>
                    <td><span className={`role-badge ${u.Role?.toLowerCase()}`}>{u.Role}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODIFY USER */}
      {activeOption === 'modify' && (
        <div className="modify-user">
          <h3>✏️ Modify User</h3>
          
          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <div className="field-box">
              <label>Select User to Modify:</label>
              <select value={selectedUser || ''} onChange={handleSelectUser}>
                <option value="">-- Select User --</option>
                {globalUsers.map(u => (
                  <option key={u._id || u.username} value={u.username}>
                    {u.username} ({u.firstname} {u.lastname})
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && (
              <div className="edit-section">
                <h4>✏️ Editing: {selectedUser}</h4>

                <div className="field-box">
                  <label>👤 Username</label>
                  <input value={editForm.username} disabled style={{ background: '#e9ecef', cursor: 'not-allowed' }} />
                  <div className="helper-text">Username cannot be changed</div>
                </div>

                <div className="field-box">
                  <label>🔐 Password</label>
                  <div className="password-wrapper">
                    <input 
                      autoComplete="new-password"
                      type={showEditPassword ? 'text' : 'password'} 
                      value={editForm.password} 
                      onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowEditPassword(!showEditPassword)}>
                      {showEditPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="field-box">
                  <label>📝 First Name</label>
                  <input autoComplete="off" value={editForm.firstname} onChange={(e) => setEditForm({...editForm, firstname: e.target.value})} />
                </div>

                <div className="field-box">
                  <label>📝 Last Name</label>
                  <input autoComplete="off" value={editForm.lastname} onChange={(e) => setEditForm({...editForm, lastname: e.target.value})} />
                </div>

                <div className="field-box">
                  <label>📧 Email</label>
                  <input autoComplete="off" type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                </div>

                <div className="field-box">
                  <label>📱 Mobile</label>
                  <input autoComplete="off" value={editForm.mobile} onChange={(e) => setEditForm({...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} maxLength="10" />
                </div>

                <div className="field-box">
                  <label>👥 Role</label>
                  <select value={editForm.Role} onChange={(e) => setEditForm({...editForm, Role: e.target.value})}>
                    <option value="Audit User">Audit User</option>
                    <option value="Center User">Center User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="btn-group">
                  <button type="button" className="btn-green" onClick={handleUpdate} disabled={loading}>
                    {loading ? '⏳' : '✅ Update'}
                  </button>
                  <button type="button" className="btn-red" onClick={handleDelete} disabled={loading}>
                    🗑️ Delete
                  </button>
                  <button type="button" className="btn-gray" onClick={() => { setSelectedUser(null); setEditForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', Role: 'Audit User' }); }}>
                    ❌ Cancel
                  </button>
                </div>

                <div className="warning-box">
                  <span>⚠️ Delete action is permanent and cannot be undone!</span>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement;