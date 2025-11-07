/**
 * HTML Report Generator Script
 *
 * Generates an HTML version of the E2E test report
 * Usage: node scripts/generate-html-report.js
 */

const fs = require('fs');
const path = require('path');

// Import the testReporter (simplified for Node.js execution)
// In a real scenario, this would read from the saved JSON report
async function generateHTMLReport() {
  try {
    // Check if JSON report exists
    const jsonReportPath = path.join(
      __dirname,
      '..',
      'e2e',
      'reports',
      'e2e-report.json',
    );

    if (!fs.existsSync(jsonReportPath)) {
      console.log(
        '⚠️  No JSON report found. Run E2E tests first to generate report.',
      );
      console.log('   Expected location:', jsonReportPath);
      return;
    }

    const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8'));

    // Generate HTML (same template as in testReporter.ts)
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ELARO E2E Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #2C5EFF; border-bottom: 3px solid #2C5EFF; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #2C5EFF; }
    .stat-value { font-size: 2em; font-weight: bold; color: #2C5EFF; }
    .stat-label { color: #666; font-size: 0.9em; margin-top: 5px; }
    .stat-value.passed { color: #28a745; }
    .stat-value.failed { color: #dc3545; }
    .stat-value.skipped { color: #ffc107; }
    .pass-section { margin: 30px 0; padding: 20px; background: #fafafa; border-radius: 6px; }
    .test-item { padding: 10px; margin: 5px 0; border-radius: 4px; }
    .passed { background: #d4edda; border-left: 4px solid #28a745; }
    .failed { background: #f8d7da; border-left: 4px solid #dc3545; }
    .skipped { background: #fff3cd; border-left: 4px solid #ffc107; }
    .manual { background: #e7f3ff; border-left: 4px solid #007bff; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 10px; }
    .badge-manual { background: #007bff; color: white; }
    .screens-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .screen-tag { background: #e9ecef; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; }
    .error-box { margin-top: 5px; padding: 8px; background: #fee; border-radius: 4px; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 ELARO E2E Test Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    
    <div class="summary">
      <div class="stat-card">
        <div class="stat-value">${report.overall.totalPasses}</div>
        <div class="stat-label">Total Passes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report.overall.totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value passed">${report.overall.totalPassed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value failed">${report.overall.totalFailed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value skipped">${report.overall.totalSkipped}</div>
        <div class="stat-label">Skipped</div>
      </div>
    </div>

    ${report.passes
      .map(
        pass => `
      <div class="pass-section">
        <h2>Pass ${pass.pass}: ${pass.name}</h2>
        <p><strong>Status:</strong> <span style="color: ${pass.status === 'passed' ? '#28a745' : pass.status === 'failed' ? '#dc3545' : '#ffc107'};">${pass.status.toUpperCase()}</span></p>
        <p><strong>Tests:</strong> ${pass.summary.total} | Passed: ${pass.summary.passed} | Failed: ${pass.summary.failed} | Skipped: ${pass.summary.skipped}</p>
        
        ${
          pass.screens && pass.screens.length > 0
            ? `
          <div style="margin-top: 15px;">
            <strong>Screens Visited:</strong>
            <div class="screens-list">
              ${pass.screens.map(s => `<span class="screen-tag">${s}</span>`).join('')}
            </div>
          </div>
        `
            : ''
        }
        
        <div style="margin-top: 20px;">
          <strong>Test Results:</strong>
          ${Object.values(pass.tests || {})
            .map(
              test => `
            <div class="test-item ${test.status} ${test.manual ? 'manual' : ''}">
              <strong>${test.name}</strong>
              ${test.manual ? '<span class="badge badge-manual">MANUAL</span>' : ''}
              <span style="float: right;">${test.duration}ms</span>
              ${test.error ? `<div class="error-box">❌ ${test.error}</div>` : ''}
            </div>
          `,
            )
            .join('')}
        </div>
        
        ${
          pass.errors && pass.errors.length > 0
            ? `
          <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border-radius: 4px;">
            <strong>Errors:</strong>
            <ul style="margin: 5px 0;">
              ${pass.errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
        
        ${
          pass.warnings && pass.warnings.length > 0
            ? `
          <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
            <strong>Warnings:</strong>
            <ul style="margin: 5px 0;">
              ${pass.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
    `,
      )
      .join('')}
    
    ${
      report.overall.allScreens && report.overall.allScreens.length > 0
        ? `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
        <h2>All Screens Visited</h2>
        <div class="screens-list">
          ${report.overall.allScreens.map(s => `<span class="screen-tag">${s}</span>`).join('')}
        </div>
      </div>
    `
        : ''
    }
  </div>
</body>
</html>`;

    // Save HTML report
    const htmlReportPath = path.join(
      __dirname,
      '..',
      'e2e',
      'reports',
      'e2e-report.html',
    );
    fs.writeFileSync(htmlReportPath, html, 'utf-8');

    console.log(`✅ HTML report generated: ${htmlReportPath}`);
    console.log(`📊 Open in browser: file://${htmlReportPath}`);
  } catch (error) {
    console.error('❌ Error generating HTML report:', error);
    process.exit(1);
  }
}

generateHTMLReport();
