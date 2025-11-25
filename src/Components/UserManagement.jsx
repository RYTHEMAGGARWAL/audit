import React, { useState, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { useUsers } from '../contexts/UsersContext';
import { API_URL } from '../config';
import './UserManagement.css';

const UserManagement = () => {
  const { users: globalUsers, setUsers: setGlobalUsers } = useUsers();
  const [activeOption, setActiveOption] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({ 
    username: '',
    password: '',
    firstname: '', 
    lastname: '', 
    email: '', 
    mobile: '', 
    Role: '' 
  });
  const [newUserForm, setNewUserForm] = useState({ 
    username: '', 
    password: '', 
    firstname: '', 
    lastname: '', 
    email: '', 
    mobile: '', 
    Role: 'User' 
  });
  const [tableUsers, setTableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());

  // Validation functions
  const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile) => {
    if (!mobile) return true;
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
  };

  const checkPasswordStrength = (password) => {
    if (!password) return { strength: '', color: '', message: '' };
    
    const length = password.length;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let strength = 0;
    if (length >= 8) strength++;
    if (hasUpperCase) strength++;
    if (hasLowerCase) strength++;
    if (hasNumbers) strength++;
    if (hasSpecialChar) strength++;
    
    if (strength <= 2) {
      return { strength: 'Weak', color: '#f44336', message: '❌ Too weak' };
    } else if (strength === 3) {
      return { strength: 'Medium', color: '#ff9800', message: '✅ Good (Medium)' };
    } else if (strength === 4) {
      return { strength: 'Strong', color: '#4caf50', message: '✅ Strong' };
    } else {
      return { strength: 'Very Strong', color: '#2196f3', message: '✅ Very Strong' };
    }
  };

  const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.text) return cell.value.text.toString().trim();
      if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('').trim();
      return '';
    }
    return cell.value.toString().trim();
  };

  const loadUsersData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users.xlsx?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      
      const loadedData = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          const user = {
            username: getCellValue(row.getCell(1)),
            password: getCellValue(row.getCell(2)),
            firstname: getCellValue(row.getCell(3)),
            lastname: getCellValue(row.getCell(4)),
            email: getCellValue(row.getCell(5)),
            mobile: getCellValue(row.getCell(6)),
            Role: getCellValue(row.getCell(7))
          };
          if (user.username) loadedData.push(user);
        }
      });

      console.log('Loaded:', loadedData.length, 'users');
      
      setTableUsers([...loadedData]);
      setGlobalUsers([...loadedData]);
      setForceUpdate(prev => prev + 1);
      
      return loadedData;
      
    } catch (err) {
      console.error('Load error:', err);
      const dummyData = [
        { username: 'admin', password: '123', firstname: 'Admin', lastname: 'User', email: 'admin@niit.com', mobile: '1234567890', Role: 'Admin' }
      ];
      setTableUsers([...dummyData]);
      setGlobalUsers([...dummyData]);
      return dummyData;
    } finally {
      setLoading(false);
    }
  };

  const saveToBackend = async (users) => {
    try {
      console.log('💾 Saving', users.length, 'users to backend...');
      
      const cleanUsers = users.map(user => ({
        username: String(user.username || ''),
        password: String(user.password || ''),
        firstname: String(user.firstname || ''),
        lastname: String(user.lastname || ''),
        email: String(user.email || ''),
        mobile: String(user.mobile || ''),
        Role: String(user.Role || 'User')
      }));

      const response = await axios.post(`${API_URL}/api/update-users`, { users: cleanUsers });
      console.log('✅ Backend response:', response.data);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      await loadUsersData();
      
      return true;
    } catch (err) {
      console.error('❌ Save error:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      alert(`❌ Failed to save to backend: ${err.response?.data?.error || err.message}`);
      return false;
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  const handleCreateOpen = async () => {
    if (activeOption !== 'create') {
      await loadUsersData();
      setActiveOption('create');
    }
  };

  // Handle password change with strength check
  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setNewUserForm({ ...newUserForm, password });
    const strength = checkPasswordStrength(password);
    setPasswordStrength(strength);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    // Username validation
    if (!newUserForm.username?.trim()) {
      errors.username = 'Username is required';
    } else if (newUserForm.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    // Password validation
    if (!newUserForm.password?.trim()) {
      errors.password = 'Password is required';
    } else {
      const strength = checkPasswordStrength(newUserForm.password);
      if (strength.strength === 'Weak') {
        errors.password = 'Password is too weak. Use at least 8 characters with mix of uppercase, lowercase, numbers';
      }
    }
    
    // Email validation
    if (newUserForm.email && !validateEmail(newUserForm.email)) {
      errors.email = 'Invalid email format (e.g., user@example.com)';
    }
    
    // Mobile validation
    if (newUserForm.mobile && !validateMobile(newUserForm.mobile)) {
      errors.mobile = 'Mobile must be exactly 10 digits';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddNewUser = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      alert('❌ Please fix the validation errors before submitting!');
      return;
    }
    
    // Check duplicate
    if (tableUsers.some(u => u.username.toLowerCase() === newUserForm.username.trim().toLowerCase())) {
      alert('❌ Username already exists!');
      return;
    }

    const newUser = {
      username: newUserForm.username.trim(),
      password: newUserForm.password.trim(),
      firstname: newUserForm.firstname.trim(),
      lastname: newUserForm.lastname.trim(),
      email: newUserForm.email.trim(),
      mobile: newUserForm.mobile.trim(),
      Role: newUserForm.Role
    };

    const updatedUsers = [...tableUsers, newUser];
    setTableUsers([...updatedUsers]);
    setGlobalUsers([...updatedUsers]);
    setForceUpdate(prev => prev + 1);

    const saveSuccess = await saveToBackend(updatedUsers);
    
    if (!saveSuccess) {
      alert('⚠️ User created locally but failed to save to server! Please check console for errors.');
      return;
    }

    // Reset
    setNewUserForm({ username: '', password: '', firstname: '', lastname: '', email: '', mobile: '', Role: 'User' });
    setPasswordStrength('');
    setValidationErrors({});

    alert('✅ User created and saved successfully!');
  };

  const handleUpdate = async () => {
    if (!selectedUser) {
      alert('Select user!');
      return;
    }

    // Validate email and mobile if provided
    if (editForm.email && !validateEmail(editForm.email)) {
      alert('❌ Invalid email format!');
      return;
    }
    
    if (editForm.mobile && !validateMobile(editForm.mobile)) {
      alert('❌ Mobile must be exactly 10 digits!');
      return;
    }

    const updatedUser = { 
      ...selectedUser, 
      firstname: editForm.firstname.trim(),
      lastname: editForm.lastname.trim(),
      email: editForm.email.trim(),
      mobile: editForm.mobile.trim(),
      Role: editForm.Role,
      password: editForm.password.trim() || selectedUser.password // Keep old if empty
    };
    
    const usersUpdated = globalUsers.map(u => 
      u.username === updatedUser.username ? updatedUser : u
    );

    setTableUsers([...usersUpdated]);
    setGlobalUsers([...usersUpdated]);
    setForceUpdate(prev => prev + 1);
    
    await saveToBackend(usersUpdated);
    
    setEditForm({ firstname: '', lastname: '', email: '', mobile: '', Role: '', password: '' });
    setSelectedUser(null);
    
    alert('✅ User updated successfully!');
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) {
      alert('Select user first!');
      return;
    }

    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to DELETE user "${selectedUser.username}"?\n\nThis action cannot be undone!`
    );

    if (!confirmDelete) return;

    const usersAfterDelete = globalUsers.filter(u => u.username !== selectedUser.username);
    
    setTableUsers([...usersAfterDelete]);
    setGlobalUsers([...usersAfterDelete]);
    setForceUpdate(prev => prev + 1);

    const success = await saveToBackend(usersAfterDelete);

    if (success) {
      alert(`✅ User "${selectedUser.username}" deleted successfully!`);
      setEditForm({ firstname: '', lastname: '', email: '', mobile: '', Role: '', password: '' });
      setSelectedUser(null);
    }
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = (username) => {
    const newSet = new Set(visiblePasswords);
    if (newSet.has(username)) {
      newSet.delete(username);
    } else {
      newSet.add(username);
    }
    setVisiblePasswords(newSet);
  };

  const handleRefresh = async () => {
    await loadUsersData();
  };

  const handleDownloadExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');
      worksheet.addRow(['username', 'password', 'firstname', 'lastname', 'email', 'mobile', 'Role']);
      worksheet.getRow(1).font = { bold: true };
      tableUsers.forEach(user => {
        worksheet.addRow([user.username, user.password, user.firstname, user.lastname, user.email, user.mobile, user.Role]);
      });
      worksheet.columns = [{ width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 25 }, { width: 15 }, { width: 10 }];
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `users_${Date.now()}.xlsx`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>⏳ Loading...</div>;

  return (
    <div style={{ padding: '20px' }} key={forceUpdate}>
      
      {/* Status Bar */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', padding: '15px 20px', marginBottom: '20px', borderRadius: '10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
          📊 Total Users: {tableUsers.length}
        </span>
        <button onClick={handleRefresh} style={{
          background: 'white', color: '#667eea', border: 'none',
          padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold'
        }}>
          🔄 Refresh
        </button>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button onClick={handleCreateOpen} style={{
          background: activeOption === 'create' ? '#2196F3' : '#e0e0e0',
          color: activeOption === 'create' ? 'white' : '#333',
          border: 'none', padding: '12px 30px', borderRadius: '8px',
          cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
        }}>Create User</button>
        <button onClick={() => setActiveOption(activeOption === 'view' ? '' : 'view')} style={{
          background: activeOption === 'view' ? '#2196F3' : '#e0e0e0',
          color: activeOption === 'view' ? 'white' : '#333',
          border: 'none', padding: '12px 30px', borderRadius: '8px',
          cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
        }}>View User</button>
        <button onClick={() => setActiveOption(activeOption === 'modify' ? '' : 'modify')} style={{
          background: activeOption === 'modify' ? '#2196F3' : '#e0e0e0',
          color: activeOption === 'modify' ? 'white' : '#333',
          border: 'none', padding: '12px 30px', borderRadius: '8px',
          cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
        }}>Modify User</button>
      </div>

      {/* CREATE - Centered Form */}
      {activeOption === 'create' && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-start', 
          minHeight: '80vh', 
          padding: '20px 0' 
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '100%',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '25px',
            background: 'white', 
            padding: '40px 30px', 
            borderRadius: '16px', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)', 
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ 
              color: '#2c3e50', 
              margin: '0 0 20px 0', 
              fontSize: '28px', 
              fontWeight: '700', 
              textAlign: 'center', 
              paddingBottom: '10px',
              borderBottom: '3px solid #667eea',
              letterSpacing: '0.5px'
            }}>
              ➕ Add New User
            </h3>

            <form onSubmit={handleAddNewUser} autoComplete="off" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px' 
            }}>
              {/* Username */}
              <div style={{ width: '100%' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#2c3e50', 
                  fontWeight: '600', 
                  fontSize: '14px' 
                }}>
                  👤 Username * (min 3 chars)
                </label>
                <input 
                  placeholder="Enter username" 
                  value={newUserForm.username} 
                  onChange={(e) => {
                    setNewUserForm({ ...newUserForm, username: e.target.value });
                    setValidationErrors({ ...validationErrors, username: '' });
                  }}
                  required
                  autoComplete="off"
                  name="new-username"
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    border: validationErrors.username ? '2px solid #f44336' : '2px solid #ddd',
                    width: '100%',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }} 
                />
                {validationErrors.username && (
                  <small style={{ color: '#f44336', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    {validationErrors.username}
                  </small>
                )}
              </div>

              {/* Password */}
              <div style={{ width: '100%', position: 'relative' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#2c3e50', 
                  fontWeight: '600', 
                  fontSize: '14px' 
                }}>
                  🔐 Password * (min 8 chars, medium strength)
                </label>
                <input 
                  placeholder="Enter password" 
                  type={showCreatePassword ? "text" : "password"} 
                  value={newUserForm.password} 
                  onChange={handlePasswordChange}
                  required
                  autoComplete="new-password"
                  name="new-password"
                  style={{ 
                    padding: '14px 40px 14px 16px', 
                    borderRadius: '10px', 
                    border: validationErrors.password ? '2px solid #f44336' : '2px solid #ddd',
                    width: '100%',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }} 
                />
                <button 
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#666'
                  }}
                >
                  {showCreatePassword ? '🙈' : '👁️'}
                </button>
                {passwordStrength && (
                  <small style={{ color: passwordStrength.color, fontSize: '12px', marginTop: '5px', display: 'block', fontWeight: 'bold' }}>
                    {passwordStrength.message}
                  </small>
                )}
                {validationErrors.password && (
                  <small style={{ color: '#f44336', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    {validationErrors.password}
                  </small>
                )}
              </div>

              {/* First Name */}
              <div style={{ width: '100%' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#2c3e50', 
                  fontWeight: '600', 
                  fontSize: '14px' 
                }}>
                  📝 First Name
                </label>
                <input 
                  placeholder="Enter first name" 
                  value={newUserForm.firstname} 
                  onChange={(e) => setNewUserForm({ ...newUserForm, firstname: e.target.value })} 
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    border: '2px solid #ddd',
                    width: '100%',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }} 
                />
              </div>

              {/* Last Name */}
              <div style={{ width: '100%' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#2c3e50', 
                  fontWeight: '600', 
                  fontSize: '14px' 
                }}>
                  📝 Last Name
                </label>
                <input 
                  placeholder="Enter last name" 
                  value={newUserForm.lastname} 
                  onChange={(e) => setNewUserForm({ ...newUserForm, lastname: e.target.value })} 
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    border: '2px solid #ddd',
                    width: '100%',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }} 
                />
              </div>

              {/* Email */}
              <div style={{ width: '100%' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#2c3e50', 
                  fontWeight: '600', 
                  fontSize: '14px' 
                }}>
                  📧 Email (user@example.com)
                </label>
                <input 
                  placeholder="Enter email" 
                  type="email"
                  value={newUserForm.email} 
                  onChange={(e) => {
                    setNewUserForm({ ...newUserForm, email: e.target.value });
                    setValidationErrors({ ...validationErrors, email: '' });
                  }}
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    border: validationErrors.email ? '2px solid #f44336' : '2px solid #ddd',
                    width: '100%',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }} 
                />
                {validationErrors.email && (
                  <small style={{ color: '#f44336', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    {validationErrors.email}
                  </small>
                )}
              </div>

              {/* Mobile */}
              <div style={{ width: '100%' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#2c3e50', 
                  fontWeight: '600', 
                  fontSize: '14px' 
                }}>
                  📱 Mobile (10 digits only)
                </label>
                <input 
                  placeholder="Enter mobile number" 
                  value={newUserForm.mobile} 
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewUserForm({ ...newUserForm, mobile: value });
                    setValidationErrors({ ...validationErrors, mobile: '' });
                  }}
                  maxLength="10"
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    border: validationErrors.mobile ? '2px solid #f44336' : '2px solid #ddd',
                    width: '100%',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }} 
                />
                {newUserForm.mobile && (
                  <small style={{ 
                    color: newUserForm.mobile.length === 10 ? '#4caf50' : '#ff9800', 
                    fontSize: '12px', 
                    marginTop: '5px', 
                    display: 'block',
                    fontWeight: 'bold'
                  }}>
                    {newUserForm.mobile.length}/10 digits
                  </small>
                )}
                {validationErrors.mobile && (
                  <small style={{ color: '#f44336', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    {validationErrors.mobile}
                  </small>
                )}
              </div>

              {/* Role */}
              <div style={{ width: '100%' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#2c3e50', 
                  fontWeight: '600', 
                  fontSize: '14px' 
                }}>
                  👥 Role
                </label>
                <select 
                  value={newUserForm.Role} 
                  onChange={(e) => setNewUserForm({ ...newUserForm, Role: e.target.value })} 
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: '10px', 
                    border: '2px solid #ddd',
                    width: '100%',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </form>

            {/* Validation Info Box - Centered */}
            <div style={{ 
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', 
              padding: '15px 20px', 
              borderRadius: '10px',
              margin: '0 auto 20px',
              maxWidth: '500px',
              borderLeft: '4px solid #2196f3',
              textAlign: 'left'
            }}>
              <p style={{ margin: '0 0 8px 0', color: '#1976d2', fontSize: '13px', fontWeight: 'bold' }}>
                📝 <strong>Validation Rules:</strong>
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#1565c0', fontSize: '12px' }}>
                <li>Username: Min 3 characters (Required)</li>
                <li>Password: Min 8 characters, Medium strength (Required)</li>
                <li>Email: Valid format like user@example.com (Optional)</li>
                <li>Mobile: Exactly 10 digits (Optional)</li>
              </ul>
            </div>

            {/* Submit Button - Centered */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="submit" onClick={handleAddNewUser} style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', padding: '16px 50px', borderRadius: '10px',
                cursor: 'pointer', fontSize: '18px', fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease'
              }}>
                ➕ Add User
              </button>
            </div>

            {/* Table - Full Width Below Form */}
            <div style={{ marginTop: '40px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                <h4 style={{ color: '#333', fontSize: '20px', margin: 0 }}>
                  📋 Current Users ({tableUsers.length})
                </h4>
                <button onClick={handleDownloadExcel} style={{ 
                  background: '#FF9800', 
                  color: 'white', 
                  border: 'none', 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                  💾 Download
                </button>
              </div>
              
              <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '2px solid #e0e0e0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'black' }}>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23, 21, 21, 0.2)' }}>S.No.</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23, 21, 21, 0.2)' }}>USERNAME</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>PASSWORD</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>FIRST NAME</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>LAST NAME</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>EMAIL</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>MOBILE</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>ROLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableUsers.length === 0 ? (
                      <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No users</td></tr>
                    ) : (
                      tableUsers.map((user, index) => (
                        <tr key={`${user.username}-${index}`} style={{ borderBottom: '1px solid #e0e0e0', background: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                          <td style={{ padding: '14px 12px', fontWeight: 'bold', color: '#666' }}>{index + 1}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                              {user.username}
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px', fontFamily: 'monospace', color: '#666', fontSize: '13px', position: 'relative' }}>
                            <span style={{ display: 'inline-block', minWidth: '80px' }}>
                              {visiblePasswords.has(user.username) ? (user.password || '-') : '••••••••'}
                            </span>
                            <button 
                              type="button"
                              onClick={() => togglePasswordVisibility(user.username)}
                              style={{
                                position: 'absolute',
                                right: '4px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '16px',
                                color: '#666',
                                padding: '0'
                              }}
                              title={visiblePasswords.has(user.username) ? 'Hide Password' : 'Show Password'}
                            >
                              {visiblePasswords.has(user.username) ? '🙈' : '👁️'}
                            </button>
                          </td>
                          <td style={{ padding: '14px 12px', fontSize: '14px', color: '#333' }}>{user.firstname || '-'}</td>
                          <td style={{ padding: '14px 12px', fontSize: '14px', color: '#333' }}>{user.lastname || '-'}</td>
                          <td style={{ padding: '14px 12px', fontSize: '13px', color: '#555' }}>{user.email || '-'}</td>
                          <td style={{ padding: '14px 12px', fontSize: '13px', color: '#555' }}>{user.mobile || '-'}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{
                              background: user.Role === 'Admin' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                              color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}>
                              {user.Role}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW */}
      {activeOption === 'view' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px' }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>👥 Users List ({globalUsers.length})</h3>
          {globalUsers.length === 0 ? <p>No users</p> : (
            <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '2px solid #e0e0e0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'black' }}>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>S.No.</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>USERNAME</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>PASSWORD</th>
                    <th style={{ padd33333ing: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>FIRST NAME</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>LAST NAME</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>EMAIL</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderRight: '1px solid rgba(23,21,21,0.2)' }}>MOBILE</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>ROLE</th>
                  </tr>
                </thead>
                <tbody>
                  {globalUsers.map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e0e0e0', background: i % 2 === 0 ? '#f8f9fa' : 'white' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 'bold', color: '#666' }}>{i + 1}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold' }}>{u.username}</span>
                      </td>
                      <td style={{ padding: '14px 12px', fontFamily: 'monospace', color: '#666', fontSize: '13px', position: 'relative' }}>
                        <span style={{ display: 'inline-block', minWidth: '80px' }}>
                          {visiblePasswords.has(u.username) ? u.password : '••••••••'}
                        </span>
                        <button 
                          type="button"
                          onClick={() => togglePasswordVisibility(u.username)}
                          style={{
                            position: 'absolute',
                            right: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#666',
                            padding: '0'
                          }}
                          title={visiblePasswords.has(u.username) ? 'Hide Password' : 'Show Password'}
                        >
                          {visiblePasswords.has(u.username) ? '🙈' : '👁️'}
                        </button>
                      </td>
                      <td style={{ padding: '14px 12px' }}>{u.firstname}</td>
                      <td style={{ padding: '14px 12px' }}>{u.lastname}</td>
                      <td style={{ padding: '14px 12px' }}>{u.email}</td>
                      <td style={{ padding: '14px 12px' }}>{u.mobile}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: u.Role === 'Admin' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                          {u.Role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODIFY - same as before */}
      {activeOption === 'modify' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px' }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>✏️ Modify / Delete User</h3>
          
          <select onChange={(e) => {
              const sel = globalUsers.find(u => u.username === e.target.value);
              setSelectedUser(sel);
              if (sel) setEditForm({ 
                username: sel.username || '',
                password: sel.password || '',
                firstname: sel.firstname || '', 
                lastname: sel.lastname || '', 
                email: sel.email || '', 
                mobile: sel.mobile || '', 
                Role: sel.Role || '' 
              });
            }} value={selectedUser?.username || ''} style={{ padding: '12px', width: '100%', maxWidth: '400px', marginBottom: '25px', borderRadius: '8px', border: '2px solid #ddd' }}>
            <option value="">-- Select User --</option>
            {globalUsers.map(u => <option key={u.username} value={u.username}>{u.username} ({u.firstname} {u.lastname})</option>)}
          </select>

          {selectedUser && (
            <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '10px' }}>
              <h4 style={{ marginBottom: '20px', color: '#555' }}>Editing User</h4>
              
              {/* Vertical Form with ALL 7 Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', maxWidth: '600px' }}>
                
                {/* Username */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                    👤 Username
                  </label>
                  <input 
                    name="username"
                    value={editForm.username} 
                    style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: '2px solid #ddd', 
                      width: '100%',
                      background: '#f5f5f5',
                      color: '#666'
                    }}
                    disabled
                  />
                  <small style={{ color: '#999', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Username cannot be changed (view only)
                  </small>
                </div>

                {/* Password */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                    🔐 Password
                  </label>
                  <input 
                    type={showEditPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter new password"
                    value={editForm.password} 
                    onChange={handleEditChange}
                    style={{ 
                      padding: '12px 40px 12px 12px', 
                      borderRadius: '8px', 
                      border: '2px solid #ddd', 
                      width: '100%'
                    }} 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#666'
                    }}
                  >
                    {showEditPassword ? '🙈' : '👁️'}
                  </button>
                  <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Current password shown. You can edit to change it.
                  </small>
                </div>

                {/* First Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                    📝 First Name
                  </label>
                  <input 
                    name="firstname" 
                    placeholder="First Name" 
                    value={editForm.firstname} 
                    onChange={handleEditChange} 
                    style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ddd', width: '100%' }} 
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                    📝 Last Name
                  </label>
                  <input 
                    name="lastname" 
                    placeholder="Last Name" 
                    value={editForm.lastname} 
                    onChange={handleEditChange} 
                    style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ddd', width: '100%' }} 
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                    📧 Email
                  </label>
                  <input 
                    name="email" 
                    type="email"
                    placeholder="Email" 
                    value={editForm.email} 
                    onChange={handleEditChange} 
                    style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ddd', width: '100%' }} 
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                    📱 Mobile
                  </label>
                  <input 
                    name="mobile" 
                    placeholder="Mobile (10 digits)" 
                    value={editForm.mobile} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditForm({ ...editForm, mobile: value });
                    }}
                    maxLength="10"
                    style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ddd', width: '100%' }} 
                  />
                  {editForm.mobile && (
                    <small style={{ 
                      color: editForm.mobile.length === 10 ? '#4caf50' : '#ff9800', 
                      fontSize: '12px', 
                      marginTop: '4px', 
                      display: 'block',
                      fontWeight: 'bold'
                    }}>
                      {editForm.mobile.length}/10 digits
                    </small>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
                    👥 Role
                  </label>
                  <select 
                    name="Role" 
                    value={editForm.Role} 
                    onChange={handleEditChange} 
                    style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ddd', width: '100%' }}
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleUpdate} style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(17, 153, 142, 0.3)' }}>
                  ✅ Update
                </button>
                <button onClick={handleDeleteUser} style={{ background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(235, 51, 73, 0.3)' }}>
                  🗑️ Delete
                </button>
                <button onClick={() => { 
                  setSelectedUser(null); 
                  setEditForm({ 
                    username: '', 
                    password: '', 
                    firstname: '', 
                    lastname: '', 
                    email: '', 
                    mobile: '', 
                    Role: '' 
                  }); 
                }} style={{ background: 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ❌ Cancel
                </button>
              </div>
              
              <div style={{ marginTop: '20px', padding: '15px 20px', background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', borderRadius: '8px', borderLeft: '4px solid #ff5722' }}>
                <p style={{ margin: 0, color: '#d84315', fontSize: '13px', fontWeight: '500' }}>
                  ⚠️ <strong>Warning:</strong> Deleting a user is permanent!
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;