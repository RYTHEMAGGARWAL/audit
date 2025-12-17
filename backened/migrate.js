// ========================================
// Migration Script: Excel to MongoDB
// Run ONCE: node migrate.js
// ========================================

const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true },
  mobile: { type: String, default: '' },
  role: { type: String, enum: ['Admin', 'User'], default: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const centerSchema = new mongoose.Schema({
  centerCode: { type: String, required: true, unique: true, uppercase: true },
  centerName: { type: String, required: true },
  chName: { type: String, default: '' },
  geolocation: { type: String, default: '' },
  centerHeadName: { type: String, default: '' },
  zonalHeadName: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const checkpointDataSchema = new mongoose.Schema({
  totalSamples: { type: String, default: '' },
  samplesCompliant: { type: String, default: '' },
  compliantPercent: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  remarks: { type: String, default: '' }
}, { _id: false });

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
  managementScore: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  auditDateString: { type: String, default: '' },
  FO1: checkpointDataSchema, FO2: checkpointDataSchema, FO3: checkpointDataSchema, FO4: checkpointDataSchema, FO5: checkpointDataSchema,
  DP1: checkpointDataSchema, DP2: checkpointDataSchema, DP3: checkpointDataSchema, DP4: checkpointDataSchema, DP5: checkpointDataSchema,
  DP6: checkpointDataSchema, DP7: checkpointDataSchema, DP8: checkpointDataSchema, DP9: checkpointDataSchema, DP10: checkpointDataSchema, DP11: checkpointDataSchema,
  PP1: checkpointDataSchema, PP2: checkpointDataSchema, PP3: checkpointDataSchema, PP4: checkpointDataSchema,
  MP1: checkpointDataSchema, MP2: checkpointDataSchema, MP3: checkpointDataSchema, MP4: checkpointDataSchema, MP5: checkpointDataSchema,
  placementApplicable: { type: String, default: 'yes' },
  submissionStatus: { type: String, default: 'Not Submitted' },
  currentStatus: { type: String, default: 'Not Submitted' },
  approvedBy: { type: String, default: '' },
  submittedDate: { type: String, default: '' },
  remarksText: { type: String, default: '' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Center = mongoose.model('Center', centerSchema);
const AuditReport = mongoose.model('AuditReport', auditReportSchema);

// Helper
const getCellValue = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object') {
    if (cell.value.text) return cell.value.text.toString().trim();
    if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('').trim();
    return '';
  }
  return cell.value.toString().trim();
};

async function migrateUsers() {
  console.log('\n📊 Migrating Users...');
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'public', 'users.xlsx'));
    const worksheet = workbook.worksheets[0];
    
    let count = 0;
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) {
        rows.push({
          username: getCellValue(row.getCell(1)).toLowerCase(),
          password: getCellValue(row.getCell(2)),
          firstname: getCellValue(row.getCell(3)),
          lastname: getCellValue(row.getCell(4)),
          email: getCellValue(row.getCell(5)).toLowerCase() || `user${rowNumber}@example.com`,
          mobile: getCellValue(row.getCell(6)),
          role: getCellValue(row.getCell(7)) || 'User'
        });
      }
    });

    for (const userData of rows) {
      if (!userData.username) continue;
      await User.findOneAndUpdate(
        { username: userData.username },
        userData,
        { upsert: true }
      );
      count++;
      console.log(`   ✅ ${userData.username} (${userData.role})`);
    }
    console.log(`   📊 Total: ${count} users migrated`);
  } catch (err) {
    console.log('   ⚠️ Users file not found or error:', err.message);
  }
}

async function migrateCenters() {
  console.log('\n🏢 Migrating Centers...');
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'public', 'centers.xlsx'));
    const worksheet = workbook.worksheets[0];
    
    let count = 0;
    worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
      if (rowNumber > 1) {
        const centerCode = getCellValue(row.getCell(1)).toUpperCase();
        if (!centerCode) return;
        
        await Center.findOneAndUpdate(
          { centerCode },
          {
            centerCode,
            centerName: getCellValue(row.getCell(2)),
            chName: getCellValue(row.getCell(3)),
            geolocation: getCellValue(row.getCell(4)),
            centerHeadName: getCellValue(row.getCell(5)),
            zonalHeadName: getCellValue(row.getCell(6))
          },
          { upsert: true }
        );
        count++;
        console.log(`   ✅ ${centerCode} - ${getCellValue(row.getCell(2))}`);
      }
    });
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`   🏢 Centers migrated`);
  } catch (err) {
    console.log('   ⚠️ Centers file not found or error:', err.message);
  }
}

async function migrateAuditReports() {
  console.log('\n📋 Migrating Audit Reports...');
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'public', 'audit-reports.xlsx'));
    const worksheet = workbook.worksheets[0];
    
    let count = 0;
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) {
        const centerCode = getCellValue(row.getCell(1));
        if (!centerCode) return;

        let auditData = {};
        const jsonStr = getCellValue(row.getCell(13));
        if (jsonStr) {
          try { auditData = JSON.parse(jsonStr); } catch(e) {}
        }

        rows.push({
          centerCode,
          centerName: getCellValue(row.getCell(2)),
          chName: getCellValue(row.getCell(3)),
          geolocation: getCellValue(row.getCell(4)),
          centerHeadName: getCellValue(row.getCell(5)),
          zonalHeadName: getCellValue(row.getCell(6)),
          frontOfficeScore: parseFloat(getCellValue(row.getCell(7))) || 0,
          deliveryProcessScore: parseFloat(getCellValue(row.getCell(8))) || 0,
          placementScore: parseFloat(getCellValue(row.getCell(9))) || 0,
          managementScore: parseFloat(getCellValue(row.getCell(10))) || 0,
          grandTotal: parseFloat(getCellValue(row.getCell(11))) || 0,
          auditDateString: getCellValue(row.getCell(12)),
          submissionStatus: getCellValue(row.getCell(14)) || 'Not Submitted',
          currentStatus: getCellValue(row.getCell(15)) || 'Not Submitted',
          approvedBy: getCellValue(row.getCell(16)),
          submittedDate: getCellValue(row.getCell(17)),
          remarksText: getCellValue(row.getCell(18)),
          placementApplicable: auditData._placementApplicable || 'yes',
          ...auditData
        });
      }
    });

    for (const reportData of rows) {
      await AuditReport.findOneAndUpdate(
        { centerCode: reportData.centerCode },
        reportData,
        { upsert: true }
      );
      count++;
      console.log(`   ✅ ${reportData.centerCode} - Score: ${reportData.grandTotal}/100`);
    }
    console.log(`   📋 Total: ${count} reports migrated`);
  } catch (err) {
    console.log('   ⚠️ Audit reports file not found or error:', err.message);
  }
}

async function runMigration() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🚀 EXCEL TO MONGODB MIGRATION         ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    await migrateUsers();
    await migrateCenters();
    await migrateAuditReports();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✅ MIGRATION COMPLETE!                ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n👉 Now run: npm run dev\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

runMigration();