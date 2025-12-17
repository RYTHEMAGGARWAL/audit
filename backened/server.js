// ========================================
// NIIT Audit System - MongoDB Server
// Gmail SMTP + PDF Version (LOCAL)
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

// User Schema - Using 'Role' (uppercase) to match frontend
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, default: '' },
  email: { type: String, default: '' },
  mobile: { type: String, default: '' },
  Role: { type: String, default: 'Audit User' },
  isActive: { type: Boolean, default: true },
  resetOTP: { type: String, default: null },
  resetOTPExpires: { type: Date, default: null }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Center Schema
const centerSchema = new mongoose.Schema({
  centerCode: { type: String, required: true, unique: true },
  centerName: { type: String, required: true },
  chName: { type: String, default: '' },
  geolocation: { type: String, default: '' },
  centerHeadName: { type: String, default: '' },
  zonalHeadName: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Center = mongoose.model('Center', centerSchema);

// Checkpoint Data Schema
const checkpointDataSchema = new mongoose.Schema({
  totalSamples: { type: String, default: '' },
  samplesCompliant: { type: String, default: '' },
  compliantPercent: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  centerHeadRemarks: { type: String, default: '' }
}, { _id: false });

// Audit Report Schema
const auditReportSchema = new mongoose.Schema({
  centerCode: { type: String, required: true },
  centerName: { type: String, required: true },
  chName: { type: String, default: '' },
  geolocation: { type: String, default: '' },
  centerHeadName: { type: String, default: '' },
  zonalHeadName: { type: String, default: '' },
  frontOfficeScore: { type: Number, default: 0 },
  deliveryProcessScore: { type: Number, default: 0 },
  placementScore: { type: Number, default: 0 },
  placementApplicable: { type: String, default: 'yes' },
  managementScore: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  auditStatus: { type: String, default: '' },
  auditDate: { type: Date, default: Date.now },
  auditDateString: { type: String, default: '' },
  remarksText: { type: String, default: '' },
  FO1: checkpointDataSchema, FO2: checkpointDataSchema, FO3: checkpointDataSchema,
  FO4: checkpointDataSchema, FO5: checkpointDataSchema,
  DP1: checkpointDataSchema, DP2: checkpointDataSchema, DP3: checkpointDataSchema,
  DP4: checkpointDataSchema, DP5: checkpointDataSchema, DP6: checkpointDataSchema,
  DP7: checkpointDataSchema, DP8: checkpointDataSchema, DP9: checkpointDataSchema,
  DP10: checkpointDataSchema, DP11: checkpointDataSchema,
  PP1: checkpointDataSchema, PP2: checkpointDataSchema, PP3: checkpointDataSchema, PP4: checkpointDataSchema,
  MP1: checkpointDataSchema, MP2: checkpointDataSchema, MP3: checkpointDataSchema,
  MP4: checkpointDataSchema, MP5: checkpointDataSchema,
  submissionStatus: { type: String, default: 'Not Submitted' },
  currentStatus: { type: String, default: 'Not Submitted' },
  approvedBy: { type: String, default: '' },
  submittedDate: { type: String, default: '' },
  centerRemarks: { type: String, default: '' },
  centerRemarksBy: { type: String, default: '' },
  centerRemarksDate: { type: String, default: '' },
  emailSent: { type: Boolean, default: false },
  emailSentDate: { type: String, default: '' },
  emailSentTo: { type: String, default: '' }
}, { timestamps: true });

const AuditReport = mongoose.model('AuditReport', auditReportSchema);

// OTP Schema
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }
});
const OTP = mongoose.model('OTP', otpSchema);

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://audit-seven-psi.vercel.app',
    'https://audit-git-main-rythem-aggarwals-projects.vercel.app'
  ],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'rythemaggarwal7840@gmail.com',
    pass: process.env.EMAIL_PASS || 'mcou dlaz bodo odwe'
  }
});

// ========================================
// AUTH ROUTES
// ========================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`\n🔐 ========== LOGIN ATTEMPT ==========`);
    console.log(`👤 Username: ${username}`);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user (case insensitive)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.password !== password) {
      console.log('❌ Wrong password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`✅ Login successful for ${username}`);
    console.log(`✅ Role: ${user.Role}`);

    // Return user with Role field
    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        mobile: user.mobile,
        Role: user.Role  // Frontend expects 'Role'
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// USER ROUTES
// ========================================
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// FORGOT PASSWORD ROUTES
// ========================================
app.post('/api/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    if (!user) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndDelete({ email: email.toLowerCase() });
    await new OTP({ email: email.toLowerCase(), otp }).save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - NIIT Audit System',
      html: `<h2>Your OTP is: <strong>${otp}</strong></h2><p>Valid for 10 minutes.</p>`
    });

    console.log(`📧 OTP sent to ${email}: ${otp}`);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpDoc = await OTP.findOne({ email: email.toLowerCase(), otp });
    
    if (!otpDoc) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forgot-password/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    await User.findOneAndUpdate(
      { email: { $regex: new RegExp(`^${email}$`, 'i') } },
      { password: newPassword }
    );
    await OTP.findOneAndDelete({ email: email.toLowerCase() });
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// AUDIT REPORT ROUTES
// ========================================
app.get('/api/audit-reports', async (req, res) => {
  try {
    const reports = await AuditReport.find({}).sort({ updatedAt: -1 });
    console.log(`📋 Audit reports fetched: ${reports.length}`);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit-reports/pending/count', async (req, res) => {
  try {
    const count = await AuditReport.countDocuments({ currentStatus: 'Pending with Supervisor' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit-reports/pending', async (req, res) => {
  try {
    const reports = await AuditReport.find({ currentStatus: 'Pending with Supervisor' }).sort({ submittedDate: 1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-audit-report', async (req, res) => {
  try {
    const data = req.body;
    console.log(`\n💾 Saving report for: ${data.centerCode} - ${data.centerName}`);

    const grandTotalNum = parseFloat(data.grandTotal) || 0;
    let auditStatus = 'Non-Compliant';
    if (grandTotalNum >= 80) auditStatus = 'Compliant';
    else if (grandTotalNum >= 65) auditStatus = 'Amber';

    const updateData = {
      centerCode: data.centerCode,
      centerName: data.centerName,
      chName: data.chName || '',
      geolocation: data.geolocation || '',
      centerHeadName: data.centerHeadName || '',
      zonalHeadName: data.zonalHeadName || '',
      frontOfficeScore: parseFloat(data.frontOfficeScore) || 0,
      deliveryProcessScore: parseFloat(data.deliveryProcessScore) || 0,
      placementScore: parseFloat(data.placementScore) || 0,
      placementApplicable: data.placementApplicable || 'yes',
      managementScore: parseFloat(data.managementScore) || 0,
      grandTotal: grandTotalNum,
      auditStatus: auditStatus,
      auditDateString: data.auditDate || new Date().toLocaleDateString('en-GB'),
      remarksText: data.remarksText || '',
      submissionStatus: 'Not Submitted',
      currentStatus: 'Not Submitted',
      emailSent: false,
      emailSentDate: '',
      emailSentTo: ''
    };

    const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
    checkpointIds.forEach(id => {
      if (data[id]) updateData[id] = data[id];
    });

    const report = await AuditReport.findOneAndUpdate(
      { centerCode: data.centerCode },
      updateData,
      { upsert: true, new: true }
    );

    console.log(`✅ Report saved for ${data.centerCode}`);
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit for approval
app.post('/api/audit-reports/:id/submit', async (req, res) => {
  try {
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

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
    const { approvedBy, adminName, remarks } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.currentStatus = 'Approved';
    report.approvedBy = approvedBy || adminName;
    if (remarks) report.remarksText = remarks;
    await report.save();

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject report
app.post('/api/audit-reports/:id/reject', async (req, res) => {
  try {
    const { remarks } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.currentStatus = 'Sent Back';
    report.submissionStatus = 'Not Submitted';
    if (remarks) report.remarksText = remarks;
    await report.save();

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update remarks
app.put('/api/audit-reports/:id/remarks', async (req, res) => {
  try {
    const { remarksText } = req.body;
    const report = await AuditReport.findByIdAndUpdate(
      req.params.id,
      { remarksText },
      { new: true }
    );
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Center Head Remarks
app.put('/api/audit-reports/:id/center-remarks', async (req, res) => {
  try {
    const { centerRemarksBy, centerUserName, checkpointRemarks } = req.body;
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.centerRemarksBy = centerRemarksBy || centerUserName;
    report.centerRemarksDate = new Date().toLocaleString('en-GB');

    if (checkpointRemarks) {
      Object.keys(checkpointRemarks).forEach(cpId => {
        if (report[cpId]) {
          const existingData = report[cpId].toObject ? report[cpId].toObject() : report[cpId];
          existingData.centerHeadRemarks = checkpointRemarks[cpId];
          report[cpId] = existingData;
          report.markModified(cpId);
        }
      });
    }

    await report.save();
    console.log(`✅ Center Head remarks saved for ${report.centerCode}`);
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// EMAIL ROUTE (Gmail SMTP + PDF)
// ========================================
app.post('/api/send-audit-email', async (req, res) => {
  try {
    const { to, cc, subject, message, reportData } = req.body;
    console.log(`\n📧 ========== SENDING AUDIT EMAIL ==========`);
    console.log(`📧 To: ${to}`);
    console.log(`📧 CC: ${cc || 'None'}`);
    console.log(`📧 Report: ${reportData?.centerName}`);

    // Generate PDF
    let pdfBuffer = null;
    try {
      console.log('📄 Generating PDF...');
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      const pdfHTML = generatePDFHTML(reportData);
      await page.setContent(pdfHTML, { waitUntil: 'domcontentloaded' });
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      await browser.close();
      console.log('📄 PDF generated successfully!');
    } catch (pdfErr) {
      console.error('⚠️ PDF generation failed:', pdfErr.message);
    }

    // Generate HTML email
    const emailHTML = generateEmailHTML(reportData, message);

    // Send email via Gmail SMTP
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'rythemaggarwal7840@gmail.com',
      to: to,
      cc: cc || undefined,
      subject: subject || generateEmailSubject(reportData),
      html: emailHTML,
      attachments: pdfBuffer ? [{
        filename: `Audit_Report_${reportData.centerCode}_${new Date().toISOString().split('T')[0]}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : []
    });

    console.log('✅ Email sent successfully!');

    // Update report
    if (reportData?._id) {
      await AuditReport.findByIdAndUpdate(reportData._id, {
        emailSent: true,
        emailSentDate: new Date().toLocaleString('en-GB'),
        emailSentTo: to
      });
      console.log(`✅ Email sent flag updated`);
    }

    console.log('📧 ==========================================\n');
    res.json({ success: true, message: 'Email sent successfully with PDF!' });
  } catch (err) {
    console.error('❌ Email error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================
// CENTERS ROUTES
// ========================================
app.get('/api/centers', async (req, res) => {
  try {
    const centers = await Center.find({ isActive: true }).sort({ centerCode: 1 });
    res.json(centers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/centers', async (req, res) => {
  try {
    const center = new Center(req.body);
    await center.save();
    res.json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// HEALTH CHECK
// ========================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    database: 'MongoDB Atlas',
    email: 'Gmail SMTP',
    pdf: 'Puppeteer',
    timestamp: new Date().toISOString() 
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 Email: Gmail SMTP ✅`);
  console.log(`🚀 PDF: Puppeteer ✅`);
  console.log(`🚀 Local: http://localhost:${PORT}`);
  console.log(`🚀 ========================================\n`);
});