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

  // Get logged user info
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  const isAdmin = loggedUser.Role === 'Admin';

  // Audit Areas Data - 4 AREAS
  const auditAreas = [
    {
      areaNumber: 1,
      areaName: "Front Office",
      totalScore: 30,
      checkpoints: [
        { id: "FO1", checkPoint: "Enquires Entered in Pulse(Y/N)", weightage: 30, maxScore: 9 },
        { id: "FO2", checkPoint: "Enrolment form available in Pulse(Y/N)", weightage: 20, maxScore: 6 },
        { id: "FO3", checkPoint: "Pre assessment Available(Y/N)", weightage: 0, maxScore: 0 },
        { id: "FO4", checkPoint: "Documents uploaded in Pulse(Y/N)", weightage: 40, maxScore: 12 },
        { id: "FO5", checkPoint: "Availability of Marketing Material(Y/N)", weightage: 10, maxScore: 3 }
      ]
    },
    {
      areaNumber: 2,
      areaName: "Delivery Process",
      totalScore: 40,
      checkpoints: [
        { id: "DP1", checkPoint: "Batch file maintained for all running batches", weightage: 15, maxScore: 6 },
        { id: "DP2", checkPoint: "Batch Heath Card available for all batches where batch duration is >= 30 days", weightage: 10, maxScore: 4 },
        { id: "DP3", checkPoint: "Attendance marked in EDL sheets correctly", weightage: 15, maxScore: 6 },
        { id: "DP4", checkPoint: "BMS maintained with observations >= 30 days", weightage: 5, maxScore: 2 },
        { id: "DP5", checkPoint: "FACT Certificate available at Center (Y/N)", weightage: 10, maxScore: 4 },
        { id: "DP6", checkPoint: "Appraisal sheet is maintained (Y/N)", weightage: 10, maxScore: 4 },
        { id: "DP7", checkPoint: "Appraisal status updated in Pulse(Y/N)", weightage: 5, maxScore: 2 },
        { id: "DP8", checkPoint: "Certification Status of eligible students", weightage: 10, maxScore: 4 },
        { id: "DP9", checkPoint: "Student signature obtained while issuing certificates", weightage: 10, maxScore: 4 },
        { id: "DP10", checkPoint: "Verification between System issue date Vs actual certificate issue date", weightage: 10, maxScore: 4 }
      ]
    },
    {
      areaNumber: 3,
      areaName: "Placement Process",
      totalScore: 15,
      checkpoints: [
        { id: "PP1", checkPoint: "Placement forms available in Pulse", weightage: 30, maxScore: 4.5 },
        { id: "PP2", checkPoint: "Placement proof uploaded in Pulse", weightage: 70, maxScore: 10.5 }
      ]
    },
    {
      areaNumber: 4,
      areaName: "Management Process",
      totalScore: 15,
      checkpoints: [
        { id: "MP1", checkPoint: "Courseware issue to students done on time/Usage of LMS", weightage: 5, maxScore: 0.75 },
        { id: "MP2", checkPoint: "TIRM details register", weightage: 25, maxScore: 3.75 },
        { id: "MP3", checkPoint: "Monthly Centre Review Meeting is conducted", weightage: 35, maxScore: 5.25 },
        { id: "MP4", checkPoint: "Physcial asset verification", weightage: 30, maxScore: 4.5 },
        { id: "MP5", checkPoint: "Verification of bill authenticity", weightage: 5, maxScore: 0.75 }
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

  // Load centers
  const loadCenters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/centers.xlsx?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      
      const loadedCenters = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          const center = {
            centerCode: getCellValue(row.getCell(1)),
            centerName: getCellValue(row.getCell(2)),
            chName: getCellValue(row.getCell(3)),
            geolocation: getCellValue(row.getCell(4)),
            centerHeadName: getCellValue(row.getCell(5)),
            zonalHeadName: getCellValue(row.getCell(6))
          };
          if (center.centerCode) {
            loadedCenters.push(center);
          }
        }
      });

      setCenters(loadedCenters);
    } catch (err) {
      console.error('❌ Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load saved reports
  const loadSavedReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/audit-reports.xlsx?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      
      const reports = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          const report = {
            centerCode: getCellValue(row.getCell(1)),
            centerName: getCellValue(row.getCell(2)),
            chName: getCellValue(row.getCell(3)),
            geolocation: getCellValue(row.getCell(4)),
            centerHeadName: getCellValue(row.getCell(5)),
            zonalHeadName: getCellValue(row.getCell(6)),
            frontOfficeScore: getCellValue(row.getCell(7)),
            deliveryProcessScore: getCellValue(row.getCell(8)),
            placementScore: getCellValue(row.getCell(9)),
            managementScore: getCellValue(row.getCell(10)),
            grandTotal: getCellValue(row.getCell(11)),
            auditDate: getCellValue(row.getCell(12)),
            auditDataJson: getCellValue(row.getCell(13)),
            submissionStatus: getCellValue(row.getCell(14)) || 'Not Submitted',
            currentStatus: getCellValue(row.getCell(15)) || 'Not Submitted',
            approvedBy: getCellValue(row.getCell(16)) || '',
            submittedDate: getCellValue(row.getCell(17)) || '',
            remarksText: getCellValue(row.getCell(18)) || '' // New column for custom remarks
          };
          if (report.centerCode) {
            reports.push(report);
          }
        }
      });

      setSavedReports(reports);
      
      // Initialize editable remarks
      const remarksObj = {};
      reports.forEach(report => {
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
    
    if (option === 'create') {
      loadCenters();
    } else if (option === 'view') {
      loadSavedReports();
    }
  };

  const handleCenterSelect = async (center) => {
    // Check if report already exists
    let existingReport = null;
    
    try {
      const response = await fetch(`${API_URL}/api/audit-reports.xlsx?t=${Date.now()}`);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 1) {
            const code = getCellValue(row.getCell(1));
            if (code === center.centerCode) {
              const savedDataJson = getCellValue(row.getCell(13));
              if (savedDataJson) {
                existingReport = savedDataJson;
              }
            }
          }
        });
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
        // Load existing data
        try {
          const parsedData = JSON.parse(existingReport);
          setAuditData(parsedData);
        } catch (e) {
          console.error('Error parsing saved audit data:', e);
          initializeAuditData();
        }
      } else {
        // Create fresh report - completely blank
        initializeAuditData();
        // Also clear the form completely
        setTimeout(() => {
          const inputs = document.querySelectorAll('input[type="number"]');
          inputs.forEach(input => input.value = '');
        }, 100);
      }
    } else {
      // No existing report, create new
      initializeAuditData();
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
    const score = (percent / 100) * checkpoint.maxScore;
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
    
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/audit-reports.xlsx?t=${Date.now()}`);
      const buffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      let rowToUpdate = null;
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          const code = getCellValue(row.getCell(1));
          if (code === selectedCenter.centerCode) {
            rowToUpdate = row;
          }
        }
      });

      if (!rowToUpdate) {
        rowToUpdate = worksheet.addRow([]);
      }

      const frontOfficeTotal = parseFloat(calculateAreaTotal(auditAreas[0]));
      const deliveryTotal = parseFloat(calculateAreaTotal(auditAreas[1]));
      const placementTotal = parseFloat(calculateAreaTotal(auditAreas[2]));
      const managementTotal = parseFloat(calculateAreaTotal(auditAreas[3]));

      rowToUpdate.getCell(1).value = selectedCenter.centerCode;
      rowToUpdate.getCell(2).value = selectedCenter.centerName;
      rowToUpdate.getCell(3).value = selectedCenter.chName;
      rowToUpdate.getCell(4).value = selectedCenter.geolocation;
      rowToUpdate.getCell(5).value = selectedCenter.centerHeadName;
      rowToUpdate.getCell(6).value = selectedCenter.zonalHeadName;
      rowToUpdate.getCell(7).value = frontOfficeTotal.toFixed(2);
      rowToUpdate.getCell(8).value = deliveryTotal.toFixed(2);
      rowToUpdate.getCell(9).value = placementTotal.toFixed(2);
      rowToUpdate.getCell(10).value = managementTotal.toFixed(2);
      rowToUpdate.getCell(11).value = grandTotal.toFixed(2);
      rowToUpdate.getCell(12).value = new Date().toLocaleDateString('en-GB');
      rowToUpdate.getCell(13).value = JSON.stringify(auditData);
      
      // ALWAYS reset status and remarks when saving (treating as new report)
      rowToUpdate.getCell(14).value = 'Not Submitted';     // Submission Status
      rowToUpdate.getCell(15).value = 'Not Submitted';     // Current Status
      rowToUpdate.getCell(16).value = '';                  // Approved By (clear)
      rowToUpdate.getCell(17).value = '';                  // Submitted Date (clear)
      rowToUpdate.getCell(18).value = '';                  // Remarks Text (clear)

      const updatedBuffer = await workbook.xlsx.writeBuffer();
      
      await axios.post(`${API_URL}/api/save-audit-reports`, updatedBuffer, {
        headers: { 'Content-Type': 'application/octet-stream' }
      });

      alert('✅ Audit report saved successfully!');
      
      // Auto-refresh: Load reports and switch to view tab
      await loadSavedReports();
      setActiveOption('view');
      setShowAuditTable(false);
      
    } catch (err) {
      console.error('❌ Error:', err);
      alert('❌ Failed to save audit report!');
    } finally {
      setLoading(false);
    }
  };

  // Save remarks to Excel (silent for auto-save)
  const handleSaveRemarks = async (centerCode, showAlert = false) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/audit-reports.xlsx?t=${Date.now()}`);
      const buffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      let updated = false;
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          const code = getCellValue(row.getCell(1));
          if (code === centerCode) {
            row.getCell(18).value = editableRemarks[centerCode] || ''; // Save to column 18
            updated = true;
          }
        }
      });

      if (updated) {
        const updatedBuffer = await workbook.xlsx.writeBuffer();
        await axios.post(`${API_URL}/api/save-audit-reports`, updatedBuffer, {
          headers: { 'Content-Type': 'application/octet-stream' }
        });

        if (showAlert) {
          alert('✅ Remarks saved successfully!');
        }
        await loadSavedReports();
      }
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

        const response = await fetch(`${API_URL}/api/audit-reports.xlsx?t=${Date.now()}`);
        const buffer = await response.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        let updated = false;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 1) {
            const code = getCellValue(row.getCell(1));
            if (code === centerCode) {
              row.getCell(14).value = 'Submitted'; // Submission Status
              row.getCell(15).value = 'Pending with Supervisor'; // Current Status
              row.getCell(17).value = new Date().toLocaleString('en-GB'); // Submitted Date
              updated = true;
            }
          }
        });

        if (updated) {
          const updatedBuffer = await workbook.xlsx.writeBuffer();
          await axios.post(`${API_URL}/api/save-audit-reports`, updatedBuffer, {
            headers: { 'Content-Type': 'application/octet-stream' }
          });

          alert('✅ Report submitted for approval!');
          await loadSavedReports();
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
      const parsedData = JSON.parse(report.auditDataJson);
      setSelectedRemarks({ centerName: report.centerName, data: parsedData });
      setShowRemarksModal(true);
    } catch (e) {
      alert('❌ Unable to load remarks!');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await fetch(`${API_URL}/api/audit-reports.xlsx?t=${Date.now()}`);
      const blob = await response.blob();
      saveAs(blob, `Audit_Reports_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
    } catch (err) {
      console.error('❌ Error:', err);
      alert('❌ Failed to download Excel!');
    }
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
      
      // Send email via backend API with timeout
      const response = await axios.post(`${API_URL}/api/send-audit-email`, {
        to: emailData.to,
        cc: emailData.cc || undefined,
        subject: emailData.subject,
        message: emailData.message,
        reportData: selectedReportForEmail
      }, {
        timeout: 30000 // 30 second timeout
      });

      if (response.data.success) {
        alert('✅ Email sent successfully!');
        handleCloseEmailForm();
      } else {
        alert('❌ Failed to send email: ' + (response.data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('❌ Error sending email:', err);
      
      // Show specific error message based on error type
      if (err.code === 'ECONNABORTED') {
        alert('❌ Request timed out! Server might be slow. Please try again.');
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
              <button 
                className="btn primary" 
                onClick={() => {
                  handleCenterSelect(selectedCenter);
                }}
                style={{ marginTop: '15px' }}
              >
                🚀 Start Audit
              </button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {auditAreas.map((area, areaIdx) => (
                      <React.Fragment key={areaIdx}>
                        <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                          <td colSpan="9" style={{ fontWeight: 'bold', fontSize: '16px', padding: '15px' }}>
                            Area {area.areaNumber}: {area.areaName} (Total Score: {area.totalScore})
                          </td>
                        </tr>
                        
                        {area.checkpoints.map((cp, cpIdx) => (
                          <tr key={cp.id}>
                            <td style={{ textAlign: 'center' }}>{cpIdx + 1}</td>
                            <td>{cp.checkPoint}</td>
                            <td style={{ textAlign: 'center' }}>{cp.weightage}%</td>
                            <td style={{ textAlign: 'center' }}>{cp.maxScore}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                value={auditData[cp.id]?.totalSamples || ''}
                                onChange={(e) => handleInputChange(cp.id, 'totalSamples', e.target.value)}
                                style={{ width: '100%', padding: '8px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                value={auditData[cp.id]?.samplesCompliant || ''}
                                onChange={(e) => handleInputChange(cp.id, 'samplesCompliant', e.target.value)}
                                style={{ width: '100%', padding: '8px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                              {auditData[cp.id]?.compliantPercent || 0}%
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#11998e' }}>
                              {auditData[cp.id]?.score || 0}
                            </td>
                            <td>
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
                            </td>
                          </tr>
                        ))}
                        
                        <tr style={{ background: '#e8f5e9', fontWeight: 'bold' }}>
                          <td colSpan="7" style={{ textAlign: 'right', paddingRight: '20px' }}>
                            {area.areaName} - Total Score:
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '16px', color: '#11998e' }}>
                            {calculateAreaTotal(area)}
                          </td>
                          <td></td>
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
              <button onClick={handleDownloadExcel} className="btn save">
                💾 Download Excel
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
                    <th>FRONT<br/>OFFICE<br/>(30)</th>
                    <th>DELIVERY<br/>(40)</th>
                    <th>PLACEMENT<br/>(15)</th>
                    <th>MANAGEMENT<br/>(15)</th>
                    <th>GRAND<br/>TOTAL<br/>(100)</th>
                    <th>AUDIT<br/>STATUS</th>
                    <th style={{ minWidth: '180px' }}>REMARKS<br/>(EDITABLE)</th>
                    <th>ACTIONS</th>
                    <th>CURRENT<br/>STATUS</th>
                    <th>APPROVED<br/>BY</th>
                    <th style={{ minWidth: '120px' }}>SEND<br/>REPORT</th>
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

                    return (
                      <tr key={index}>
                        <td>{report.centerName}</td>
                        <td>{report.chName || '-'}</td>
                        <td>{report.auditDate}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                          {report.frontOfficeScore}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                          {report.deliveryProcessScore}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                          {report.placementScore}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                          {report.managementScore}
                        </td>
                        <td style={{ 
                          textAlign: 'center', 
                          fontWeight: 'bold', 
                          fontSize: '17px',
                          color: getGrandTotalColor(report.grandTotal)
                        }}>
                          {report.grandTotal}
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
    </div>
  );
};

export default AuditManagement;