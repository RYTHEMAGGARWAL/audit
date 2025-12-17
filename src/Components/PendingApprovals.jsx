import React, { useState, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import axios from 'axios';
import { API_URL } from '../config';
import './Audit.css';

const PendingApprovals = ({ onApprovalUpdate }) => {
  const [pendingReports, setPendingReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState(null);

  const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');

  const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.text) return cell.value.text.toString().trim();
      if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('').trim();
      return '';
    }
    return cell.value.toString().trim();
  };

  // Audit Areas Data for remarks view
  const auditAreas = [
    {
      areaNumber: 1,
      areaName: "Front Office",
      checkpoints: [
        { id: "FO1", checkPoint: "Enquires Entered in Pulse(Y/N)" },
        { id: "FO2", checkPoint: "Enrolment form available in Pulse(Y/N)" },
        { id: "FO3", checkPoint: "Pre assessment Available(Y/N)" },
        { id: "FO4", checkPoint: "Documents uploaded in Pulse(Y/N)" },
        { id: "FO5", checkPoint: "Availability of Marketing Material(Y/N)" }
      ]
    },
    {
      areaNumber: 2,
      areaName: "Delivery Process",
      checkpoints: [
        { id: "DP1", checkPoint: "Batch file maintained for all running batches" },
        { id: "DP2", checkPoint: "Batch Heath Card available for all batches where batch duration is >= 30 days" },
        { id: "DP3", checkPoint: "Attendance marked in EDL sheets correctly" },
        { id: "DP4", checkPoint: "BMS maintained with observations >= 30 days" },
        { id: "DP5", checkPoint: "FACT Certificate available at Center (Y/N)" },
        { id: "DP6", checkPoint: "Appraisal sheet is maintained (Y/N)" },
        { id: "DP7", checkPoint: "Appraisal status updated in Pulse(Y/N)" },
        { id: "DP8", checkPoint: "Certification Status of eligible students" },
        { id: "DP9", checkPoint: "Student signature obtained while issuing certificates" },
        { id: "DP10", checkPoint: "Verification between System issue date Vs actual certificate issue date" }
      ]
    },
    {
      areaNumber: 3,
      areaName: "Placement Process",
      checkpoints: [
        { id: "PP1", checkPoint: "Placement forms available in Pulse" },
        { id: "PP2", checkPoint: "Placement proof uploaded in Pulse" }
      ]
    },
    {
      areaNumber: 4,
      areaName: "Management Process",
      checkpoints: [
        { id: "MP1", checkPoint: "Courseware issue to students done on time/Usage of LMS" },
        { id: "MP2", checkPoint: "TIRM details register" },
        { id: "MP3", checkPoint: "Monthly Centre Review Meeting is conducted" },
        { id: "MP4", checkPoint: "Physcial asset verification" },
        { id: "MP5", checkPoint: "Verification of bill authenticity" }
      ]
    }
  ];

  // Load pending reports from MongoDB
  const loadPendingReports = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading pending reports from MongoDB...');
      
      const response = await fetch(`${API_URL}/api/audit-reports/pending`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const reports = await response.json();
      console.log('✅ Pending reports loaded:', reports.length);
      
      // Transform data to match expected format
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

      setPendingReports(formattedReports);
    } catch (err) {
      console.error('❌ Error loading pending reports:', err);
      setPendingReports([]);
    } finally {
      setLoading(false);
    }
  };

  // View remarks - MongoDB version
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
      setSelectedRemarks({ 
        centerName: report.centerName, 
        centerCode: report.centerCode,
        data: data,
        customRemarks: report.remarksText || ''
      });
      setShowRemarksModal(true);
    } catch (e) {
      alert('❌ Unable to load remarks!');
    }
  };

  // Approve Report - MongoDB version
  const handleApproveReport = async (centerCode) => {
    if (window.confirm('✅ Approve this report?')) {
      try {
        setLoading(true);
        
        // Find report ID
        const report = pendingReports.find(r => r.centerCode === centerCode);
        if (!report || !report._id) {
          throw new Error('Report not found');
        }

        const response = await fetch(`${API_URL}/api/audit-reports/${report._id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminName: loggedUser.firstname + ' ' + (loggedUser.lastname || ''),
            remarks: ''
          })
        });

        if (response.ok) {
          alert('✅ Report approved successfully!');
          await loadPendingReports();
          if (onApprovalUpdate) onApprovalUpdate();
        } else {
          throw new Error('Approve failed');
        }
      } catch (err) {
        console.error('❌ Error:', err);
        alert('❌ Failed to approve report!');
      } finally {
        setLoading(false);
      }
    }
  };

  // Reject Report with detailed reason - MongoDB version
  const handleRejectReport = async (centerCode, centerName) => {
    const rejectionReason = prompt(`❌ Enter detailed rejection reason for ${centerName}:\n\nBe specific about what needs to be improved:`);
    
    if (rejectionReason && rejectionReason.trim()) {
      if (window.confirm(`Reject this report with reason:\n"${rejectionReason}"\n\nContinue?`)) {
        try {
          setLoading(true);

          // Find report ID
          const report = pendingReports.find(r => r.centerCode === centerCode);
          if (!report || !report._id) {
            throw new Error('Report not found');
          }

          const response = await fetch(`${API_URL}/api/audit-reports/${report._id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminName: loggedUser.firstname + ' ' + (loggedUser.lastname || ''),
              remarks: rejectionReason
            })
          });

          if (response.ok) {
            alert('❌ Report rejected! User will be notified.');
            await loadPendingReports();
            if (onApprovalUpdate) onApprovalUpdate();
          } else {
            throw new Error('Reject failed');
          }
        } catch (err) {
          console.error('❌ Error:', err);
          alert('❌ Failed to reject report!');
        } finally {
          setLoading(false);
        }
      }
    } else if (rejectionReason !== null) {
      alert('⚠️ Please provide a rejection reason!');
    }
  };

  useEffect(() => {
    loadPendingReports();
  }, []);

  return (
    <div className="management-section">
      <h2>⏳ Pending Approvals</h2>

      <div className="status-bar">
        <span>
          📊 Pending Reports: {pendingReports.length}
        </span>
        <button onClick={loadPendingReports} style={{ padding: '8px 16px' }}>
          🔄 Refresh
        </button>
      </div>

      <div className="view-user">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#667eea' }}>
            Loading pending reports...
          </p>
        ) : pendingReports.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            background: 'linear-gradient(135deg, #e3f2fd 0%, #c8e6c9 100%)',
            borderRadius: '12px',
            marginTop: '20px'
          }}>
            <h3 style={{ color: '#4CAF50', fontSize: '24px', marginBottom: '10px' }}>
              🎉 All Caught Up!
            </h3>
            <p style={{ color: '#666', fontSize: '16px' }}>
              No pending approvals at the moment. Great job!
            </p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ marginTop: '20px' }}>
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
                  <th style={{ minWidth: '200px' }}>USER<br/>REMARKS</th>
                  <th>SUBMITTED<br/>DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map((report, index) => {
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

                  return (
                    <tr key={index} style={{ 
                      animation: 'fadeInUp 0.5s ease',
                      animationDelay: `${index * 0.1}s`,
                      animationFillMode: 'both'
                    }}>
                      <td style={{ fontWeight: '600' }}>{report.centerName}</td>
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
                        fontSize: '18px',
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
                      <td style={{ 
                        textAlign: 'left', 
                        fontSize: '12px',
                        padding: '10px',
                        maxWidth: '200px'
                      }}>
                        {report.remarksText ? (
                          <div style={{
                            background: '#fff9e6',
                            border: '1px solid #ffc107',
                            borderRadius: '8px',
                            padding: '10px',
                            maxHeight: '80px',
                            overflow: 'auto',
                            lineHeight: '1.4',
                            color: '#333',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {report.remarksText}
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>
                            No remarks
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '13px' }}>
                        {report.submittedDate || '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleViewRemarks(report)}
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
                              transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 6px 20px rgba(17, 153, 142, 0.4)';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 12px rgba(17, 153, 142, 0.3)';
                            }}
                          >
                            📝 View Remarks
                          </button>
                          <button
                            onClick={() => handleApproveReport(report.centerCode)}
                            disabled={loading}
                            style={{
                              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                              transition: 'all 0.3s ease',
                              opacity: loading ? 0.6 : 1
                            }}
                            onMouseOver={(e) => {
                              if (!loading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                              }
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                            }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleRejectReport(report.centerCode, report.centerName)}
                            disabled={loading}
                            style={{
                              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                              transition: 'all 0.3s ease',
                              opacity: loading ? 0.6 : 1
                            }}
                            onMouseOver={(e) => {
                              if (!loading) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.4)';
                              }
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                            }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remarks Modal */}
      {showRemarksModal && selectedRemarks && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #667eea',
              paddingBottom: '15px'
            }}>
              <h3 style={{ color: '#667eea', margin: 0 }}>
                📝 Audit Remarks - {selectedRemarks.centerName}
              </h3>
              <span style={{ 
                background: '#f0f0f0', 
                padding: '5px 15px', 
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#666'
              }}>
                Code: {selectedRemarks.centerCode}
              </span>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              {/* Custom Remarks from View Reports */}
              {selectedRemarks.customRemarks && (
                <div style={{ 
                  marginBottom: '25px',
                  padding: '15px',
                  background: 'linear-gradient(135deg, #fff9e6 0%, #ffe9b3 100%)',
                  borderRadius: '12px',
                  border: '2px solid #ffc107',
                  boxShadow: '0 4px 12px rgba(255, 193, 7, 0.2)'
                }}>
                  <h4 style={{ 
                    color: '#ff9800',
                    marginBottom: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    ⭐ Overall Remarks (From User):
                  </h4>
                  <p style={{ 
                    color: '#333',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    marginBottom: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {selectedRemarks.customRemarks}
                  </p>
                </div>
              )}
              
              {/* Checkpoint-wise Remarks */}
              {auditAreas.map((area) => {
                // Check if any checkpoint in this area has remarks
                const hasRemarks = area.checkpoints.some(cp => selectedRemarks.data[cp.id]?.remarks);
                
                if (!hasRemarks) return null;

                return (
                  <div key={area.areaNumber} style={{ marginBottom: '25px' }}>
                    <h4 style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '12px 15px', 
                      borderRadius: '8px',
                      marginBottom: '12px',
                      fontSize: '15px'
                    }}>
                      {area.areaName}
                    </h4>
                    {area.checkpoints.map((cp) => {
                      const remark = selectedRemarks.data[cp.id]?.remarks;
                      if (remark) {
                        return (
                          <div key={cp.id} style={{ 
                            marginLeft: '15px', 
                            marginBottom: '12px',
                            padding: '12px 15px',
                            background: '#f9f9f9',
                            borderRadius: '8px',
                            borderLeft: '4px solid #667eea'
                          }}>
                            <div style={{ 
                              fontWeight: 'bold', 
                              color: '#333',
                              marginBottom: '6px',
                              fontSize: '14px'
                            }}>
                              {cp.checkPoint}
                            </div>
                            <p style={{ 
                              marginTop: '5px', 
                              color: '#555',
                              fontSize: '13px',
                              lineHeight: '1.5',
                              marginBottom: 0
                            }}>
                              {remark}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              })}
              
              {/* If no remarks at all */}
              {!auditAreas.some(area => 
                area.checkpoints.some(cp => selectedRemarks.data[cp.id]?.remarks)
              ) && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#999',
                  fontSize: '14px'
                }}>
                  📭 No remarks added for this audit report.
                </div>
              )}
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              paddingTop: '15px',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => setShowRemarksModal(false)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 30px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;