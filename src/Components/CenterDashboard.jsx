import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './Audit.css';

const CenterDashboard = () => {
  const navigate = useNavigate();
  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [centerRemarks, setCenterRemarks] = useState('');
  const [checkpointRemarks, setCheckpointRemarks] = useState({});
  const [saving, setSaving] = useState(false);

  // Check authorization
  useEffect(() => {
    if (!loggedUser || loggedUser.Role !== 'Center User') {
      alert('Unauthorized! Redirecting to login.');
      navigate('/');
    }
  }, [navigate, loggedUser]);

  // Audit Areas for display
  const auditAreas = [
    {
      areaName: "Front Office",
      maxScore: 30,
      checkpoints: [
        { id: "FO1", name: "Enquires Entered in Pulse(Y/N)", maxScore: 9 },
        { id: "FO2", name: "Enrolment form available in Pulse(Y/N)", maxScore: 6 },
        { id: "FO3", name: "Pre assessment Available(Y/N)", maxScore: 0 },
        { id: "FO4", name: "Documents uploaded in Pulse(Y/N)", maxScore: 12 },
        { id: "FO5", name: "Availability of Marketing Material(Y/N)", maxScore: 3 }
      ]
    },
    {
      areaName: "Delivery Process",
      maxScore: 40,
      checkpoints: [
        { id: "DP1", name: "Batch file maintained for all running batches", maxScore: 6 },
        { id: "DP2", name: "Batch Heath Card available", maxScore: 4 },
        { id: "DP3", name: "Attendance marked in EDL sheets correctly", maxScore: 6 },
        { id: "DP4", name: "BMS maintained with observations >= 30 days", maxScore: 2 },
        { id: "DP5", name: "FACT Certificate available at Center", maxScore: 4 },
        { id: "DP6", name: "Post Assessment if applicable", maxScore: 0 },
        { id: "DP7", name: "Appraisal sheet is maintained", maxScore: 4 },
        { id: "DP8", name: "Appraisal status updated in Pulse", maxScore: 2 },
        { id: "DP9", name: "Certification Status of eligible students", maxScore: 4 },
        { id: "DP10", name: "Student signature for certificates", maxScore: 4 },
        { id: "DP11", name: "System vs actual certificate date", maxScore: 4 }
      ]
    },
    {
      areaName: "Placement Process",
      maxScore: 15,
      checkpoints: [
        { id: "PP1", name: "Student Placement Response", maxScore: 2.25 },
        { id: "PP2", name: "CGT/Guest Lecture/Industry Visit", maxScore: 1.50 },
        { id: "PP3", name: "Placement Bank & Aging", maxScore: 2.25 },
        { id: "PP4", name: "Placement Proof Upload", maxScore: 9.00 }
      ]
    },
    {
      areaName: "Management Process",
      maxScore: 15,
      checkpoints: [
        { id: "MP1", name: "Courseware issue/LMS Usage", maxScore: 0.75 },
        { id: "MP2", name: "TIRM details register", maxScore: 3.00 },
        { id: "MP3", name: "Monthly Centre Review Meeting", maxScore: 5.25 },
        { id: "MP4", name: "Physical asset verification", maxScore: 4.50 },
        { id: "MP5", name: "Verification of bill authenticity", maxScore: 1.50 }
      ]
    }
  ];

  // Load reports
  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/audit-reports`);
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setReports(data);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // View report details
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setCenterRemarks(report.centerRemarks || '');
    
    // Load existing checkpoint remarks
    const existingRemarks = {};
    const allCheckpoints = ['FO1','FO2','FO3','FO4','FO5','DP1','DP2','DP3','DP4','DP5','DP6','DP7','DP8','DP9','DP10','DP11','PP1','PP2','PP3','PP4','MP1','MP2','MP3','MP4','MP5'];
    allCheckpoints.forEach(cpId => {
      if (report[cpId]?.centerHeadRemarks) {
        existingRemarks[cpId] = report[cpId].centerHeadRemarks;
      } else {
        existingRemarks[cpId] = '';
      }
    });
    setCheckpointRemarks(existingRemarks);
  };

  // Handle checkpoint remark change
  const handleCheckpointRemarkChange = (cpId, value) => {
    setCheckpointRemarks(prev => ({
      ...prev,
      [cpId]: value
    }));
  };

  // Save checkpoint remarks
  const handleSaveRemarks = async () => {
    if (!selectedReport) return;
    
    // Debug logs
    console.log('💾 ========== SAVING CHECKPOINT REMARKS ==========');
    console.log('💾 Report ID:', selectedReport._id);
    console.log('💾 All Checkpoint Remarks:', checkpointRemarks);
    
    // Filter only non-empty checkpoint remarks
    const filledRemarks = {};
    Object.keys(checkpointRemarks).forEach(key => {
      if (checkpointRemarks[key] && checkpointRemarks[key].trim()) {
        filledRemarks[key] = checkpointRemarks[key].trim();
      }
    });
    console.log('💾 Filled remarks count:', Object.keys(filledRemarks).length);
    console.log('💾 Filled remarks:', filledRemarks);
    
    if (Object.keys(filledRemarks).length === 0) {
      alert('⚠️ Please enter at least one remark!');
      return;
    }
    
    try {
      setSaving(true);
      
      const requestBody = { 
        checkpointRemarks: filledRemarks,
        centerUserName: loggedUser.firstname + ' ' + (loggedUser.lastname || '')
      };
      
      console.log('💾 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_URL}/api/audit-reports/${selectedReport._id}/center-remarks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      console.log('💾 Server response:', result);

      if (response.ok && result.success) {
        alert('✅ Remarks saved successfully!');
        // Reload reports to get updated data
        const reportsResponse = await fetch(`${API_URL}/api/audit-reports`);
        const updatedReports = await reportsResponse.json();
        setReports(updatedReports);
        
        // Find and reload selected report
        const updatedReport = updatedReports.find(r => r._id === selectedReport._id);
        if (updatedReport) {
          handleViewReport(updatedReport);
        }
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (err) {
      console.error('❌ Error saving remarks:', err);
      alert('❌ Failed to save remarks!');
    } finally {
      setSaving(false);
    }
  };

  // Get score color
  const getScoreColor = (score, maxScore) => {
    if (!score || !maxScore) return '#999';
    const percent = (score / maxScore) * 100;
    if (percent >= 80) return '#28a745';
    if (percent >= 65) return '#ffc107';
    return '#dc3545';
  };

  // Get status color
  const getStatusColor = (total) => {
    if (total >= 80) return '#28a745';
    if (total >= 65) return '#ffc107';
    return '#dc3545';
  };

  const getStatusText = (total) => {
    if (total >= 80) return 'Compliant';
    if (total >= 65) return 'Amber';
    return 'Non-Compliant';
  };

  return (
    <div className="admin-container">
      <header className="admin-header" style={{
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>
          🏢 Center Dashboard - Welcome, {loggedUser.firstname}
        </h1>
        <button 
          onClick={() => { localStorage.removeItem('loggedUser'); navigate('/'); }}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid white',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Logout
        </button>
      </header>

      <main style={{ padding: '25px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: 'calc(100vh - 70px)' }}>
        
        {!selectedReport ? (
          // REPORTS LIST VIEW
          <div className="view-user" style={{ background: 'white', borderRadius: '12px', padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>📊 Audit Reports ({reports.length})</h2>
              <button 
                onClick={loadReports}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#667eea' }}>Loading reports...</p>
            ) : reports.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No audit reports available.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      <th style={{ padding: '14px', color: 'white', textAlign: 'left' }}>Center</th>
                      <th style={{ padding: '14px', color: 'white', textAlign: 'center' }}>Audit Date</th>
                      <th style={{ padding: '14px', color: 'white', textAlign: 'center' }}>Grand Total</th>
                      <th style={{ padding: '14px', color: 'white', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '14px', color: 'white', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report, idx) => (
                      <tr key={report._id || idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          <strong>{report.centerName}</strong>
                          <br/>
                          <small style={{ color: '#666' }}>{report.centerCode}</small>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{report.auditDateString || '-'}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: getStatusColor(report.grandTotal) }}>
                          {report.grandTotal?.toFixed(2) || 0}/100
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            background: getStatusColor(report.grandTotal),
                            color: 'white',
                            padding: '5px 15px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {getStatusText(report.grandTotal)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleViewReport(report)}
                            style={{
                              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 20px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            👁️ View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          // DETAILED REPORT VIEW
          <div style={{ background: 'white', borderRadius: '12px', padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>
                📋 Audit Report - {selectedReport.centerName}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSaveRemarks}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 25px',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? '⏳ Saving...' : '💾 Save All Remarks'}
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{
                    background: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 25px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ← Back to List
                </button>
              </div>
            </div>

            {/* Center Info */}
            <div style={{
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '25px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              <div><strong>Center Code:</strong> {selectedReport.centerCode}</div>
              <div><strong>Center Name:</strong> {selectedReport.centerName}</div>
              <div><strong>CH Name:</strong> {selectedReport.chName || '-'}</div>
              <div><strong>Audit Date:</strong> {selectedReport.auditDateString || '-'}</div>
              <div><strong>Center Head:</strong> {selectedReport.centerHeadName || '-'}</div>
              <div><strong>Zonal Head:</strong> {selectedReport.zonalHeadName || '-'}</div>
            </div>

            {/* Score Summary */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '25px',
              color: 'white',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedReport.frontOfficeScore?.toFixed(2) || 0}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Front Office /30</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedReport.deliveryProcessScore?.toFixed(2) || 0}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Delivery /40</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {selectedReport.placementApplicable === 'no' ? 'NA' : (selectedReport.placementScore?.toFixed(2) || 0)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Placement /15</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedReport.managementScore?.toFixed(2) || 0}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Management /15</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{selectedReport.grandTotal?.toFixed(2) || 0}</div>
                <div style={{ fontSize: '12px' }}>GRAND TOTAL /100</div>
              </div>
            </div>

            {/* Checkpoint Details Table */}
            {auditAreas.map((area, areaIdx) => {
              // Skip placement if NA
              if (area.areaName === 'Placement Process' && selectedReport.placementApplicable === 'no') {
                return (
                  <div key={areaIdx} style={{ marginBottom: '25px' }}>
                    <h3 style={{
                      background: '#e0e0e0',
                      color: '#666',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      margin: '0 0 10px 0'
                    }}>
                      📋 {area.areaName} - NA (Not Applicable)
                    </h3>
                  </div>
                );
              }

              return (
                <div key={areaIdx} style={{ marginBottom: '25px' }}>
                  <h3 style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px 8px 0 0',
                    margin: 0
                  }}>
                    📋 {area.areaName} (Max: {area.maxScore})
                  </h3>
                  
                  <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>S.No</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Checkpoint</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Max Score</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Samples</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Compliant</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>%</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Score</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Auditor Remarks</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', background: '#e8f5e9' }}>Center Head Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {area.checkpoints.map((cp, cpIdx) => {
                          const cpData = selectedReport[cp.id] || {};
                          return (
                            <tr key={cp.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '10px', textAlign: 'center' }}>{cpIdx + 1}</td>
                              <td style={{ padding: '10px' }}>{cp.name}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{cp.maxScore}</td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>{cpData.totalSamples || '-'}</td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>{cpData.samplesCompliant || '-'}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                                {cpData.compliantPercent ? `${cpData.compliantPercent.toFixed(1)}%` : '-'}
                              </td>
                              <td style={{ 
                                padding: '10px', 
                                textAlign: 'center', 
                                fontWeight: 'bold',
                                color: getScoreColor(cpData.score, cp.maxScore)
                              }}>
                                {cpData.score?.toFixed(2) || '0.00'}
                              </td>
                              <td style={{ padding: '10px', fontSize: '13px', color: '#666' }}>
                                {cpData.remarks || '-'}
                              </td>
                              <td style={{ padding: '8px', background: '#f1f8e9' }}>
                                <textarea
                                  value={checkpointRemarks[cp.id] || ''}
                                  onChange={(e) => handleCheckpointRemarkChange(cp.id, e.target.value)}
                                  placeholder="Enter remarks..."
                                  style={{
                                    width: '100%',
                                    minHeight: '50px',
                                    padding: '8px',
                                    border: '1px solid #81c784',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Remarks Section */}
            <div style={{
              background: '#f8f9fa',
              padding: '25px',
              borderRadius: '10px',
              marginTop: '30px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Auditor's Overall Remarks (Read-only) */}
              <div style={{ flex: 1, marginRight: '20px' }}>
                <label style={{ fontWeight: 'bold', color: '#667eea', display: 'block', marginBottom: '8px' }}>
                  📝 Auditor's Remarks (Read-only):
                </label>
                <div style={{
                  background: '#e3f2fd',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #90caf9',
                  minHeight: '60px',
                  color: '#333'
                }}>
                  {selectedReport.remarksText || 'No remarks from auditor.'}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveRemarks}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 40px',
                  borderRadius: '8px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 4px 15px rgba(17, 153, 142, 0.4)'
                }}
              >
                {saving ? '⏳ Saving...' : '💾 Save All Remarks'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CenterDashboard;