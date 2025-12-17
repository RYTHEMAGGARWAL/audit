import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../contexts/UsersContext';
import axios from 'axios';
import { API_URL } from '../config';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { setUsers, users } = useUsers();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // ========================================
  // FETCH USERS FROM MONGODB
  // ========================================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log('\n🔵 ========== LOGIN: LOADING USERS ==========');
        
        const response = await fetch(`${API_URL}/api/users`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const usersData = await response.json();
        console.log('🟢 Total users loaded:', usersData.length);
        console.log('🟢 Users:', usersData.map(u => u.username).join(', '));
        
        setUsers(usersData);
        console.log('🟢 ========================================\n');
        
      } catch (err) {
        console.error('🔴 Fetch users error:', err);
        console.error('🔴 Using fallback users');
        
        // Fallback users
        const fallbackUsers = [
          { username: 'admin', password: 'admin123', firstname: 'Admin', lastname: 'User', email: 'admin@niit.com', mobile: '1234567890', Role: 'Admin' },
          { username: 'user1', password: 'pass123', firstname: 'John', lastname: 'Doe', email: 'john@niit.com', mobile: '0987654321', Role: 'User' }
        ];
        setUsers(fallbackUsers);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [setUsers]);

  // ========================================
  // LOGIN HANDLER
  // ========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    console.log('\n🔐 ========== LOGIN ATTEMPT ==========');
    console.log('👤 Username:', username);

    try {
      // Try API login first
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Login successful via API');
        console.log('✅ Role:', data.user.Role);
        localStorage.setItem('loggedUser', JSON.stringify(data.user));
        
        // Navigate based on role (case insensitive)
        const role = data.user.Role?.toLowerCase();
        console.log('✅ Role (lowercase):', role);
        
        if (role === 'admin') {
          console.log('➡️ Redirecting to /admin');
          navigate('/admin');
        } else if (role === 'center user') {
          console.log('➡️ Redirecting to /center-dashboard');
          navigate('/center-dashboard');
        } else {
          console.log('➡️ Redirecting to /user-dashboard');
          navigate('/user-dashboard');
        }
        return;
      }
    } catch (err) {
      console.log('⚠️ API login failed, trying local validation');
    }

    // Fallback to local validation
    const user = users.find(
      u => u.username?.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (user) {
      console.log('✅ Login successful via local validation');
      console.log('✅ Role:', user.Role);
      localStorage.setItem('loggedUser', JSON.stringify(user));
      
      // Navigate based on role (case insensitive)
      const role = user.Role?.toLowerCase();
      console.log('✅ Role (lowercase):', role);
      
      if (role === 'admin') {
        console.log('➡️ Redirecting to /admin');
        navigate('/admin');
      } else if (role === 'center user') {
        console.log('➡️ Redirecting to /center-dashboard');
        navigate('/center-dashboard');
      } else {
        console.log('➡️ Redirecting to /user-dashboard');
        navigate('/user-dashboard');
      }
    } else {
      console.log('❌ Invalid credentials');
      setError('Invalid username or password!');
    }
  };

  // ========================================
  // FORGOT PASSWORD HANDLERS
  // ========================================
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/forgot-password/send-otp`, {
        email: forgotEmail
      });

      if (response.data.success) {
        setForgotMessage(response.data.message);
        setForgotStep(2);
        
        // For development - show OTP in console
        if (response.data.devOtp) {
          console.log('🔑 Development OTP:', response.data.devOtp);
        }
      }
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/forgot-password/verify-otp`, {
        email: forgotEmail,
        otp: otp
      });

      if (response.data.success) {
        setForgotMessage('OTP verified successfully!');
        setForgotStep(3);
      }
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match!');
      return;
    }

    if (newPassword.length < 4) {
      setForgotError('Password must be at least 4 characters!');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/forgot-password/reset-password`, {
        email: forgotEmail,
        newPassword: newPassword
      });

      if (response.data.success) {
        setForgotMessage('Password reset successfully! You can now login.');
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotStep(1);
          setForgotEmail('');
          setOtp('');
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      }
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotStep(1);
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotMessage('');
  };

  // ========================================
  // RENDER
  // ========================================
  if (loading) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Loading...</h2>
          <p>Please wait while we connect to the server.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        {!showForgotPassword ? (
          <>
            <h2>🔐 NIIT Audit System</h2>
            <p className="subtitle">Login to continue</p>
            
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              
              {error && <p className="error-message">{error}</p>}
              
              <button type="submit" className="login-btn">
                Login
              </button>
            </form>
            
            <p className="forgot-link" onClick={() => setShowForgotPassword(true)}>
              Forgot Password?
            </p>
          </>
        ) : (
          <>
            <h2>🔑 Reset Password</h2>
            
            {forgotStep === 1 && (
              <form onSubmit={handleSendOTP}>
                <p className="subtitle">Enter your email to receive OTP</p>
                <div className="input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                {forgotError && <p className="error-message">{forgotError}</p>}
                {forgotMessage && <p className="success-message">{forgotMessage}</p>}
                
                <button type="submit" className="login-btn" disabled={forgotLoading}>
                  {forgotLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <p className="subtitle">Enter the OTP sent to {forgotEmail}</p>
                <div className="input-group">
                  <label>OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                  />
                </div>
                
                {forgotError && <p className="error-message">{forgotError}</p>}
                {forgotMessage && <p className="success-message">{forgotMessage}</p>}
                
                <button type="submit" className="login-btn" disabled={forgotLoading}>
                  {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword}>
                <p className="subtitle">Enter your new password</p>
                <div className="input-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                
                {forgotError && <p className="error-message">{forgotError}</p>}
                {forgotMessage && <p className="success-message">{forgotMessage}</p>}
                
                <button type="submit" className="login-btn" disabled={forgotLoading}>
                  {forgotLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
            
            <p className="forgot-link" onClick={resetForgotPassword}>
              ← Back to Login
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;