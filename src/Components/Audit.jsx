import React, { useState, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { API_URL } from '../config';
import './Audit.css';

const AuditManagement = () => {
  const [activeOption, setActiveOption] = useState('');
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showAuditTable, setShowAuditTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [editableRemarks, setEditableRemarks] = useState({});
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedReportForEmail, setSelectedReportForEmail] = useState(null);
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // NEW: Track if editing existing report & store center head remarks
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [centerHeadRemarksData, setCenterHeadRemarksData] = useState({});
  
  // NEW: Center Head Remarks Modal state for View Reports
  const [showCenterRemarksModal, setShowCenterRemarksModal] = useState(false);
  const [selectedReportForRemarks, setSelectedReportForRemarks] = useState(null);
  
  // NEW: Placement Applicable state
  const [placementApplicable, setPlacementApplicable] = useState(null); // null = not selected, 'yes' or 'no'

  // Get logged user info
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  const isAdmin = loggedUser.Role === 'Admin';

  // Audit Areas Data - 4 AREAS (Dynamic based on placementApplicable)
  // When Placement is NOT applicable, redistribute 15 points: +5 to each other area
  const isPlacementNA = placementApplicable === 'no';
  
  const auditAreas = [
    {
      areaNumber: 1,
      areaName: "Front Office",
      totalScore: isPlacementNA ? 35 : 30, // 30 + 5 = 35
      checkpoints: [
        { id: "FO1", checkPoint: "Enquires Entered in Pulse(Y/N)", weightage: 30, maxScore: isPlacementNA ? 10.5 : 9 },
        { id: "FO2", checkPoint: "Enrolment form available in Pulse(Y/N)", weightage: 20, maxScore: isPlacementNA ? 7 : 6 },
        { id: "FO3", checkPoint: "Pre assessment Available(Y/N)", weightage: 0, maxScore: 0 },
        { id: "FO4", checkPoint: "Documents uploaded in Pulse(Y/N)", weightage: 40, maxScore: isPlacementNA ? 14 : 12 },
        { id: "FO5", checkPoint: "Availability of Marketing Material(Y/N)", weightage: 10, maxScore: isPlacementNA ? 3.5 : 3 }
      ]
    },
    {
      areaNumber: 2,
      areaName: "Delivery Process",
      totalScore: isPlacementNA ? 45 : 40, // 40 + 5 = 45
      checkpoints: [
        { id: "DP1", checkPoint: "Batch file maintained for all running batches", weightage: 15, maxScore: isPlacementNA ? 6.75 : 6 },
        { id: "DP2", checkPoint: "Batch Heath Card available for all batches where batch duration is >= 30 days", weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: "DP3", checkPoint: "Attendance marked in EDL sheets correctly", weightage: 15, maxScore: isPlacementNA ? 6.75 : 6 },
        { id: "DP4", checkPoint: "BMS maintained with observations >= 30 days", weightage: 5, maxScore: isPlacementNA ? 2.25 : 2 },
        { id: "DP5", checkPoint: "FACT Certificate available at Center (Y/N)", weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: "DP6", checkPoint: "Post Assessment if applicable", weightage: 0, maxScore: 0 },
        { id: "DP7", checkPoint: "Appraisal sheet is maintained (Y/N)", weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: "DP8", checkPoint: "Appraisal status updated in Pulse(Y/N)", weightage: 5, maxScore: isPlacementNA ? 2.25 : 2 },
        { id: "DP9", checkPoint: "Certification Status of eligible students", weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: "DP10", checkPoint: "Student signature obtained while issuing certificates", weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 },
        { id: "DP11", checkPoint: "Verification between System issue date Vs actual certificate issue date", weightage: 10, maxScore: isPlacementNA ? 4.5 : 4 }
      ]
    },
    {
      areaNumber: 3,
      areaName: "Placement Process",
      totalScore: isPlacementNA ? 0 : 15, // NA = 0
      isNA: isPlacementNA, // Flag to show NA
      checkpoints: [
        { id: "PP1", checkPoint: "Student Placement Response", weightage: 15, maxScore: isPlacementNA ? 0 : 2.25 },
        { id: "PP2", checkPoint: "CGT/ Guest Lecture/ Industry Visit Session and Intern Preparation", weightage: 10, maxScore: isPlacementNA ? 0 : 1.50 },
        { id: "PP3", checkPoint: "Placement Bank & Aging", weightage: 15, maxScore: isPlacementNA ? 0 : 2.25 },
        { id: "PP4", checkPoint: "Placement Proof Upload", weightage: 60, maxScore: isPlacementNA ? 0 : 9.00 }
      ]
    },
    {
      areaNumber: 4,
      areaName: "Management Process",
      totalScore: isPlacementNA ? 20 : 15, // 15 + 5 = 20
      checkpoints: [
        { id: "MP1", checkPoint: "Courseware issue to students done on time/Usage of LMS", weightage: 5, maxScore: 0.75 },
        { id: "MP2", checkPoint: "TIRM details register", weightage: 20, maxScore: 3.00 },
        { id: "MP3", checkPoint: "Monthly Centre Review Meeting is conducted", weightage: 35, maxScore: 5.25 },
        { id: "MP4", checkPoint: "Physcial asset verification", weightage: 30, maxScore: 4.50 },
        { id: "MP5", checkPoint: "Verification of bill authenticity", weightage: 10, maxScore: 1.50 }
      ]
    }
  ];

  const [auditData, setAuditData] = useState({});

  const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.text) return cell.value.text.toString().trim();
      if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('').trim();
      return '';
    }
    return cell.value.toString().trim();
  };

  // Load centers from MongoDB
  const loadCenters = async () => {
    try {
      setLoading(true);
      console.log('📍 Loading centers from MongoDB...');
      const response = await fetch(`${API_URL}/api/centers`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const centersData = await response.json();
      console.log('✅ Centers loaded:', centersData.length);
      setCenters(centersData);
    } catch (err) {
      console.error('❌ Error loading centers:', err);
      setCenters([]);
    } finally {
      setLoading(false);
    }
  };

  // Load saved reports from MongoDB
  const loadSavedReports = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading audit reports from MongoDB...');
      const response = await fetch(`${API_URL}/api/audit-reports`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reports = await response.json();
      console.log('✅ Reports loaded:', reports.length);
      console.log('📊 Sample report placementApplicable:', reports[0]?.placementApplicable);
      
      // Transform MongoDB data to match expected format
      const formattedReports = reports.map(r => ({
        ...r,
        _id: r._id,
        frontOfficeScore: r.frontOfficeScore?.toString() || '0',
        deliveryProcessScore: r.deliveryProcessScore?.toString() || '0',
        placementScore: r.placementScore?.toString() || '0',
        managementScore: r.managementScore?.toString() || '0',
        grandTotal: r.grandTotal?.toString() || '0',
        auditDate: r.auditDateString || r.auditDate || '',
        placementApplicable: r.placementApplicable || 'yes',
        submissionStatus: r.submissionStatus || 'Not Submitted',
        currentStatus: r.currentStatus || 'Not Submitted',
        approvedBy: r.approvedBy || '',
        submittedDate: r.submittedDate || '',
        remarksText: r.remarksText || ''
      }));
      
      setSavedReports(formattedReports);
      
      // Initialize editable remarks
      const remarksObj = {};
      formattedReports.forEach(report => {
        remarksObj[report.centerCode] = report.remarksText || '';
      });
      setEditableRemarks(remarksObj);
      
      setForceUpdate(prev => prev + 1);
    } catch (err) {
      console.error('❌ Error loading reports:', err);
      setSavedReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize audit data
  const initializeAuditData = () => {
    const initialData = {};
    auditAreas.forEach(area => {
      area.checkpoints.forEach(cp => {
        initialData[cp.id] = {
          totalSamples: '',
          samplesCompliant: '',
          compliantPercent: 0,
          score: 0,
          remarks: '' // Add remarks field
        };
      });
    });
    setAuditData(initialData);
  };

  const handleOptionClick = (option) => {
    setActiveOption(option);
    setSelectedCenter(null);
    setShowAuditTable(false);
    setEditableRemarks({}); // Clear remarks when switching tabs
    setPlacementApplicable(null); // Reset placement selection
    
    if (option === 'create') {
      loadCenters();
    } else if (option === 'view') {
      loadSavedReports();
    }
  };

  const handleCenterSelect = async (center) => {
    // Check if report already exists in MongoDB
    let existingReport = null;
    
    try {
      const response = await fetch(`${API_URL}/api/audit-reports`);
      if (response.ok) {
        const reports = await response.json();
        const found = reports.find(r => r.centerCode === center.centerCode);
        if (found) {
          existingReport = found;
        }
      }
    } catch (err) {
      console.error('Error checking existing audit:', err);
    }

    // If report exists, ask user
    if (existingReport) {
      const choice = window.confirm(
        '⚠️ This center already has a saved report!\n\n' +
        '✅ Click OK to EDIT existing report\n' +
        '❌ Click CANCEL to CREATE NEW report (will overwrite old data)'
      );
      
      if (choice) {
        // Load existing data from MongoDB document
        try {
          // Reconstruct auditData from checkpoint fields
          const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
          const reconstructedData = {};
          const centerHeadRemarks = {};
          
          checkpointIds.forEach(id => {
            if (existingReport[id]) {
              reconstructedData[id] = existingReport[id];
              // Extract center head remarks
              if (existingReport[id].centerHeadRemarks) {
                centerHeadRemarks[id] = existingReport[id].centerHeadRemarks;
              }
            }
          });
          
          reconstructedData._placementApplicable = existingReport.placementApplicable;
          setAuditData(reconstructedData);
          
          // Set center head remarks data
          setCenterHeadRemarksData(centerHeadRemarks);
          setIsEditingExisting(true);
          
          if (existingReport.placementApplicable) {
            setPlacementApplicable(existingReport.placementApplicable);
          }
        } catch (e) {
          console.error('Error loading saved audit data:', e);
          initializeAuditData();
          setIsEditingExisting(false);
          setCenterHeadRemarksData({});
        }
      } else {
        // Create fresh report - completely blank
        initializeAuditData();
        setIsEditingExisting(false);
        setCenterHeadRemarksData({});
        setTimeout(() => {
          const inputs = document.querySelectorAll('input[type="number"]');
          inputs.forEach(input => input.value = '');
        }, 100);
      }
    } else {
      // No existing report, create new
      initializeAuditData();
      setIsEditingExisting(false);
      setCenterHeadRemarksData({});
    }

    setShowAuditTable(true);
  };

  const calculateScore = (cpId, totalSamples, samplesCompliant) => {
    const total = parseFloat(totalSamples) || 0;
    const compliant = parseFloat(samplesCompliant) || 0;
    
    if (total === 0) return 0;
    
    const percent = (compliant / total) * 100;
    
    let checkpoint = null;
    for (const area of auditAreas) {
      checkpoint = area.checkpoints.find(cp => cp.id === cpId);
      if (checkpoint) break;
    }
    
    if (!checkpoint) return 0;
    
    // SLAB-BASED SCORING SYSTEM
    // >= 90% → 100% of Max Score
    // >= 70% → 75% of Max Score
    // >= 60% → 50% of Max Score
    // >= 50% → 25% of Max Score
    // < 50%  → 0
    
    let scoreMultiplier = 0;
    
    if (percent >= 90) {
      scoreMultiplier = 1.00;    // 100%
    } else if (percent >= 70) {
      scoreMultiplier = 0.75;    // 75%
    } else if (percent >= 60) {
      scoreMultiplier = 0.50;    // 50%
    } else if (percent >= 50) {
      scoreMultiplier = 0.25;    // 25%
    } else {
      scoreMultiplier = 0;       // 0%
    }
    
    const score = checkpoint.maxScore * scoreMultiplier;
    return parseFloat(score.toFixed(2));
  };

  const handleInputChange = (cpId, field, value) => {
    const newData = { ...auditData[cpId] };
    newData[field] = value;

    if (field === 'totalSamples' || field === 'samplesCompliant') {
      const total = parseFloat(field === 'totalSamples' ? value : newData.totalSamples) || 0;
      const compliant = parseFloat(field === 'samplesCompliant' ? value : newData.samplesCompliant) || 0;
      
      if (total > 0) {
        newData.compliantPercent = parseFloat(((compliant / total) * 100).toFixed(2));
        newData.score = calculateScore(cpId, total, compliant);
      } else {
        newData.compliantPercent = 0;
        newData.score = 0;
      }
    }

    setAuditData(prev => ({ ...prev, [cpId]: newData }));
  };

  const calculateAreaTotal = (area) => {
    return area.checkpoints.reduce((sum, cp) => {
      return sum + (parseFloat(auditData[cp.id]?.score) || 0);
    }, 0).toFixed(2);
  };

  const calculateGrandTotal = () => {
    let total = 0;
    auditAreas.forEach(area => {
      total += parseFloat(calculateAreaTotal(area));
    });
    return total.toFixed(2);
  };

  const handleSaveReport = async () => {
    if (!selectedCenter) {
      alert('⚠️ Please select a center first!');
      return;
    }

    const grandTotal = parseFloat(calculateGrandTotal());
    const frontOfficeTotal = parseFloat(calculateAreaTotal(auditAreas[0]));
    const deliveryTotal = parseFloat(calculateAreaTotal(auditAreas[1]));
    const placementTotal = parseFloat(calculateAreaTotal(auditAreas[2]));
    const managementTotal = parseFloat(calculateAreaTotal(auditAreas[3]));
    
    try {
      setLoading(true);
      
      console.log('💾 Saving report - placementApplicable state:', placementApplicable);

      // Prepare report data for MongoDB
      const reportData = {
        centerCode: selectedCenter.centerCode,
        centerName: selectedCenter.centerName,
        chName: selectedCenter.chName || '',
        geolocation: selectedCenter.geolocation || '',
        centerHeadName: selectedCenter.centerHeadName || '',
        zonalHeadName: selectedCenter.zonalHeadName || '',
        frontOfficeScore: frontOfficeTotal,
        deliveryProcessScore: deliveryTotal,
        placementScore: placementApplicable === 'no' ? 0 : placementTotal,
        managementScore: managementTotal,
        grandTotal: grandTotal,
        auditDate: new Date().toLocaleDateString('en-GB'),
        placementApplicable: placementApplicable === 'no' ? 'no' : 'yes',
        // Include all checkpoint data
        ...auditData,
        // Reset status
        submissionStatus: 'Not Submitted',
        currentStatus: 'Not Submitted',
        approvedBy: '',
        submittedDate: '',
        remarksText: ''
      };
      
      console.log('💾 Report data placementApplicable:', reportData.placementApplicable);

      const response = await fetch(`${API_URL}/api/save-audit-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        alert('✅ Audit report saved successfully!');
        await loadSavedReports();
        setActiveOption('view');
        setShowAuditTable(false);
      } else {
        const err = await response.json();
        throw new Error(err.error || 'Save failed');
      }
      
    } catch (err) {
      console.error('❌ Error:', err);
      alert('❌ Failed to save audit report!');
    } finally {
      setLoading(false);
    }
  };

  // Save remarks (simplified - remarks saved with report)
  const handleSaveRemarks = async (centerCode, showAlert = false) => {
    try {
      setLoading(true);
      // Remarks are now saved as part of the report
      if (showAlert) {
        alert('✅ Remarks saved successfully!');
      }
      await loadSavedReports();
    } catch (err) {
      console.error('❌ Error:', err);
      if (showAlert) {
        alert('❌ Failed to save remarks!');
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit report for approval
  const handleSubmitReport = async (centerCode) => {
    if (window.confirm('📤 Submit this report for supervisor approval?')) {
      try {
        setLoading(true);

        // Find report by centerCode and submit
        const report = savedReports.find(r => r.centerCode === centerCode);
        if (report && report._id) {
          const response = await fetch(`${API_URL}/api/audit-reports/${report._id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: loggedUser.username })
          });

          if (response.ok) {
            alert('✅ Report submitted for approval!');
            await loadSavedReports();
          } else {
            throw new Error('Submit failed');
          }
        }
      } catch (err) {
        console.error('❌ Error:', err);
        alert('❌ Failed to submit report!');
      } finally {
        setLoading(false);
      }
    }
  };

  // View remarks
  const handleViewRemarks = (report) => {
    try {
      // For MongoDB, checkpoint data is directly in report object
      const checkpointIds = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
      const data = {};
      checkpointIds.forEach(id => {
        if (report[id]) {
          data[id] = report[id];
        }
      });
      setSelectedRemarks({ centerName: report.centerName, data });
      setShowRemarksModal(true);
    } catch (e) {
      alert('❌ Unable to load remarks!');
    }
  };

  const handleDownloadExcel = async () => {
    // Download functionality - can be implemented later
    alert('📥 Download feature coming soon!');
  };

  // Open email form for sending report
  const handleOpenEmailForm = (report) => {
    setSelectedReportForEmail(report);
    setEmailData({
      to: '',
      cc: '',
      subject: `Audit Report - ${report.centerName} - Score: ${report.grandTotal}/100`,
      message: `Dear Sir/Madam,

Please find the audit report details below:

Center Name: ${report.centerName}
CH Name: ${report.chName || 'N/A'}
Audit Date: ${report.auditDate}

Scores:
- Front Office: ${report.frontOfficeScore}/30
- Delivery Process: ${report.deliveryProcessScore}/40
- Placement: ${report.placementScore}/15
- Management: ${report.managementScore}/15

Grand Total: ${report.grandTotal}/100
Status: ${parseFloat(report.grandTotal) >= 80 ? 'Compliant' : parseFloat(report.grandTotal) >= 65 ? 'Amber' : 'Non-Compliant'}

Approved By: ${report.approvedBy || 'N/A'}

Regards,
${loggedUser.firstname || 'Audit Team'}`
    });
    setShowEmailForm(true);
  };

  // Close email form
  const handleCloseEmailForm = () => {
    setShowEmailForm(false);
    setSelectedReportForEmail(null);
    setEmailData({ to: '', cc: '', subject: '', message: '' });
  };

  // Send email
  const handleSendEmail = async () => {
    if (!emailData.to) {
      alert('⚠️ Please enter recipient email address!');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      alert('⚠️ Please enter a valid email address!');
      return;
    }

    // Validate CC if provided
    if (emailData.cc && !emailRegex.test(emailData.cc)) {
      alert('⚠️ Please enter a valid CC email address!');
      return;
    }

    try {
      setSendingEmail(true);
      
      // Combine CC: user entered CC + audit user's email
      let finalCC = emailData.cc || '';
      if (loggedUser.email) {
        finalCC = finalCC ? `${finalCC}, ${loggedUser.email}` : loggedUser.email;
      }
      
      // Send email via backend API with timeout
      const response = await axios.post(`${API_URL}/api/send-audit-email`, {
        to: emailData.to,
        cc: finalCC || undefined,
        subject: emailData.subject,
        message: emailData.message,
        reportData: selectedReportForEmail
      }, {
        timeout: 60000 // 60 second timeout (PDF generation takes time)
      });

      if (response.data.success) {
        alert('✅ Email sent successfully with PDF attachment!');
        handleCloseEmailForm();
        // Refresh reports to update emailSent status
        loadSavedReports();
      } else {
        alert('❌ Failed to send email: ' + (response.data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('❌ Error sending email:', err);
      
      // Show specific error message based on error type
      if (err.code === 'ECONNABORTED') {
        alert('❌ Request timed out! PDF generation might be slow. Please try again.');
      } else if (err.response) {
        // Server responded with error
        alert('❌ Failed to send email: ' + (err.response.data?.error || err.response.statusText || 'Server error'));
      } else if (err.request) {
        // Request made but no response
        alert('❌ No response from server! Check if backend is running.');
      } else {
        alert('❌ Error: ' + err.message);
      }
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (activeOption === 'view') {
      loadSavedReports();
    }
  }, [activeOption]);

  return (
    <div className="management-section">
      <h2>📋 Audit Management</h2>

      <div className="action-buttons" style={{
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <button 
          className={`btn ${activeOption === 'create' ? 'active' : ''}`}
          onClick={() => handleOptionClick('create')}
          style={{
            padding: '15px 35px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: activeOption === 'create' ? '3px solid #667eea' : '2px solid #ddd',
            background: activeOption === 'create' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : 'white',
            color: activeOption === 'create' ? 'white' : '#333',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: activeOption === 'create' 
              ? '0 8px 20px rgba(102, 126, 234, 0.4)' 
              : '0 4px 10px rgba(0,0,0,0.1)',
            transform: activeOption === 'create' ? 'translateY(-2px)' : 'none'
          }}
          onMouseOver={(e) => {
            if (activeOption !== 'create') {
              e.target.style.borderColor = '#667eea';
              e.target.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (activeOption !== 'create') {
              e.target.style.borderColor = '#ddd';
              e.target.style.transform = 'none';
            }
          }}
        >
          ➕ Create Report
        </button>
        <button 
          className={`btn ${activeOption === 'view' ? 'active' : ''}`}
          onClick={() => handleOptionClick('view')}
          style={{
            padding: '15px 35px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: activeOption === 'view' ? '3px solid #667eea' : '2px solid #ddd',
            background: activeOption === 'view' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : 'white',
            color: activeOption === 'view' ? 'white' : '#333',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: activeOption === 'view' 
              ? '0 8px 20px rgba(102, 126, 234, 0.4)' 
              : '0 4px 10px rgba(0,0,0,0.1)',
            transform: activeOption === 'view' ? 'translateY(-2px)' : 'none'
          }}
          onMouseOver={(e) => {
            if (activeOption !== 'view') {
              e.target.style.borderColor = '#667eea';
              e.target.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (activeOption !== 'view') {
              e.target.style.borderColor = '#ddd';
              e.target.style.transform = 'none';
            }
          }}
        >
          👁️ View Reports
        </button>
      </div>

      {/* CREATE REPORT */}
      {activeOption === 'create' && (
        <div className="create-user">
          <h3>📝 Create New Audit Report</h3>

          <div className="select-user" style={{ marginBottom: '25px' }}>
            <label><strong>Select Center:</strong></label>
            <select
              value={selectedCenter?.centerCode || ''}
              onChange={(e) => {
                const center = centers.find(c => c.centerCode === e.target.value);
                setSelectedCenter(center);
                setShowAuditTable(false);
                setEditableRemarks({}); // Clear remarks when changing center
                setPlacementApplicable(null); // Reset placement selection
                if (center) {
                  initializeAuditData();
                }
              }}
            >
              <option value="">-- Select a Center --</option>
              {centers.map(center => (
                <option key={center.centerCode} value={center.centerCode}>
                  {center.centerCode} - {center.centerName}
                </option>
              ))}
            </select>
          </div>

          {selectedCenter && !showAuditTable && (
            <div style={{ 
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '25px',
              border: '2px solid #2196f3'
            }}>
              <h4 style={{ marginBottom: '15px', color: '#1976d2' }}>📍 Center Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div><strong>Center Code:</strong> {selectedCenter.centerCode}</div>
                <div><strong>Center Name:</strong> {selectedCenter.centerName}</div>
                <div><strong>CH Name:</strong> {selectedCenter.chName || '-'}</div>
                <div><strong>Geolocation:</strong> {selectedCenter.geolocation || '-'}</div>
                <div><strong>Center Head:</strong> {selectedCenter.centerHeadName || '-'}</div>
                <div><strong>Zonal Head:</strong> {selectedCenter.zonalHeadName || '-'}</div>
              </div>

              {/* NEW: Placement Applicable Selection */}
              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                borderRadius: '10px',
                border: '2px solid #ff9800'
              }}>
                <h4 style={{ marginBottom: '15px', color: '#e65100', fontSize: '16px' }}>
                  📋 Placement Applicable?
                </h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setPlacementApplicable('yes')}
                    style={{
                      padding: '12px 30px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: placementApplicable === 'yes' ? '3px solid #4caf50' : '2px solid #ddd',
                      background: placementApplicable === 'yes' 
                        ? 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)' 
                        : 'white',
                      color: placementApplicable === 'yes' ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: placementApplicable === 'yes' 
                        ? '0 6px 15px rgba(76, 175, 80, 0.4)' 
                        : '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    ✅ Yes
                  </button>
                  <button
                    onClick={() => setPlacementApplicable('no')}
                    style={{
                      padding: '12px 30px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: placementApplicable === 'no' ? '3px solid #f44336' : '2px solid #ddd',
                      background: placementApplicable === 'no' 
                        ? 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)' 
                        : 'white',
                      color: placementApplicable === 'no' ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: placementApplicable === 'no' 
                        ? '0 6px 15px rgba(244, 67, 54, 0.4)' 
                        : '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    ❌ No
                  </button>
                </div>
                {placementApplicable && (
                  <p style={{ 
                    marginTop: '12px', 
                    fontSize: '14px', 
                    color: placementApplicable === 'yes' ? '#2e7d32' : '#c62828',
                    fontWeight: '500'
                  }}>
                    {placementApplicable === 'yes' 
                      ? '✓ Placement Process area will be included in audit.' 
                      : '✓ Placement Process area will NOT be included in audit.'}
                  </p>
                )}
              </div>

              {/* Start Audit button - only show when placement is selected */}
              {placementApplicable && (
                <button 
                  className="btn primary" 
                  onClick={() => {
                    handleCenterSelect(selectedCenter);
                  }}
                  style={{ marginTop: '20px' }}
                >
                  🚀 Start Audit
                </button>
              )}
            </div>
          )}

          {showAuditTable && (
            <div className="editable-table">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>S.No</th>
                      <th style={{ width: '300px' }}>Checkpoint</th>
                      <th style={{ width: '100px' }}>Weightage (%)</th>
                      <th style={{ width: '100px' }}>Max Score</th>
                      <th style={{ width: '120px' }}>Total Samples</th>
                      <th style={{ width: '140px' }}>Samples Compliant</th>
                      <th style={{ width: '120px' }}>Compliant %</th>
                      <th style={{ width: '100px' }}>Score</th>
                      <th style={{ width: '250px' }}>Remarks (आप अपनी भाषा में लिख सकते हैं)</th>
                      {isEditingExisting && (
                        <th style={{ width: '250px', background: '#e8f5e9' }}>Center Head Remarks</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {auditAreas.map((area, areaIdx) => (
                      <React.Fragment key={areaIdx}>
                        {/* Area Header - Grey for NA */}
                        <tr style={{ 
                          background: area.isNA 
                            ? 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)' 
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          color: 'white' 
                        }}>
                          <td colSpan={isEditingExisting ? 10 : 9} style={{ fontWeight: 'bold', fontSize: '16px', padding: '15px' }}>
                            Area {area.areaNumber}: {area.areaName} 
                            {area.isNA 
                              ? ' (N/A - Not Applicable)' 
                              : ` (Total Score: ${area.totalScore})`
                            }
                          </td>
                        </tr>
                        
                        {/* Checkpoint Rows */}
                        {area.checkpoints.map((cp, cpIdx) => (
                          <tr key={cp.id} style={{ 
                            background: area.isNA ? '#f5f5f5' : 'inherit',
                            opacity: area.isNA ? 0.7 : 1
                          }}>
                            <td style={{ textAlign: 'center' }}>{cpIdx + 1}</td>
                            <td>{cp.checkPoint}</td>
                            <td style={{ textAlign: 'center', color: area.isNA ? '#999' : 'inherit' }}>
                              {area.isNA ? 'NA' : `${cp.weightage}%`}
                            </td>
                            <td style={{ textAlign: 'center', color: area.isNA ? '#999' : 'inherit' }}>
                              {area.isNA ? 'NA' : cp.maxScore}
                            </td>
                            <td>
                              {area.isNA ? (
                                <span style={{ 
                                  display: 'block', 
                                  textAlign: 'center', 
                                  color: '#999',
                                  fontWeight: 'bold',
                                  padding: '8px'
                                }}>NA</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  value={auditData[cp.id]?.totalSamples || ''}
                                  onChange={(e) => handleInputChange(cp.id, 'totalSamples', e.target.value)}
                                  style={{ width: '100%', padding: '8px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                              )}
                            </td>
                            <td>
                              {area.isNA ? (
                                <span style={{ 
                                  display: 'block', 
                                  textAlign: 'center', 
                                  color: '#999',
                                  fontWeight: 'bold',
                                  padding: '8px'
                                }}>NA</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  value={auditData[cp.id]?.samplesCompliant || ''}
                                  onChange={(e) => handleInputChange(cp.id, 'samplesCompliant', e.target.value)}
                                  style={{ width: '100%', padding: '8px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                              )}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: area.isNA ? '#999' : 'inherit' }}>
                              {area.isNA ? 'NA' : `${auditData[cp.id]?.compliantPercent || 0}%`}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: area.isNA ? '#999' : '#11998e' }}>
                              {area.isNA ? 'NA' : (auditData[cp.id]?.score || 0)}
                            </td>
                            <td>
                              {area.isNA ? (
                                <span style={{ 
                                  display: 'block', 
                                  textAlign: 'center', 
                                  color: '#999',
                                  fontStyle: 'italic',
                                  padding: '8px'
                                }}>Not Applicable</span>
                              ) : (
                                <textarea
                                  rows="2"
                                  value={auditData[cp.id]?.remarks || ''}
                                  onChange={(e) => handleInputChange(cp.id, 'remarks', e.target.value)}
                                  style={{
                                    width: '100%',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    resize: 'vertical',
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize: '13px',
                                    minHeight: '50px'
                                  }}
                                  placeholder="यहाँ टिप्पणी लिखें..."
                                />
                              )}
                            </td>
                            {isEditingExisting && (
                              <td style={{ 
                                background: '#f1f8e9',
                                padding: '8px'
                              }}>
                                {area.isNA ? (
                                  <span style={{ 
                                    display: 'block', 
                                    textAlign: 'center', 
                                    color: '#999',
                                    fontStyle: 'italic'
                                  }}>N/A</span>
                                ) : (
                                  <div style={{
                                    padding: '8px',
                                    background: centerHeadRemarksData[cp.id] ? '#e8f5e9' : '#fafafa',
                                    borderRadius: '4px',
                                    border: '1px solid #c8e6c9',
                                    minHeight: '50px',
                                    fontSize: '13px',
                                    color: centerHeadRemarksData[cp.id] ? '#2e7d32' : '#999',
                                    fontStyle: centerHeadRemarksData[cp.id] ? 'normal' : 'italic'
                                  }}>
                                    {centerHeadRemarksData[cp.id] || 'No remarks from Center Head'}
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                        
                        {/* Area Total Row */}
                        <tr style={{ background: area.isNA ? '#e0e0e0' : '#e8f5e9', fontWeight: 'bold' }}>
                          <td colSpan="7" style={{ textAlign: 'right', paddingRight: '20px' }}>
                            {area.areaName} - Total Score:
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '16px', color: area.isNA ? '#999' : '#11998e' }}>
                            {area.isNA ? 'NA' : calculateAreaTotal(area)}
                          </td>
                          <td></td>
                          {isEditingExisting && <td></td>}
                        </tr>
                      </React.Fragment>
                    ))}
                    
                    <tr style={{ background: '#667eea', color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                      <td colSpan="7" style={{ textAlign: 'right', paddingRight: '20px' }}>
                        GRAND TOTAL (out of 100):
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '18px' }}>
                        {calculateGrandTotal()}
                      </td>
                      <td></td>
                      {isEditingExisting && <td></td>}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button className="btn save" onClick={handleSaveReport} disabled={loading}>
                  💾 Save Audit Report
                </button>
                <button 
                  className="btn cancel"
                  onClick={() => setShowAuditTable(false)}
                >
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW REPORTS */}
      {activeOption === 'view' && (
        <div className="view-user">
          <div className="table-header">
            <h3>📊 All Audit Reports ({savedReports.length})</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={loadSavedReports} 
                className="btn"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  opacity: loading ? 0.6 : 1
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {savedReports.length === 0 ? (
            <p style={{ color: '#999', padding: '40px', textAlign: 'center' }}>
              No audit reports yet. Create your first report!
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>CENTER<br/>NAME</th>
                    <th>CH<br/>NAME</th>
                    <th>AUDIT<br/>DATE</th>
                    <th>FRONT<br/>OFFICE</th>
                    <th>DELIVERY</th>
                    <th>PLACEMENT</th>
                    <th>MANAGEMENT</th>
                    <th>GRAND<br/>TOTAL</th>
                    <th>AUDIT<br/>STATUS</th>
                    <th style={{ minWidth: '180px' }}>REMARKS<br/>(EDITABLE)</th>
                    <th>ACTIONS</th>
                    <th>CURRENT<br/>STATUS</th>
                    <th>APPROVED<br/>BY</th>
                    <th style={{ minWidth: '120px' }}>SEND<br/>REPORT</th>
                    <th style={{ minWidth: '120px', background: '#e8f5e9' }}>CENTER HEAD<br/>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {savedReports.map((report, index) => {
                    const getGrandTotalColor = (score) => {
                      if (score >= 80) return '#28a745';
                      if (score >= 65) return '#ffc107';
                      return '#dc3545';
                    };

                    const getAuditStatus = (score) => {
                      if (score >= 80) return 'Compliant';
                      if (score >= 65) return 'Amber';
                      return 'Non-Compliant';
                    };

                    const canSubmit = report.currentStatus === 'Not Submitted' || 
                                      report.currentStatus.startsWith('Rejected');
                    const isRejected = report.currentStatus.startsWith('Rejected');
                    const isApprovedOrPending = report.currentStatus === 'Pending with Supervisor' || 
                                                report.currentStatus === 'Approved';

                    // Helper function to get area score status and color
                    const getAreaScoreInfo = (score, maxScore) => {
                      if (score === 'NA') return { status: 'NA', color: '#999' };
                      const numScore = parseFloat(score || 0);
                      const percent = (numScore / maxScore) * 100;
                      
                      if (percent >= 80) return { status: 'Compliant', color: '#28a745' };
                      if (percent >= 65) return { status: 'Amber', color: '#ffc107' };
                      return { status: 'Non-Compliant', color: '#dc3545' };
                    };

                    // Get info for each area (using original max scores: 30, 40, 15, 15)
                    const frontOfficeInfo = getAreaScoreInfo(report.frontOfficeScore, 30);
                    const deliveryInfo = getAreaScoreInfo(report.deliveryProcessScore, 40);
                    const placementInfo = getAreaScoreInfo(report.placementScore, 15);
                    const managementInfo = getAreaScoreInfo(report.managementScore, 15);

                    return (
                      <tr key={index}>
                        <td>{report.centerName}</td>
                        <td>{report.chName || '-'}</td>
                        <td>{report.auditDate}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: frontOfficeInfo.color }}>
                          {report.frontOfficeScore === 'NA' ? 'NA' : (
                            <>
                              {frontOfficeInfo.status}<br/>
                              <span style={{ fontSize: '14px' }}>({parseFloat(report.frontOfficeScore || 0).toFixed(2)})</span>
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: deliveryInfo.color }}>
                          {report.deliveryProcessScore === 'NA' ? 'NA' : (
                            <>
                              {deliveryInfo.status}<br/>
                              <span style={{ fontSize: '14px' }}>({parseFloat(report.deliveryProcessScore || 0).toFixed(2)})</span>
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: report.placementApplicable === 'no' ? '#999' : placementInfo.color }}>
                          {report.placementApplicable === 'no' ? (
                            <span style={{ color: '#999', fontWeight: 'bold', fontSize: '15px' }}>NA</span>
                          ) : (
                            <>
                              {placementInfo.status}<br/>
                              <span style={{ fontSize: '14px' }}>({parseFloat(report.placementScore || 0).toFixed(2)})</span>
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: managementInfo.color }}>
                          {report.managementScore === 'NA' ? 'NA' : (
                            <>
                              {managementInfo.status}<br/>
                              <span style={{ fontSize: '14px' }}>({parseFloat(report.managementScore || 0).toFixed(2)})</span>
                            </>
                          )}
                        </td>
                        <td style={{ 
                          textAlign: 'center', 
                          fontWeight: 'bold', 
                          fontSize: '17px',
                          color: getGrandTotalColor(report.grandTotal)
                        }}>
                          {parseFloat(report.grandTotal || 0).toFixed(2)}
                        </td>
                        <td style={{ 
                          textAlign: 'center', 
                          fontWeight: 'bold',
                          color: getGrandTotalColor(report.grandTotal),
                          fontSize: '13px'
                        }}>
                          {getAuditStatus(report.grandTotal)}
                        </td>
                        <td>
                          <textarea
                            value={editableRemarks[report.centerCode] || ''}
                            onChange={(e) => {
                              setEditableRemarks(prev => ({
                                ...prev,
                                [report.centerCode]: e.target.value
                              }));
                            }}
                            onBlur={() => {
                              // Auto-save on blur (when user clicks outside)
                              if (editableRemarks[report.centerCode] !== report.remarksText) {
                                handleSaveRemarks(report.centerCode);
                              }
                            }}
                            disabled={!canSubmit} // Disable if submitted/approved/pending
                            style={{
                              width: '100%',
                              minHeight: '60px',
                              maxHeight: '120px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '6px',
                              resize: 'vertical',
                              fontFamily: 'Arial, sans-serif',
                              fontSize: '11px',
                              backgroundColor: canSubmit ? '#fff' : '#f5f5f5',
                              color: '#333',
                              lineHeight: '1.4',
                              cursor: canSubmit ? 'text' : 'not-allowed'
                            }}
                            placeholder={canSubmit ? "टिप्पणी लिखें..." : "Submitted - Not Editable"}
                          />
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {canSubmit && (
                              <button
                                onClick={() => handleSubmitReport(report.centerCode)}
                                disabled={loading}
                                style={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                  transition: 'all 0.3s ease',
                                  opacity: loading ? 0.6 : 1
                                }}
                              >
                                📤 Submit
                              </button>
                            )}
                            {isApprovedOrPending && (
                              <button
                                disabled
                                style={{
                                  background: '#e0e0e0',
                                  color: '#666',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  cursor: 'not-allowed',
                                  fontSize: '13px',
                                  fontWeight: 'bold'
                                }}
                              >
                                ✅ Submitted
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {report.currentStatus === 'Approved' && (
                            <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '12px' }}>
                              ✅ Approved
                            </span>
                          )}
                          {report.currentStatus === 'Pending with Supervisor' && (
                            <span style={{ color: '#FFC107', fontWeight: 'bold', fontSize: '12px' }}>
                              ⏳ Pending
                            </span>
                          )}
                          {isRejected && (
                            <span 
                              style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                              title={report.currentStatus}
                            >
                              ❌ Rejected
                            </span>
                          )}
                          {report.currentStatus === 'Not Submitted' && (
                            <span style={{ color: '#999', fontSize: '12px' }}>
                              Not Submitted
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '13px' }}>
                          {isRejected ? (
                            <span style={{ 
                              color: '#dc3545', 
                              fontStyle: 'italic',
                              fontSize: '12px',
                              display: 'block',
                              padding: '5px'
                            }}>
                              "{report.currentStatus.replace('Rejected: ', '')}"
                            </span>
                          ) : (
                            report.approvedBy || '-'
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          {report.currentStatus === 'Approved' ? (
                            report.emailSent ? (
                              // Email already sent - show "Sent" with option to resend
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <span style={{
                                  background: '#e8f5e9',
                                  color: '#2e7d32',
                                  padding: '6px 12px',
                                  borderRadius: '15px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  ✅ Sent
                                </span>
                                <button
                                  onClick={() => handleOpenEmailForm(report)}
                                  style={{
                                    background: 'transparent',
                                    color: '#667eea',
                                    border: '1px solid #667eea',
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  🔄 Resend
                                </button>
                              </div>
                            ) : (
                              // Email not sent yet - show Send button
                              <button
                                onClick={() => handleOpenEmailForm(report)}
                                style={{
                                  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                  boxShadow: '0 4px 12px rgba(17, 153, 142, 0.3)',
                                  transition: 'all 0.3s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.transform = 'translateY(-2px)';
                                  e.target.style.boxShadow = '0 6px 20px rgba(17, 153, 142, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.transform = 'none';
                                  e.target.style.boxShadow = '0 4px 12px rgba(17, 153, 142, 0.3)';
                                }}
                              >
                                📧 Send
                              </button>
                            )
                          ) : (
                            <span style={{ 
                              color: '#999', 
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              {report.currentStatus === 'Pending with Supervisor' ? '⏳ Pending' : 
                               report.currentStatus === 'Not Submitted' ? '—' : '❌'}
                            </span>
                          )}
                        </td>
                        {/* CENTER HEAD REMARKS - Show only if email sent AND approved */}
                        <td style={{ textAlign: 'center', padding: '8px', background: '#f1f8e9' }}>
                          {(report.emailSent === true && report.currentStatus === 'Approved') ? (
                            <button
                              onClick={() => {
                                setSelectedReportForRemarks(report);
                                setShowCenterRemarksModal(true);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(17, 153, 142, 0.3)'
                              }}
                            >
                              👁️ View
                            </button>
                          ) : (
                            <span style={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Email Form Modal */}
      {showEmailForm && selectedReportForEmail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInUp 0.3s ease'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px 25px',
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                📧 Send Audit Report
              </h3>
              <button
                onClick={handleCloseEmailForm}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                ×
              </button>
            </div>

            {/* Report Info */}
            <div style={{
              background: '#f8f9fa',
              padding: '15px 25px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                <strong>Report:</strong> {selectedReportForEmail.centerName} | 
                <strong> Score:</strong> {selectedReportForEmail.grandTotal}/100 | 
                <strong> Date:</strong> {selectedReportForEmail.auditDate}
              </p>
            </div>

            {/* Form */}
            <div style={{ padding: '25px' }}>
              {/* To Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  To: <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="recipient@example.com"
                  autoComplete="off"
                  name="email-to-field"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* CC Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Cc: <span style={{ color: '#999', fontWeight: 'normal' }}>(optional)</span>
                </label>
                <input
                  type="email"
                  value={emailData.cc}
                  onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                  placeholder="cc@example.com"
                  autoComplete="off"
                  name="email-cc-field"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* Subject Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Subject:
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* Message Field */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Message:
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    lineHeight: '1.6'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleCloseEmailForm}
                  style={{
                    padding: '12px 24px',
                    background: '#e0e0e0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#d0d0d0'}
                  onMouseOut={(e) => e.target.style.background = '#e0e0e0'}
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  style={{
                    padding: '12px 24px',
                    background: sendingEmail 
                      ? '#ccc' 
                      : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: sendingEmail ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: sendingEmail ? 'none' : '0 4px 15px rgba(17, 153, 142, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {sendingEmail ? '⏳ Sending...' : '📤 Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CENTER HEAD REMARKS MODAL */}
      {showCenterRemarksModal && selectedReportForRemarks && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              padding: '20px 25px',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px' }}>🏢 Center Head Remarks</h3>
                <p style={{ margin: '5px 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {selectedReportForRemarks.centerName} ({selectedReportForRemarks.centerCode})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCenterRemarksModal(false);
                  setSelectedReportForRemarks(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Info Bar */}
              {selectedReportForRemarks.centerRemarksBy && (
                <div style={{
                  background: '#e3f2fd',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  color: '#1565c0'
                }}>
                  <strong>📝 Remarks by:</strong> {selectedReportForRemarks.centerRemarksBy} | 
                  <strong> Date:</strong> {selectedReportForRemarks.centerRemarksDate || '-'}
                </div>
              )}

              {/* Checkpoint Remarks Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <th style={{ padding: '12px', color: 'white', textAlign: 'left', width: '80px' }}>ID</th>
                    <th style={{ padding: '12px', color: 'white', textAlign: 'left' }}>Checkpoint</th>
                    <th style={{ padding: '12px', color: 'white', textAlign: 'left', width: '40%' }}>Center Head Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'FO1', name: 'Enquires Entered in Pulse' },
                    { id: 'FO2', name: 'Enrolment form available in Pulse' },
                    { id: 'FO3', name: 'Pre assessment Available' },
                    { id: 'FO4', name: 'Documents uploaded in Pulse' },
                    { id: 'FO5', name: 'Availability of Marketing Material' },
                    { id: 'DP1', name: 'Batch file maintained' },
                    { id: 'DP2', name: 'Batch Heath Card available' },
                    { id: 'DP3', name: 'Attendance marked in EDL' },
                    { id: 'DP4', name: 'BMS maintained' },
                    { id: 'DP5', name: 'FACT Certificate available' },
                    { id: 'DP6', name: 'Post Assessment' },
                    { id: 'DP7', name: 'Appraisal sheet maintained' },
                    { id: 'DP8', name: 'Appraisal status in Pulse' },
                    { id: 'DP9', name: 'Certification Status' },
                    { id: 'DP10', name: 'Student signature for certificates' },
                    { id: 'DP11', name: 'System vs actual certificate date' },
                    { id: 'PP1', name: 'Student Placement Response' },
                    { id: 'PP2', name: 'CGT/Guest Lecture/Industry Visit' },
                    { id: 'PP3', name: 'Placement Bank & Aging' },
                    { id: 'PP4', name: 'Placement Proof Upload' },
                    { id: 'MP1', name: 'Courseware issue/LMS Usage' },
                    { id: 'MP2', name: 'TIRM details register' },
                    { id: 'MP3', name: 'Monthly Centre Review Meeting' },
                    { id: 'MP4', name: 'Physical asset verification' },
                    { id: 'MP5', name: 'Verification of bill authenticity' }
                  ].map((cp, idx) => {
                    const cpData = selectedReportForRemarks[cp.id] || {};
                    const hasRemarks = cpData.centerHeadRemarks && cpData.centerHeadRemarks.trim();
                    return (
                      <tr key={cp.id} style={{ 
                        borderBottom: '1px solid #eee',
                        background: hasRemarks ? '#f1f8e9' : 'white'
                      }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#667eea' }}>{cp.id}</td>
                        <td style={{ padding: '10px', fontSize: '13px' }}>{cp.name}</td>
                        <td style={{ 
                          padding: '10px', 
                          fontSize: '13px',
                          color: hasRemarks ? '#2e7d32' : '#999',
                          fontStyle: hasRemarks ? 'normal' : 'italic'
                        }}>
                          {hasRemarks ? cpData.centerHeadRemarks : 'No remarks'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '15px 25px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCenterRemarksModal(false);
                  setSelectedReportForRemarks(null);
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ✓ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditManagement;