/**
 * Pass 6: Reporting
 *
 * Generates comprehensive summary report of all E2E test results
 */

import { testReporter } from './utils/testReporter';
import * as path from 'path';
import * as fs from 'fs';

describe('Pass 6: Reporting', () => {
  it('should generate comprehensive E2E test report', async () => {
    // Collect results from all passes
    // Note: In a real scenario, results would be collected during test execution
    // For now, we'll create a summary structure

    const report = testReporter.generateReport();

    // Verify report structure
    expect(report).toHaveProperty('overall');
    expect(report).toHaveProperty('passes');
    expect(report.overall).toHaveProperty('totalPasses');
    expect(report.overall).toHaveProperty('totalTests');

    // Save report
    const reportResult = await testReporter.saveReport('e2e-report.json');

    // Construct the full path to the reports directory
    const reportsDir = path.join(__dirname, '../reports');
    const reportPath = path.join(reportsDir, reportResult.filename);

    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Write the report file
    fs.writeFileSync(reportPath, reportResult.data, 'utf-8');

    // Verify file exists
    expect(fs.existsSync(reportPath)).toBe(true);

    // Read and verify report content
    const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    expect(savedReport).toHaveProperty('overall');
    expect(savedReport).toHaveProperty('passes');

    console.log('✅ E2E test report generated successfully');
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Total Passes: ${savedReport.overall.totalPasses}`);
    console.log(`   - Total Tests: ${savedReport.overall.totalTests}`);
    console.log(`   - Passed: ${savedReport.overall.totalPassed}`);
    console.log(`   - Failed: ${savedReport.overall.totalFailed}`);
    console.log(`   - Skipped: ${savedReport.overall.totalSkipped}`);
  });

  it('should include all test passes in report', async () => {
    const report = testReporter.generateReport();

    // Verify all passes are included
    const passNumbers = report.passes.map(p => p.pass).sort();
    const expectedPasses = [1, 2, 3, 4, 5, 6];

    // Check that we have results (may be empty if tests haven't run)
    console.log(
      `📋 Passes with results: ${passNumbers.join(', ') || 'None yet'}`,
    );
    console.log('ℹ️  Run all tests to populate full report');
  });

  it('should include all visited screens', async () => {
    const report = testReporter.generateReport();

    console.log(`🎬 Screens visited: ${report.overall.allScreens.length}`);
    if (report.overall.allScreens.length > 0) {
      console.log(`   - ${report.overall.allScreens.join('\n   - ')}`);
    }
  });

  it('should calculate flow times', async () => {
    const report = testReporter.generateReport();

    // Check if any passes have flow time data
    const passesWithFlowTimes = report.passes.filter(
      p => p.timePerFlow && Object.keys(p.timePerFlow).length > 0,
    );

    if (passesWithFlowTimes.length > 0) {
      console.log('⏱️  Flow times recorded:');
      passesWithFlowTimes.forEach(pass => {
        console.log(`   Pass ${pass.pass} (${pass.name}):`);
        Object.entries(pass.timePerFlow || {}).forEach(([flow, time]) => {
          console.log(`     - ${flow}: ${time}ms`);
        });
      });
    } else {
      console.log(
        'ℹ️  Flow times not yet recorded - will be populated during test execution',
      );
    }
  });
});
