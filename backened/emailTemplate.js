// emailTemplate.js - Professional Email Template for Audit Reports

// NIIT Logo URL (you can replace with actual logo URL)
const NIIT_LOGO = 'https://upload.wikimedia.org/wikipedia/en/thumb/e/ef/NIIT_logo.svg/1200px-NIIT_logo.svg.png';

// Helper function to get status color
const getStatusColor = (score, maxScore) => {
  const percent = (score / maxScore) * 100;
  if (percent >= 80) return '#28a745'; // Green - Compliant
  if (percent >= 65) return '#ffc107'; // Yellow - Amber
  return '#dc3545'; // Red - Non-Compliant
};

// Helper function to get status text
const getStatusText = (score, maxScore) => {
  const percent = (score / maxScore) * 100;
  if (percent >= 80) return 'Compliant';
  if (percent >= 65) return 'Amber';
  return 'Non-Compliant';
};

// Generate Summary Table HTML (for email body)
const generateSummaryTableHTML = (reportData) => {
  const fo = parseFloat(reportData.frontOfficeScore) || 0;
  const dp = parseFloat(reportData.deliveryProcessScore) || 0;
  const pp = parseFloat(reportData.placementScore) || 0;
  const mp = parseFloat(reportData.managementScore) || 0;
  const gt = parseFloat(reportData.grandTotal) || 0;
  const isPlacementNA = reportData.placementApplicable === 'no';

  return `
    <table style="width:100%; border-collapse:collapse; margin:20px 0; font-family:Arial, sans-serif;">
      <thead>
        <tr style="background:linear-gradient(135deg, #667eea, #764ba2);">
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">CENTER<br/>NAME</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">CH<br/>NAME</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">AUDIT<br/>DATE</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">FRONT<br/>OFFICE</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">DELIVERY</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">PLACEMENT</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">MANAGEMENT</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">GRAND<br/>TOTAL</th>
          <th style="padding:12px; color:white; border:1px solid #ddd; text-align:center;">AUDIT<br/>STATUS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; font-weight:bold;">${reportData.centerName || '-'}</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center;">${reportData.chName || '-'}</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center;">${reportData.auditDateString || reportData.auditDate || '-'}</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; color:${getStatusColor(fo, 30)}; font-weight:bold;">
            ${getStatusText(fo, 30)}<br/>(${fo.toFixed(2)})
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; color:${getStatusColor(dp, 40)}; font-weight:bold;">
            ${getStatusText(dp, 40)}<br/>(${dp.toFixed(2)})
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; color:${isPlacementNA ? '#999' : getStatusColor(pp, 15)}; font-weight:bold;">
            ${isPlacementNA ? 'NA' : `${getStatusText(pp, 15)}<br/>(${pp.toFixed(2)})`}
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; color:${getStatusColor(mp, 15)}; font-weight:bold;">
            ${getStatusText(mp, 15)}<br/>(${mp.toFixed(2)})
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; font-size:18px; font-weight:bold; color:${getStatusColor(gt, 100)};">
            ${gt.toFixed(2)}
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center; font-weight:bold; color:${getStatusColor(gt, 100)};">
            ${getStatusText(gt, 100)}
          </td>
        </tr>
      </tbody>
    </table>
  `;
};

// Main Email HTML Template
const generateEmailHTML = (reportData, customMessage = '') => {
  const summaryTable = generateSummaryTableHTML(reportData);
  const loginUrl = 'http://localhost:5173'; // Change to production URL
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f5f5f5;">
  <div style="max-width:800px; margin:0 auto; background-color:#ffffff;">
    
    <!-- Header with Logo -->
    <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:30px; text-align:center;">
      <img src="${NIIT_LOGO}" alt="NIIT" style="height:50px; margin-bottom:15px; filter:brightness(0) invert(1);" onerror="this.style.display='none'"/>
      <h1 style="color:white; margin:0; font-size:28px;">📋 Audit Report</h1>
      <p style="color:rgba(255,255,255,0.9); margin:10px 0 0; font-size:16px;">
        ${reportData.centerName} (${reportData.centerCode})
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding:30px;">
      
      <!-- Greeting -->
      <p style="font-size:16px; color:#333; margin-bottom:20px;">
        Dear Sir/Madam,
      </p>
      
      <p style="font-size:15px; color:#555; line-height:1.6;">
        Please find below the audit report summary for <strong>${reportData.centerName}</strong>.
      </p>

      <!-- Summary Table -->
      <div style="margin:25px 0; overflow-x:auto;">
        ${summaryTable}
      </div>

      <!-- Custom Message (if any) -->
      ${customMessage ? `
        <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border-left:4px solid #667eea;">
          <p style="margin:0; color:#333; white-space:pre-wrap;">${customMessage}</p>
        </div>
      ` : ''}

      <!-- Remarks Action Box -->
      <div style="background:linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding:25px; border-radius:10px; margin:30px 0; border:2px solid #4caf50; text-align:center;">
        <h3 style="color:#2e7d32; margin:0 0 15px;">📝 Want to Add Remarks?</h3>
        <p style="color:#388e3c; margin:0 0 20px; font-size:14px;">
          If you want to add your remarks/comments on this audit report, please login to the system with your credentials.
        </p>
        <a href="${loginUrl}" style="display:inline-block; background:linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color:white; padding:12px 30px; border-radius:25px; text-decoration:none; font-weight:bold; font-size:14px;">
          🔐 Login to Add Remarks
        </a>
      </div>

      <!-- PDF Notice -->
      <div style="background:#fff3e0; padding:15px 20px; border-radius:8px; margin:20px 0; border-left:4px solid #ff9800;">
        <p style="margin:0; color:#e65100; font-size:14px;">
          📎 <strong>Attachment:</strong> Full detailed audit report is attached as PDF for your reference.
        </p>
      </div>

      <!-- Footer Note -->
      <p style="font-size:14px; color:#666; margin-top:30px; line-height:1.6;">
        Best Regards,<br/>
        <strong>NIIT Audit Team</strong>
      </p>

    </div>

    <!-- Footer -->
    <div style="background:#f5f5f5; padding:20px; text-align:center; border-top:1px solid #ddd;">
      <p style="margin:0; color:#999; font-size:12px;">
        This is an automated email from NIIT Audit System. Please do not reply directly to this email.
      </p>
      <p style="margin:10px 0 0; color:#999; font-size:11px;">
        © ${new Date().getFullYear()} NIIT Limited. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;
};

// Generate PDF Content HTML (Detailed Report without Center Head Remarks)
const generatePDFHTML = (reportData) => {
  const checkpoints = {
    'Front Office': [
      { id: 'FO1', name: 'Enquires Entered in Pulse(Y/N)', weightage: 30, maxScore: 9 },
      { id: 'FO2', name: 'Enrolment form available in Pulse(Y/N)', weightage: 20, maxScore: 6 },
      { id: 'FO3', name: 'Pre assessment Available(Y/N)', weightage: 0, maxScore: 0 },
      { id: 'FO4', name: 'Documents uploaded in Pulse(Y/N)', weightage: 40, maxScore: 12 },
      { id: 'FO5', name: 'Availability of Marketing Material(Y/N)', weightage: 10, maxScore: 3 }
    ],
    'Delivery Process': [
      { id: 'DP1', name: 'Batch file maintained for all running batches', weightage: 15, maxScore: 6 },
      { id: 'DP2', name: 'Batch Heath Card available (>= 30 days)', weightage: 10, maxScore: 4 },
      { id: 'DP3', name: 'Attendance marked in EDL sheets correctly', weightage: 15, maxScore: 6 },
      { id: 'DP4', name: 'BMS maintained with observations >= 30 days', weightage: 5, maxScore: 2 },
      { id: 'DP5', name: 'FACT Certificate available at Center', weightage: 10, maxScore: 4 },
      { id: 'DP6', name: 'Post Assessment if applicable', weightage: 0, maxScore: 0 },
      { id: 'DP7', name: 'Appraisal sheet is maintained', weightage: 10, maxScore: 4 },
      { id: 'DP8', name: 'Appraisal status updated in Pulse', weightage: 5, maxScore: 2 },
      { id: 'DP9', name: 'Certification Status of eligible students', weightage: 10, maxScore: 4 },
      { id: 'DP10', name: 'Student signature obtained while issuing certificates', weightage: 10, maxScore: 4 },
      { id: 'DP11', name: 'Verification between System vs actual certificate date', weightage: 10, maxScore: 4 }
    ],
    'Placement Process': [
      { id: 'PP1', name: 'Student Placement Response', weightage: 15, maxScore: 2.25 },
      { id: 'PP2', name: 'CGT/Guest Lecture/Industry Visit Session', weightage: 10, maxScore: 1.50 },
      { id: 'PP3', name: 'Placement Bank & Aging', weightage: 15, maxScore: 2.25 },
      { id: 'PP4', name: 'Placement Proof Upload', weightage: 60, maxScore: 9.00 }
    ],
    'Management Process': [
      { id: 'MP1', name: 'Courseware issue to students/LMS Usage', weightage: 5, maxScore: 0.75 },
      { id: 'MP2', name: 'TIRM details register', weightage: 20, maxScore: 3.00 },
      { id: 'MP3', name: 'Monthly Centre Review Meeting conducted', weightage: 35, maxScore: 5.25 },
      { id: 'MP4', name: 'Physical asset verification', weightage: 30, maxScore: 4.50 },
      { id: 'MP5', name: 'Verification of bill authenticity', weightage: 10, maxScore: 1.50 }
    ]
  };

  const isPlacementNA = reportData.placementApplicable === 'no';
  const areaScores = {
    'Front Office': { score: parseFloat(reportData.frontOfficeScore) || 0, max: 30 },
    'Delivery Process': { score: parseFloat(reportData.deliveryProcessScore) || 0, max: 40 },
    'Placement Process': { score: parseFloat(reportData.placementScore) || 0, max: 15 },
    'Management Process': { score: parseFloat(reportData.managementScore) || 0, max: 15 }
  };

  let checkpointRows = '';
  let areaNum = 1;

  for (const [areaName, cps] of Object.entries(checkpoints)) {
    const isNA = areaName === 'Placement Process' && isPlacementNA;
    const areaScore = areaScores[areaName];
    
    // Area Header
    checkpointRows += `
      <tr style="background:${isNA ? '#9e9e9e' : 'linear-gradient(135deg, #667eea, #764ba2)'};">
        <td colspan="8" style="padding:12px; color:white; font-weight:bold; font-size:14px;">
          Area ${areaNum}: ${areaName} ${isNA ? '(N/A - Not Applicable)' : `(Total Score: ${areaScore.max})`}
        </td>
      </tr>
    `;

    // Checkpoint Rows
    cps.forEach((cp, idx) => {
      const cpData = reportData[cp.id] || {};
      checkpointRows += `
        <tr style="background:${isNA ? '#f5f5f5' : 'white'}; opacity:${isNA ? '0.7' : '1'};">
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${idx + 1}</td>
          <td style="padding:10px; border:1px solid #ddd;">${cp.name}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${isNA ? 'NA' : cp.weightage + '%'}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${isNA ? 'NA' : cp.maxScore}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${isNA ? 'NA' : (cpData.totalSamples || '-')}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${isNA ? 'NA' : (cpData.samplesCompliant || '-')}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${isNA ? 'NA' : ((cpData.compliantPercent || 0) + '%')}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center; font-weight:bold; color:${isNA ? '#999' : '#11998e'};">
            ${isNA ? 'NA' : (cpData.score || 0)}
          </td>
        </tr>
      `;
    });

    // Area Total Row
    checkpointRows += `
      <tr style="background:${isNA ? '#e0e0e0' : '#e8f5e9'}; font-weight:bold;">
        <td colspan="7" style="padding:10px; border:1px solid #ddd; text-align:right;">
          ${areaName} - Total Score:
        </td>
        <td style="padding:10px; border:1px solid #ddd; text-align:center; color:${isNA ? '#999' : '#11998e'}; font-size:16px;">
          ${isNA ? 'NA' : areaScore.score.toFixed(2)}
        </td>
      </tr>
    `;

    areaNum++;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { height: 50px; margin-bottom: 10px; }
    .title { color: #667eea; font-size: 24px; margin: 10px 0; }
    .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .info-row { display: flex; margin: 5px 0; }
    .info-label { font-weight: bold; width: 150px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    th { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px; }
    .grand-total { background: #667eea; color: white; font-weight: bold; font-size: 16px; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${NIIT_LOGO}" class="logo" alt="NIIT"/>
    <h1 class="title">📋 Audit Report</h1>
    <p style="color:#666;">${reportData.centerName} (${reportData.centerCode})</p>
  </div>

  <div class="info-box">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <div><strong>Center Code:</strong> ${reportData.centerCode}</div>
      <div><strong>Center Name:</strong> ${reportData.centerName}</div>
      <div><strong>CH Name:</strong> ${reportData.chName || '-'}</div>
      <div><strong>Audit Date:</strong> ${reportData.auditDateString || reportData.auditDate || '-'}</div>
      <div><strong>Center Head:</strong> ${reportData.centerHeadName || '-'}</div>
      <div><strong>Zonal Head:</strong> ${reportData.zonalHeadName || '-'}</div>
    </div>
  </div>

  <h3 style="color:#667eea; border-bottom:2px solid #667eea; padding-bottom:5px;">📊 Detailed Checkpoint Report</h3>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">S.No</th>
        <th>Checkpoint</th>
        <th style="width:70px;">Weightage</th>
        <th style="width:70px;">Max Score</th>
        <th style="width:80px;">Total Samples</th>
        <th style="width:80px;">Compliant</th>
        <th style="width:70px;">%</th>
        <th style="width:70px;">Score</th>
      </tr>
    </thead>
    <tbody>
      ${checkpointRows}
      <tr class="grand-total">
        <td colspan="7" style="padding:12px; text-align:right;">GRAND TOTAL (out of 100):</td>
        <td style="padding:12px; text-align:center; font-size:18px;">${(parseFloat(reportData.grandTotal) || 0).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  ${reportData.remarksText ? `
    <div style="background:#e3f2fd; padding:15px; border-radius:8px; margin:20px 0; border-left:4px solid #2196f3;">
      <h4 style="margin:0 0 10px; color:#1565c0;">📝 Auditor's Remarks:</h4>
      <p style="margin:0; color:#333;">${reportData.remarksText}</p>
    </div>
  ` : ''}

  <div class="footer">
    <p>Generated on: ${new Date().toLocaleString('en-GB')}</p>
    <p>© ${new Date().getFullYear()} NIIT Limited. All rights reserved.</p>
  </div>
</body>
</html>
  `;
};

// Generate Email Subject
const generateEmailSubject = (reportData) => {
  const gt = parseFloat(reportData.grandTotal) || 0;
  const status = gt >= 80 ? 'Compliant' : gt >= 65 ? 'Amber' : 'Non-Compliant';
  return `Audit Report - ${reportData.centerName} - Score: ${gt.toFixed(2)}/100 - ${status}`;
};

// Export functions
module.exports = {
  generateEmailHTML,
  generatePDFHTML,
  generateEmailSubject,
  generateSummaryTableHTML,
  getStatusColor,
  getStatusText
};