// ========================================
// NIIT Audit System - MongoDB Server
// ========================================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const puppeteer = require('puppeteer');
const { generateEmailHTML, generatePDFHTML, generateEmailSubject } = require('./emailTemplate');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// MONGODB CONNECTION
// ========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rythemaggarwal7740_db_user:CARdq_7840.@niit-audit-cluster.tn2rvlx.mongodb.net/niit_audit?retryWrites=true&w=majority&appName=niit-audit-cluster';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('\n🍃 ========================================');
    console.log('🍃 MongoDB Atlas Connected Successfully!');
    console.log('🍃 Database: niit_audit');
    console.log('🍃 ========================================\n');
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ========================================
// SCHEMAS
// ========================================

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true, trim: true },
  lastname: { type: String, trim: true, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true, default: '' },
  role: { type: String, enum: ['Admin', 'Audit User', 'Center User'], default: 'Audit User' },
  isActive: { type: Boolean, default: true },
  resetOTP: { type: String, default: null },
  resetOTPExpires: { type: Date, default: null }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Center Schema
const centerSchema = new mongoose.Schema({
  centerCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  centerName: { type: String, required: true, trim: true },
  chName: { type: String, trim: true, default: '' },
  geolocation: { type: String, trim: true, default: '' },
  centerHeadName: { type: String, trim: true, default: '' },
  zonalHeadName: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Center = mongoose.model('Center', centerSchema);

// Audit Report Schema
const checkpointDataSchema = new mongoose.Schema({
  totalSamples: { type: String, default: '' },
  samplesCompliant: { type: String, default: '' },
  compliantPercent: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  centerHeadRemarks: { type: String, default: '' }
}, { _id: false });

const auditReportSchema = new mongoose.Schema({
  centerCode: { type: String, required: true, trim: true },
  centerName: { type: String, required: true, trim: true },
  chName: { type: String, trim: true, default: '' },
  geolocation: { type: String, trim: true, default: '' },
  centerHeadName: { type: String, trim: true, default: '' },
  zonalHeadName: { type: String, trim: true, default: '' },
  frontOfficeScore: { type: Number, default: 0 },
  deliveryProcessScore: { type: Number, default: 0 },
  placementScore: { type: Number, default: 0 },
  managementScore: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  auditDate: { type: Date, default: Date.now },
  auditDateString: { type: String, default: '' },
  // Checkpoints
  FO1: { type: checkpointDataSchema, default: () => ({}) },
  FO2: { type: checkpointDataSchema, default: () => ({}) },
  FO3: { type: checkpointDataSchema, default: () => ({}) },
  FO4: { type: checkpointDataSchema, default: () => ({}) },
  FO5: { type: checkpointDataSchema, default: () => ({}) },
  DP1: { type: checkpointDataSchema, default: () => ({}) },
  DP2: { type: checkpointDataSchema, default: () => ({}) },
  DP3: { type: checkpointDataSchema, default: () => ({}) },
  DP4: { type: checkpointDataSchema, default: () => ({}) },
  DP5: { type: checkpointDataSchema, default: () => ({}) },
  DP6: { type: checkpointDataSchema, default: () => ({}) },
  DP7: { type: checkpointDataSchema, default: () => ({}) },
  DP8: { type: checkpointDataSchema, default: () => ({}) },
  DP9: { type: checkpointDataSchema, default: () => ({}) },
  DP10: { type: checkpointDataSchema, default: () => ({}) },
  DP11: { type: checkpointDataSchema, default: () => ({}) },
  PP1: { type: checkpointDataSchema, default: () => ({}) },
  PP2: { type: checkpointDataSchema, default: () => ({}) },
  PP3: { type: checkpointDataSchema, default: () => ({}) },
  PP4: { type: checkpointDataSchema, default: () => ({}) },
  MP1: { type: checkpointDataSchema, default: () => ({}) },
  MP2: { type: checkpointDataSchema, default: () => ({}) },
  MP3: { type: checkpointDataSchema, default: () => ({}) },
  MP4: { type: checkpointDataSchema, default: () => ({}) },
  MP5: { type: checkpointDataSchema, default: () => ({}) },
  placementApplicable: { type: String, enum: ['yes', 'no'], default: 'yes' },
  submissionStatus: { type: String, default: 'Not Submitted' },
  currentStatus: { type: String, default: 'Not Submitted' },
  approvedBy: { type: String, default: '' },
  submittedDate: { type: String, default: '' },
  remarksText: { type: String, default: '' },
  // Center User Remarks
  centerRemarks: { type: String, default: '' },
  centerRemarksBy: { type: String, default: '' },
  centerRemarksDate: { type: String, default: '' },
  // Email Sent Status
  emailSent: { type: Boolean, default: false },
  emailSentDate: { type: String, default: '' },
  emailSentTo: { type: String, default: '' }
}, { timestamps: true });

const AuditReport = mongoose.model('AuditReport', auditReportSchema);

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://audit-seven-psi.vercel.app',
    'https://audit-git-main-rythem-aggarwals-projects.vercel.app',
    'https://audit-fh6x61p71-rythem-aggarwals-projects.vercel.app'
  ],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use('/public', express.static('public'));

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'rythemaggarwal7840@gmail.com',
    pass: process.env.EMAIL_PASS || 'mcou dlaz bodo odwe'
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000
});

// ========================================
// AUTH ROUTES
// ========================================

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`\n🔐 ========== LOGIN ATTEMPT ==========`);
    console.log(`👤 Username: ${username}`);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    });

    if (!user || user.password !== password) {
      console.log(`❌ Invalid credentials for ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log(`✅ Login successful for ${username}`);
    console.log(`✅ Role: ${user.role}`);

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        mobile: user.mobile,
        Role: user.role  // Frontend expects 'Role'
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Send OTP
app.post('/api/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`\n📧 ========== FORGOT PASSWORD ==========`);
    console.log(`📧 Email: ${email}`);

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetOTP = otp;
    user.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`✅ Generated OTP: ${otp}`);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - NIIT System',
      html: `<div style="font-family:Arial;padding:20px;"><h2>🔐 Password Reset</h2><p>Hello ${user.firstname},</p><p>Your OTP is: <strong style="font-size:24px;color:#667eea;">${otp}</strong></p><p>Valid for 10 minutes.</p></div>`
    };

    try {
      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'OTP sent to your email', email });
    } catch (emailErr) {
      console.log('⚠️ Email failed, OTP:', otp);
      res.json({ success: true, message: 'OTP generated (check console)', email, devOtp: otp });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
app.post('/api/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetOTP: otp,
      resetOTPExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified', username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Password
app.post('/api/forgot-password/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = newPassword;
    user.resetOTP = null;
    user.resetOTPExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// USERS ROUTES
// ========================================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).sort({ createdAt: -1 });
    const formatted = users.map(u => ({
      _id: u._id,
      username: u.username,
      password: u.password,
      firstname: u.firstname,
      lastname: u.lastname,
      email: u.email,
      mobile: u.mobile || '',
      Role: u.role
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, firstname, lastname, email, mobile, Role } = req.body;
    const user = new User({
      username: username.toLowerCase(),
      password,
      firstname,
      lastname,
      email: email.toLowerCase(),
      mobile,
      role: Role || 'User'
    });
    await user.save();
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      ...req.body,
      role: req.body.Role
    }, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update users (for backward compatibility)
app.post('/api/update-users', async (req, res) => {
  try {
    const users = req.body.users || req.body;
    console.log(`\n💾 ========== BULK UPDATE USERS ==========`);
    console.log(`💾 Total: ${users.length}`);

    for (const userData of users) {
      await User.findOneAndUpdate(
        { username: userData.username.toLowerCase() },
        {
          password: userData.password,
          firstname: userData.firstname,
          lastname: userData.lastname || '',
          email: userData.email?.toLowerCase(),
          mobile: userData.mobile || '',
          role: userData.Role || 'User',
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'Users updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// CENTERS ROUTES
// ========================================

// Get all centers
app.get('/api/centers', async (req, res) => {
  try {
    const centers = await Center.find({ isActive: true }).sort({ centerCode: 1 });
    const formatted = centers.map(c => ({
      _id: c._id,
      centerCode: c.centerCode,
      centerName: c.centerName,
      chName: c.chName || '',
      geolocation: c.geolocation || '',
      centerHeadName: c.centerHeadName || '',
      zonalHeadName: c.zonalHeadName || ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create center
app.post('/api/centers', async (req, res) => {
  try {
    const center = new Center({
      ...req.body,
      centerCode: req.body.centerCode.toUpperCase()
    });
    await center.save();
    res.status(201).json({ success: true, center });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update centers
app.post('/api/update-centers', async (req, res) => {
  try {
    const centers = Array.isArray(req.body) ? req.body : req.body.centers;
    console.log(`\n💾 ========== BULK UPDATE CENTERS ==========`);
    console.log(`💾 Total: ${centers.length}`);

    for (const centerData of centers) {
      await Center.findOneAndUpdate(
        { centerCode: centerData.centerCode.toUpperCase() },
        {
          centerName: centerData.centerName,
          chName: centerData.chName || '',
          geolocation: centerData.geolocation || '',
          centerHeadName: centerData.centerHeadName || '',
          zonalHeadName: centerData.zonalHeadName || '',
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'Centers updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// AUDIT REPORTS ROUTES
// ========================================

// Get all audit reports
app.get('/api/audit-reports', async (req, res) => {
  try {
    const reports = await AuditReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending count
app.get('/api/audit-reports/pending/count', async (req, res) => {
  try {
    const count = await AuditReport.countDocuments({ currentStatus: 'Pending with Supervisor' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending approvals
app.get('/api/audit-reports/pending', async (req, res) => {
  try {
    const reports = await AuditReport.find({ currentStatus: 'Pending with Supervisor' }).sort({ submittedDate: 1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/Update audit report
app.post('/api/save-audit-report', async (req, res) => {
  try {
    const data = req.body;
    console.log(`\n💾 ========== SAVING AUDIT REPORT ==========`);
    console.log(`💾 Center: ${data.centerCode} - ${data.centerName}`);
    console.log(`💾 Grand Total: ${data.grandTotal}/100`);

    // Parse audit data JSON if provided
    let auditData = {};
    if (data.auditDataJson) {
      try {
        auditData = typeof data.auditDataJson === 'string' ? JSON.parse(data.auditDataJson) : data.auditDataJson;
      } catch (e) {}
    }

    // Calculate audit status
    const grandTotalNum = parseFloat(data.grandTotal) || 0;
    let auditStatus = 'Non-Compliant';
    if (grandTotalNum >= 80) auditStatus = 'Compliant';
    else if (grandTotalNum >= 65) auditStatus = 'Amber';

    // Checkpoint names for readable display
    const checkpointNames = {
      FO1: "Enquires Entered in Pulse",
      FO2: "Enrolment form available in Pulse",
      FO3: "Pre assessment Available",
      FO4: "Documents uploaded in Pulse",
      FO5: "Availability of Marketing Material",
      DP1: "Batch file maintained",
      DP2: "Batch Heath Card available",
      DP3: "Attendance marked in EDL sheets",
      DP4: "BMS maintained",
      DP5: "FACT Certificate available",
      DP6: "Post Assessment if applicable",
      DP7: "Appraisal sheet maintained",
      DP8: "Appraisal status in Pulse",
      DP9: "Certification Status",
      DP10: "Student signature for certificates",
      DP11: "System vs actual certificate date",
      PP1: "Student Placement Response",
      PP2: "CGT/Guest Lecture/Industry Visit",
      PP3: "Placement Bank & Aging",
      PP4: "Placement Proof Upload",
      MP1: "Courseware issue/LMS Usage",
      MP2: "TIRM details register",
      MP3: "Monthly Centre Review Meeting",
      MP4: "Physical asset verification",
      MP5: "Verification of bill authenticity"
    };

    // Build readable checkpoint data
    const buildCheckpointTable = (prefix, areaName, checkpoints) => {
      let table = `\n📋 ${areaName}\n`;
      table += `┌────────┬────────────────────────────────────────┬─────────┬───────────┬─────────┬─────────┐\n`;
      table += `│ ID     │ Checkpoint                             │ Samples │ Compliant │ %       │ Score   │\n`;
      table += `├────────┼────────────────────────────────────────┼─────────┼───────────┼─────────┼─────────┤\n`;
      
      checkpoints.forEach(cpId => {
        const cp = data[cpId] || auditData[cpId] || {};
        const name = (checkpointNames[cpId] || cpId).substring(0, 38).padEnd(38);
        const samples = (cp.totalSamples || '-').toString().padStart(7);
        const compliant = (cp.samplesCompliant || '-').toString().padStart(9);
        const percent = cp.compliantPercent ? `${cp.compliantPercent.toFixed(1)}%`.padStart(7) : '    -  ';
        const score = cp.score ? cp.score.toFixed(2).padStart(7) : '   0.00';
        table += `│ ${cpId.padEnd(6)} │ ${name} │${samples} │${compliant} │${percent} │${score} │\n`;
      });
      
      table += `└────────┴────────────────────────────────────────┴─────────┴───────────┴─────────┴─────────┘`;
      return table;
    };

    const frontOfficeTable = buildCheckpointTable('FO', 'FRONT OFFICE (Max: 30)', ['FO1','FO2','FO3','FO4','FO5']);
    const deliveryTable = buildCheckpointTable('DP', 'DELIVERY PROCESS (Max: 40)', ['DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11']);
    const placementTable = data.placementApplicable === 'no' ? '\n📋 PLACEMENT PROCESS: NA (Not Applicable)' : buildCheckpointTable('PP', 'PLACEMENT PROCESS (Max: 15)', ['PP1','PP2','PP3','PP4']);
    const managementTable = buildCheckpointTable('MP', 'MANAGEMENT PROCESS (Max: 15)', ['MP1','MP2','MP3','MP4','MP5']);

    const updateData = {
      // ========== READABLE REPORT (VIEW THIS!) ==========
      _REPORT_VIEW: `
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📊 AUDIT REPORT                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Center Code    : ${data.centerCode.padEnd(20)}                              ║
║  Center Name    : ${(data.centerName || '').substring(0,20).padEnd(20)}                              ║
║  CH Name        : ${(data.chName || '-').substring(0,20).padEnd(20)}                              ║
║  Audit Date     : ${(data.auditDate || new Date().toLocaleDateString('en-GB')).padEnd(20)}                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  📈 SCORES SUMMARY                                                            ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Front Office     : ${parseFloat(data.frontOfficeScore || 0).toFixed(2).padStart(6)} / 30                                     ║
║  Delivery Process : ${parseFloat(data.deliveryProcessScore || 0).toFixed(2).padStart(6)} / 40                                     ║
║  Placement        : ${data.placementApplicable === 'no' ? '    NA     ' : parseFloat(data.placementScore || 0).toFixed(2).padStart(6) + ' / 15'}                                     ║
║  Management       : ${parseFloat(data.managementScore || 0).toFixed(2).padStart(6)} / 15                                     ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  🎯 GRAND TOTAL   : ${grandTotalNum.toFixed(2).padStart(6)} / 100    Status: ${auditStatus.padEnd(15)}            ║
╚══════════════════════════════════════════════════════════════════════════════╝
${frontOfficeTable}
${deliveryTable}
${placementTable}
${managementTable}
`,
      
      // ========== CENTER INFO ==========
      centerCode: data.centerCode,
      centerName: data.centerName,
      chName: data.chName || '',
      geolocation: data.geolocation || '',
      centerHeadName: data.centerHeadName || '',
      zonalHeadName: data.zonalHeadName || '',
      
      // ========== SCORES ==========
      frontOfficeScore: parseFloat(data.frontOfficeScore) || 0,
      deliveryProcessScore: parseFloat(data.deliveryProcessScore) || 0,
      placementScore: parseFloat(data.placementScore) || 0,
      placementApplicable: data.placementApplicable || 'yes',
      managementScore: parseFloat(data.managementScore) || 0,
      grandTotal: grandTotalNum,
      auditStatus: auditStatus,
      
      // ========== STATUS ==========
      auditDateString: data.auditDate || new Date().toLocaleDateString('en-GB'),
      submissionStatus: data.submissionStatus || 'Not Submitted',
      currentStatus: data.currentStatus || 'Not Submitted',
      approvedBy: data.approvedBy || '',
      submittedDate: data.submittedDate || '',
      remarksText: data.remarksText || '',
      
      // Reset email sent status when report is edited
      emailSent: false,
      emailSentDate: '',
      emailSentTo: '',
      
      // ========== CHECKPOINT DATA ==========
      ...(['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5']
        .reduce((acc, key) => { 
          if(data[key]) acc[key] = data[key]; 
          else if(auditData[key]) acc[key] = auditData[key]; 
          return acc; 
        }, {}))
    };
    
    console.log('💾 Saving placementApplicable:', data.placementApplicable);

    const report = await AuditReport.findOneAndUpdate(
      { centerCode: data.centerCode },
      updateData,
      { upsert: true, new: true }
    );

    console.log(`✅ Report saved for ${data.centerCode}`);
    res.json({ success: true, message: 'Audit report saved successfully', report });
  } catch (err) {
    console.error('❌ Save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bulk save reports (for Excel buffer compatibility)
app.post('/api/save-audit-reports', async (req, res) => {
  try {
    // This endpoint was for Excel buffer, now we just acknowledge it
    console.log('📋 Received bulk save request');
    res.json({ success: true, message: 'Reports processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit for approval
app.post('/api/audit-reports/:id/submit', async (req, res) => {
  try {
    const { userName } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.submissionStatus = 'Submitted';
    report.currentStatus = 'Pending with Supervisor';
    report.submittedDate = new Date().toLocaleString('en-GB');
    await report.save();

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve report
app.post('/api/audit-reports/:id/approve', async (req, res) => {
  try {
    const { adminName, remarks } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.currentStatus = 'Approved';
    report.approvedBy = adminName;
    report.remarksText = remarks || '';
    await report.save();

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject report
app.post('/api/audit-reports/:id/reject', async (req, res) => {
  try {
    const { adminName, remarks } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.currentStatus = 'Sent Back';
    report.remarksText = remarks;
    await report.save();

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Center User - Save center remarks
app.put('/api/audit-reports/:id/center-remarks', async (req, res) => {
  try {
    console.log('\n💬 ========== SAVING CENTER HEAD REMARKS ==========');
    const { centerRemarks, checkpointRemarks, centerUserName } = req.body;
    console.log('💬 Report ID:', req.params.id);
    console.log('💬 Center User:', centerUserName);
    console.log('💬 Checkpoint Remarks received:', checkpointRemarks);
    
    const report = await AuditReport.findById(req.params.id);
    if (!report) {
      console.log('❌ Report not found!');
      return res.status(404).json({ error: 'Report not found' });
    }

    // Save overall center remarks
    if (centerRemarks !== undefined) {
      report.centerRemarks = centerRemarks;
    }
    report.centerRemarksBy = centerUserName;
    report.centerRemarksDate = new Date().toLocaleString('en-GB');
    
    // Save checkpoint-wise center head remarks
    if (checkpointRemarks && Object.keys(checkpointRemarks).length > 0) {
      const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
      
      checkpointIds.forEach(cpId => {
        if (checkpointRemarks[cpId]) {
          console.log(`💬 Saving ${cpId}: "${checkpointRemarks[cpId]}"`);
          
          // Get existing checkpoint data or create new object
          const existingData = report[cpId] ? report[cpId].toObject() : {};
          
          // Add centerHeadRemarks to existing data
          existingData.centerHeadRemarks = checkpointRemarks[cpId];
          
          // Set the updated object back
          report[cpId] = existingData;
          
          // Mark as modified for Mongoose to detect change
          report.markModified(cpId);
        }
      });
    }
    
    await report.save();

    console.log(`✅ Center Head remarks saved for ${report.centerCode}`);
    console.log('💬 =============================================\n');
    res.json({ success: true, report });
  } catch (err) {
    console.error('❌ Error saving center remarks:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// EMAIL ROUTE
// ========================================
app.post('/api/send-audit-email', async (req, res) => {
  try {
    const { to, cc, subject, message, reportData, auditUserEmail } = req.body;
    console.log(`\n📧 ========== SENDING AUDIT EMAIL ==========`);
    console.log(`📧 To: ${to}`);
    console.log(`📧 CC: ${cc || 'None'}`);
    console.log(`📧 Report: ${reportData?.centerName}`);

    // Generate PDF from detailed report
    let pdfBuffer = null;
    try {
      console.log('📄 Generating PDF...');
      const browser = await puppeteer.launch({ 
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });
      const page = await browser.newPage();
      
      // Disable images and CSS for faster loading
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.resourceType() === 'image' || req.resourceType() === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      const pdfHTML = generatePDFHTML(reportData);
      await page.setContent(pdfHTML, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      pdfBuffer = await page.pdf({ 
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      await browser.close();
      console.log('📄 PDF generated successfully!');
    } catch (pdfErr) {
      console.error('⚠️ PDF generation failed:', pdfErr.message);
      // Continue without PDF if generation fails
    }

    // Generate HTML email content
    const emailHTML = generateEmailHTML(reportData, message);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      cc: cc || undefined,
      subject: subject || generateEmailSubject(reportData),
      html: emailHTML,
      attachments: pdfBuffer ? [{
        filename: `Audit_Report_${reportData.centerCode}_${new Date().toISOString().split('T')[0]}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : []
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    
    // Update report to mark email as sent
    if (reportData?._id) {
      await AuditReport.findByIdAndUpdate(reportData._id, {
        emailSent: true,
        emailSentDate: new Date().toLocaleString('en-GB'),
        emailSentTo: to
      });
      console.log(`✅ Email sent flag updated for report: ${reportData._id}`);
    }
    
    console.log('📧 ==========================================\n');
    res.json({ success: true, message: 'Email sent successfully with PDF attachment!' });
  } catch (err) {
    console.error('❌ Email error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================
// CENTERS ROUTES
// ========================================

// GET all centers
app.get('/api/centers', async (req, res) => {
  try {
    const centers = await Center.find({ isActive: true }).sort({ centerCode: 1 });
    console.log(`📍 Centers fetched: ${centers.length}`);
    res.json(centers);
  } catch (err) {
    console.error('❌ Error fetching centers:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST create center
app.post('/api/centers', async (req, res) => {
  try {
    const center = new Center(req.body);
    await center.save();
    console.log(`✅ Center created: ${center.centerCode}`);
    res.json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// HEALTH CHECK
// ========================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'MongoDB Atlas', timestamp: new Date().toISOString() });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`🚀 NIIT Audit System - MongoDB Server`);
  console.log(`🚀 Port: http://localhost:${PORT}`);
  console.log(`🚀 ========================================`);
  console.log(`\n✅ API Routes Ready!`);
  console.log(`   POST /api/login`);
  console.log(`   GET  /api/users`);
  console.log(`   GET  /api/centers`);
  console.log(`   GET  /api/audit-reports`);
  console.log(`   POST /api/save-audit-report`);
  console.log(`\n========================================\n`);
});