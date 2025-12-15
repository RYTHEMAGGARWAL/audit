const express = require('express');
const cors = require('cors');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// OTP Storage (in production, use Redis or database)
const otpStore = new Map(); // Format: { email: { otp, expiresAt, username } }

// Middleware
app.use(cors({ origin: ['http://localhost:5173','https://audit-murex.vercel.app','https://audit-gb4uarzdu-rythem-aggarwals-projects.vercel.app'], credentials: true }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '50mb' })); // ✅ ADDED FOR EXCEL BUFFER
app.use('/public', express.static('public'));

// Create public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public folder');
}

// ========================================
// EMAIL CONFIGURATION
// ========================================

// Configure Nodemailer transporter
// IMPORTANT: Replace with your actual email credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use: 'gmail', 'outlook', 'yahoo', etc.
  auth: {
    user: 'rythemaggarwal7840@gmail.com', // ⚠️ REPLACE THIS
    pass: 'mcou dlaz bodo odwe'      // ⚠️ REPLACE THIS (use App Password, not regular password)
  },
  // Add timeouts to prevent hanging
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 20000
});

// For Gmail: Enable "Less secure app access" OR use "App Password"
// Generate App Password: https://myaccount.google.com/apppasswords

// ========================================
// FORGOT PASSWORD ROUTES
// ========================================

// Send OTP to Email
app.post('/api/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log(`\n📧 ========== FORGOT PASSWORD: SEND OTP ==========`);
    console.log(`📧 Email: ${email}`);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email exists in users.xlsx
    const filePath = path.join(__dirname, 'public', 'users.xlsx');
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Users file not found`);
      return res.status(404).json({ error: 'User database not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    let userFound = false;
    let username = '';
    let firstname = '';
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) {
        const userEmail = row.getCell(5).value?.toString().trim().toLowerCase();
        if (userEmail === email.toLowerCase()) {
          userFound = true;
          username = row.getCell(1).value?.toString().trim();
          firstname = row.getCell(3).value?.toString().trim() || 'User';
        }
      }
    });

    if (!userFound) {
      console.log(`❌ Email not found: ${email}`);
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email.toLowerCase(), { otp, expiresAt, username });
    
    console.log(`✅ Generated OTP: ${otp} for ${email}`);
    console.log(`✅ Username: ${username}`);
    console.log(`✅ Expires in 10 minutes`);

    // Send Email
    const mailOptions = {
      from: 'your-email@gmail.com', // ⚠️ REPLACE THIS
      to: email,
      subject: 'Password Reset OTP - NIIT System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 20px 0; }
            .otp-box { background: #f0f8ff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
            .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${firstname}</strong>,</p>
              <p>We received a request to reset your password for your NIIT account (<strong>${username}</strong>).</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666;">Your OTP Code:</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Valid for 10 minutes</p>
              </div>

              <p>Please enter this OTP in the password reset form to continue.</p>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Never share this OTP with anyone</li>
                  <li>NIIT staff will never ask for your OTP</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>

              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 National Institute of Technology</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${email}`);
      console.log(`✅ ================================================\n`);
      
      res.json({ 
        success: true, 
        message: 'OTP sent to your email. Please check your inbox.',
        email: email
      });
    } catch (emailError) {
      console.error('❌ Email send error:', emailError.message);
      
      // For development: still return success with OTP in console
      console.log(`⚠️ Email failed, but OTP generated: ${otp}`);
      console.log(`✅ ================================================\n`);
      
      res.json({ 
        success: true, 
        message: 'OTP generated (Email service unavailable - check console)',
        email: email,
        devOtp: otp // Only for development! Remove in production
      });
    }
    
  } catch (err) {
    console.error('❌ Send OTP error:', err.message);
    res.status(500).json({ error: 'Failed to process request: ' + err.message });
  }
});

// Verify OTP
app.post('/api/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log(`\n🔍 ========== VERIFY OTP ==========`);
    console.log(`🔍 Email: ${email}`);
    console.log(`🔍 OTP: ${otp}`);

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedData = otpStore.get(email.toLowerCase());
    
    if (!storedData) {
      console.log(`❌ No OTP found for ${email}`);
      return res.status(400).json({ error: 'OTP expired or not requested' });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email.toLowerCase());
      console.log(`❌ OTP expired for ${email}`);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      console.log(`❌ Invalid OTP for ${email}. Expected: ${storedData.otp}, Got: ${otp}`);
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    console.log(`✅ OTP verified successfully for ${email}`);
    console.log(`✅ Username: ${storedData.username}`);
    console.log(`✅ ======================================\n`);
    
    res.json({ 
      success: true, 
      message: 'OTP verified successfully',
      username: storedData.username
    });
    
  } catch (err) {
    console.error('❌ Verify OTP error:', err.message);
    res.status(500).json({ error: 'Failed to verify OTP: ' + err.message });
  }
});

// Reset Password
app.post('/api/forgot-password/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    console.log(`\n🔑 ========== RESET PASSWORD ==========`);
    console.log(`🔑 Email: ${email}`);

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    // Get username from OTP store
    const storedData = otpStore.get(email.toLowerCase());
    
    if (!storedData) {
      console.log(`❌ Session expired for ${email}`);
      return res.status(400).json({ error: 'Session expired. Please restart the process.' });
    }

    const username = storedData.username;

    // Update password in users.xlsx
    const filePath = path.join(__dirname, 'public', 'users.xlsx');
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Users file not found`);
      return res.status(404).json({ error: 'User database not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    let passwordUpdated = false;
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) {
        const rowUsername = row.getCell(1).value?.toString().trim();
        if (rowUsername === username) {
          row.getCell(2).value = newPassword; // Update password
          passwordUpdated = true;
          console.log(`✅ Password updated for username: ${username}`);
        }
      }
    });

    if (!passwordUpdated) {
      console.log(`❌ Username not found: ${username}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Save updated workbook
    await workbook.xlsx.writeFile(filePath);
    
    // Clear OTP from store
    otpStore.delete(email.toLowerCase());
    
    console.log(`✅ Password reset successful for ${username}`);
    console.log(`✅ OTP cleared from store`);
    console.log(`✅ ======================================\n`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now login with your new password.'
    });
    
  } catch (err) {
    console.error('❌ Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

// ========================================
// USERS ROUTES
// ========================================

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`\n🔐 ========== LOGIN ATTEMPT ==========`);
    console.log(`👤 Username: ${username}`);

    if (!username || !password) {
      console.log(`❌ Missing credentials`);
      return res.status(400).json({ error: 'Username and password required' });
    }

    const filePath = path.join(__dirname, 'public', 'users.xlsx');
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Users file not found`);
      return res.status(404).json({ error: 'User database not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    let userFound = null;
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) {
        const rowUsername = row.getCell(1).value?.toString().trim();
        const rowPassword = row.getCell(2).value?.toString().trim();
        
        if (rowUsername === username && rowPassword === password) {
          userFound = {
            username: rowUsername,
            firstname: row.getCell(3).value?.toString().trim(),
            lastname: row.getCell(4).value?.toString().trim(),
            email: row.getCell(5).value?.toString().trim(),
            Role: row.getCell(6).value?.toString().trim()
          };
        }
      }
    });

    if (userFound) {
      console.log(`✅ Login successful for ${username}`);
      console.log(`✅ Role: ${userFound.Role}`);
      console.log(`✅ ====================================\n`);
      res.json({ success: true, user: userFound });
    } else {
      console.log(`❌ Invalid credentials for ${username}`);
      console.log(`❌ ====================================\n`);
      res.status(401).json({ error: 'Invalid username or password' });
    }
    
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Get Users
app.get('/api/users.xlsx', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'users.xlsx');
  
  console.log(`\n📤 ========== SERVING USERS FILE ==========`);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ Sending users.xlsx`);
    res.sendFile(filePath);
  } else {
    console.log(`⚠️ Creating new users.xlsx...`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    
    // Headers
    worksheet.addRow(['Username', 'Password', 'First Name', 'Last Name', 'Email', 'Role']);
    worksheet.getRow(1).font = { bold: true };
    
    // Default admin user
    worksheet.addRow(['admin', 'admin123', 'Admin', 'User', 'admin@niit.com', 'Admin']);
    
    worksheet.columns = [
      { width: 15 }, { width: 15 }, { width: 18 }, { width: 18 },
      { width: 25 }, { width: 10 }
    ];
    
    workbook.xlsx.writeFile(filePath).then(() => {
      console.log(`✅ Created users.xlsx with default admin`);
      res.sendFile(filePath);
    }).catch(err => {
      console.error('❌ Error creating file:', err);
      res.status(500).json({ error: 'Failed to create file' });
    });
  }
});

// Update Users
app.post('/api/update-users', async (req, res) => {
  try {
    // Frontend sends: { users: [...] }
    const users = req.body.users || req.body;
    
    console.log(`\n💾 ========== UPDATING USERS ==========`);
    console.log(`💾 Request body type:`, Array.isArray(req.body) ? 'Array' : 'Object');
    console.log(`💾 Users array:`, Array.isArray(users) ? 'Yes' : 'No');
    console.log(`💾 Total users: ${users.length}`);

    if (!Array.isArray(users)) {
      console.error('❌ Users is not an array:', users);
      return res.status(400).json({ error: 'Invalid payload: users must be an array' });
    }

    const filePath = path.join(__dirname, 'public', 'users.xlsx');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    
    // Headers
    worksheet.addRow(['Username', 'Password', 'First Name', 'Last Name', 'Email', 'Mobile', 'Role']);
    worksheet.getRow(1).font = { bold: true };
    
    // Add users
    users.forEach(user => {
      worksheet.addRow([
        user.username,
        user.password,
        user.firstname,
        user.lastname,
        user.email,
        user.mobile || '',
        user.Role
      ]);
    });
    
    // Column widths
    worksheet.columns = [
      { width: 15 }, { width: 15 }, { width: 18 }, { width: 18 },
      { width: 25 }, { width: 15 }, { width: 10 }
    ];

    await workbook.xlsx.writeFile(filePath);
    
    console.log(`✅ Users file updated: ${filePath}`);
    console.log(`✅ ====================================\n`);
    
    res.json({ success: true, message: 'Users updated successfully' });
    
  } catch (err) {
    console.error('❌ Update users error:', err.message);
    res.status(500).json({ error: 'Failed to save: ' + err.message });
  }
});

// ========================================
// CENTERS ROUTES
// ========================================

// Get Centers
app.get('/api/centers.xlsx', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'centers.xlsx');
  
  console.log(`\n📤 ========== SERVING CENTERS FILE ==========`);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ Sending centers.xlsx`);
    res.sendFile(filePath);
  } else {
    console.log(`⚠️ Creating new centers.xlsx...`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Centers');
    
    // Headers
    worksheet.addRow([
      'Center Code',
      'Center Name',
      'CH Name',
      'Geolocation',
      'Center Head Name',
      'Zonal Head Name'
    ]);
    worksheet.getRow(1).font = { bold: true };
    
    worksheet.columns = [
      { width: 15 }, { width: 25 }, { width: 18 }, { width: 25 },
      { width: 20 }, { width: 20 }
    ];
    
    workbook.xlsx.writeFile(filePath).then(() => {
      console.log(`✅ Created centers.xlsx`);
      res.sendFile(filePath);
    }).catch(err => {
      console.error('❌ Error creating file:', err);
      res.status(500).json({ error: 'Failed to create file' });
    });
  }
});

// Update Centers
app.post('/api/update-centers', async (req, res) => {
  try {
    const centers = req.body;
    
    console.log(`\n💾 ========== UPDATING CENTERS ==========`);
    console.log(`💾 Total centers: ${centers.length}`);

    const filePath = path.join(__dirname, 'public', 'centers.xlsx');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Centers');
    
    // Headers
    worksheet.addRow([
      'Center Code',
      'Center Name',
      'CH Name',
      'Geolocation',
      'Center Head Name',
      'Zonal Head Name'
    ]);
    worksheet.getRow(1).font = { bold: true };
    
    // Add centers
    centers.forEach(center => {
      worksheet.addRow([
        center.centerCode,
        center.centerName,
        center.chName,
        center.geolocation,
        center.centerHeadName,
        center.zonalHeadName
      ]);
    });
    
    // Column widths
    worksheet.columns = [
      { width: 15 }, { width: 25 }, { width: 18 }, { width: 25 },
      { width: 20 }, { width: 20 }
    ];

    await workbook.xlsx.writeFile(filePath);
    
    console.log(`✅ Centers file updated: ${filePath}`);
    console.log(`✅ ======================================\n`);
    
    res.json({ success: true, message: 'Centers updated successfully' });
    
  } catch (err) {
    console.error('❌ Update centers error:', err.message);
    res.status(500).json({ error: 'Failed to save: ' + err.message });
  }
});

// ========================================
// AUDIT REPORTS ROUTES
// ========================================

// Get Audit Reports
app.get('/api/audit-reports.xlsx', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'audit-reports.xlsx');
  
  console.log(`\n📤 ========== SERVING AUDIT REPORTS ==========`);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ Sending audit-reports.xlsx`);
    res.sendFile(filePath);
  } else {
    console.log(`⚠️ Creating new audit-reports.xlsx...`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Reports');
    
    // Headers with NEW columns for submission tracking
    worksheet.addRow([
      'Center Code',
      'Center Name',
      'CH Name',
      'Geolocation',
      'Center Head Name',
      'Zonal Head Name',
      'Front Office Score',
      'Delivery Process Score',
      'Placement Score',
      'Management Score',
      'Grand Total',
      'Audit Date',
      'Audit Data JSON',
      'Submission Status',    // NEW
      'Current Status',       // NEW
      'Approved By',          // NEW
      'Submitted Date',       // NEW
      'Remarks Text'          // NEW - Custom editable remarks
    ]);
    worksheet.getRow(1).font = { bold: true };
    
    worksheet.columns = [
      { width: 15 }, { width: 25 }, { width: 18 }, { width: 25 },
      { width: 20 }, { width: 20 }, { width: 18 }, { width: 20 },
      { width: 15 }, { width: 18 }, { width: 15 }, { width: 15 },
      { width: 50 }, { width: 20 }, { width: 25 }, { width: 20 }, { width: 15 }, { width: 30 }
    ];
    
    workbook.xlsx.writeFile(filePath).then(() => {
      console.log(`✅ Created audit-reports.xlsx with submission columns`);
      res.sendFile(filePath);
    }).catch(err => {
      console.error('❌ Error creating file:', err);
      res.status(500).json({ error: 'Failed to create file' });
    });
  }
});

// ✅✅✅ NEW ENDPOINT: Save Audit Reports (Excel Buffer) ✅✅✅
app.post('/api/save-audit-reports', (req, res) => {
  try {
    console.log(`\n💾 ========== SAVING AUDIT REPORTS (BUFFER) ==========`);
    
    const buffer = req.body;
    const filePath = path.join(__dirname, 'public', 'audit-reports.xlsx');
    
    // Write buffer to file
    fs.writeFileSync(filePath, buffer);
    
    console.log(`✅ Audit reports Excel file saved: ${filePath}`);
    console.log(`✅ File size: ${buffer.length} bytes`);
    console.log(`✅ ====================================================\n`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Audit reports saved successfully' 
    });
    
  } catch (error) {
    console.error('❌ Save audit reports error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Save Audit Report (JSON)
app.post('/api/save-audit-report', async (req, res) => {
  try {
    const reportData = req.body;
    
    console.log(`\n💾 ========== SAVING AUDIT REPORT (JSON) ==========`);
    console.log(`💾 Center: ${reportData.centerCode} - ${reportData.centerName}`);
    console.log(`💾 Grand Total: ${reportData.grandTotal}/100`);

    const filePath = path.join(__dirname, 'public', 'audit-reports.xlsx');
    
    let workbook;
    let worksheet;
    
    // Load existing or create new
    if (fs.existsSync(filePath)) {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      worksheet = workbook.worksheets[0];
      
      // Check if report exists for this center
      let reportExists = false;
      let existingRowNumber = null;
      
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          const centerCode = row.getCell(1).value?.toString().trim();
          if (centerCode === reportData.centerCode) {
            reportExists = true;
            existingRowNumber = rowNumber;
          }
        }
      });
      
      if (reportExists && existingRowNumber) {
        // Update existing report
        console.log(`📝 Updating existing report for ${reportData.centerCode}`);
        const row = worksheet.getRow(existingRowNumber);
        row.getCell(1).value = reportData.centerCode;
        row.getCell(2).value = reportData.centerName;
        row.getCell(3).value = reportData.chName;
        row.getCell(4).value = reportData.geolocation;
        row.getCell(5).value = reportData.centerHeadName;
        row.getCell(6).value = reportData.zonalHeadName;
        row.getCell(7).value = reportData.frontOfficeScore;
        row.getCell(8).value = reportData.deliveryProcessScore;
        row.getCell(9).value = reportData.placementScore;
        row.getCell(10).value = reportData.managementScore;
        row.getCell(11).value = reportData.grandTotal;
        row.getCell(12).value = reportData.auditDate;
        row.getCell(13).value = reportData.auditDataJson;
        row.commit();
      } else {
        // Add new report
        console.log(`➕ Adding new report for ${reportData.centerCode}`);
        worksheet.addRow([
          reportData.centerCode,
          reportData.centerName,
          reportData.chName,
          reportData.geolocation,
          reportData.centerHeadName,
          reportData.zonalHeadName,
          reportData.frontOfficeScore,
          reportData.deliveryProcessScore,
          reportData.placementScore,
          reportData.managementScore,
          reportData.grandTotal,
          reportData.auditDate,
          reportData.auditDataJson,
          'Not Submitted',  // Default submission status
          'Not Submitted',  // Default current status
          '',               // Approved by
          ''                // Submitted date
        ]);
      }
    } else {
      // Create new workbook
      console.log(`📄 Creating new audit-reports.xlsx`);
      workbook = new ExcelJS.Workbook();
      worksheet = workbook.addWorksheet('Audit Reports');
      
      // Headers
      worksheet.addRow([
        'Center Code',
        'Center Name',
        'CH Name',
        'Geolocation',
        'Center Head Name',
        'Zonal Head Name',
        'Front Office Score',
        'Delivery Process Score',
        'Placement Score',
        'Management Score',
        'Grand Total',
        'Audit Date',
        'Audit Data JSON',
        'Submission Status',
        'Current Status',
        'Approved By',
        'Submitted Date'
      ]);
      worksheet.getRow(1).font = { bold: true };
      
      // Add report
      worksheet.addRow([
        reportData.centerCode,
        reportData.centerName,
        reportData.chName,
        reportData.geolocation,
        reportData.centerHeadName,
        reportData.zonalHeadName,
        reportData.frontOfficeScore,
        reportData.deliveryProcessScore,
        reportData.placementScore,
        reportData.managementScore,
        reportData.grandTotal,
        reportData.auditDate,
        reportData.auditDataJson,
        'Not Submitted',
        'Not Submitted',
        '',
        ''
      ]);
      
      // Column widths
      worksheet.columns = [
        { width: 15 }, { width: 25 }, { width: 18 }, { width: 25 },
        { width: 20 }, { width: 20 }, { width: 18 }, { width: 20 },
        { width: 15 }, { width: 18 }, { width: 15 }, { width: 15 },
        { width: 50 }, { width: 20 }, { width: 25 }, { width: 20 }, { width: 15 }
      ];
    }

    // Save file
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`✅ File saved: ${filePath}`);
    console.log(`✅ ==========================================\n`);
    
    res.json({ 
      success: true, 
      message: 'Audit report saved successfully'
    });
    
  } catch (err) {
    console.error('❌ Save audit error:', err.message);
    res.status(500).json({ error: 'Failed to save: ' + err.message });
  }
});

// ========================================
// START SERVER
// ========================================

// ✅ NEW ENDPOINT: Send Audit Report Email
app.post('/api/send-audit-email', async (req, res) => {
  try {
    const { to, cc, subject, message, reportData } = req.body;

    console.log(`\n📧 ========== SENDING AUDIT REPORT EMAIL ==========`);
    console.log(`📧 To: ${to}`);
    console.log(`📧 Cc: ${cc || 'None'}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Report: ${reportData?.centerName || 'N/A'}`);

    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ success: false, error: 'Invalid recipient email format' });
    }

    const mailOptions = {
      from: 'Rythemaggarwal7840@gmail.com', // Your email
      to: to,
      cc: cc || undefined,
      subject: subject || 'Audit Report',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 20px 0; line-height: 1.8; }
            .score-box { background: #f0f8ff; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 10px; }
            .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .score-item { background: #f8f9fa; padding: 12px; border-radius: 8px; }
            .score-label { color: #666; font-size: 13px; }
            .score-value { font-size: 20px; font-weight: bold; color: #333; }
            .grand-total { text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; margin-top: 15px; }
            .grand-total .value { font-size: 48px; font-weight: bold; }
            .status-badge { display: inline-block; padding: 8px 20px; border-radius: 25px; font-weight: bold; font-size: 14px; }
            .compliant { background: #d4edda; color: #155724; }
            .amber { background: #fff3cd; color: #856404; }
            .non-compliant { background: #f8d7da; color: #721c24; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
            pre { white-space: pre-wrap; background: #f8f9fa; padding: 20px; border-radius: 8px; font-family: inherit; line-height: 1.8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Audit Report</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${reportData?.centerName || 'Center Name'}</p>
            </div>
            
            <div class="content">
              <pre>${message}</pre>
              
              ${reportData ? `
              <div class="score-box">
                <h3 style="margin: 0 0 15px 0; color: #333;">📊 Score Summary</h3>
                <div class="score-grid">
                  <div class="score-item">
                    <div class="score-label">Front Office (30)</div>
                    <div class="score-value">${reportData.frontOfficeScore}</div>
                  </div>
                  <div class="score-item">
                    <div class="score-label">Delivery Process (40)</div>
                    <div class="score-value">${reportData.deliveryProcessScore}</div>
                  </div>
                  <div class="score-item">
                    <div class="score-label">Placement (15)</div>
                    <div class="score-value">${reportData.placementScore}</div>
                  </div>
                  <div class="score-item">
                    <div class="score-label">Management (15)</div>
                    <div class="score-value">${reportData.managementScore}</div>
                  </div>
                </div>
                
                <div class="grand-total">
                  <div style="font-size: 14px; opacity: 0.9;">Grand Total</div>
                  <div class="value">${reportData.grandTotal}/100</div>
                  <div style="margin-top: 10px;">
                    <span class="status-badge ${
                      parseFloat(reportData.grandTotal) >= 80 ? 'compliant' : 
                      parseFloat(reportData.grandTotal) >= 65 ? 'amber' : 'non-compliant'
                    }">
                      ${
                        parseFloat(reportData.grandTotal) >= 80 ? '✅ Compliant' : 
                        parseFloat(reportData.grandTotal) >= 65 ? '⚠️ Amber' : '❌ Non-Compliant'
                      }
                    </span>
                  </div>
                </div>
              </div>
              ` : ''}
            </div>
            
            <div class="footer">
              <p>This is an automated email from the Audit Management System</p>
              <p>Sent on: ${new Date().toLocaleString('en-GB')}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log(`📧 Attempting to send email...`);
    
    await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`✅ ================================================\n`);

    res.json({ success: true, message: 'Email sent successfully' });

  } catch (err) {
    console.error('❌ Send email error:', err.message);
    console.error('❌ Full error:', err);
    
    // Provide specific error messages
    let errorMessage = err.message;
    if (err.code === 'EAUTH') {
      errorMessage = 'Email authentication failed! Check Gmail App Password.';
    } else if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
      errorMessage = 'Connection to email server failed. Check internet connection.';
    } else if (err.code === 'EENVELOPE') {
      errorMessage = 'Invalid email address format.';
    }
    
    res.status(500).json({ success: false, error: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`🚀 NIIT Backend Server Running`);
  console.log(`🚀 Port: http://localhost:${PORT}`);
  console.log(`🚀 Public folder: ${publicDir}`);
  console.log(`🚀 ========================================`);
  console.log(`\n✅ Available Routes:`);
  console.log(`   📊 Users:`);
  console.log(`      GET  /api/users.xlsx`);
  console.log(`      POST /api/update-users`);
  console.log(`      POST /api/login`);
  console.log(`   🔐 Forgot Password:`);
  console.log(`      POST /api/forgot-password/send-otp`);
  console.log(`      POST /api/forgot-password/verify-otp`);
  console.log(`      POST /api/forgot-password/reset-password`);
  console.log(`   🏢 Centers:`);
  console.log(`      GET  /api/centers.xlsx`);
  console.log(`      POST /api/update-centers`);
  console.log(`   📋 Audit Reports:`);
  console.log(`      GET  /api/audit-reports.xlsx`);
  console.log(`      POST /api/save-audit-report`);
  console.log(`      POST /api/save-audit-reports ⭐ NEW!`);
  console.log(`\n========================================\n`);
});