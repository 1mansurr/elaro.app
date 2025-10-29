/**
 * E2E Test Reporter
 * 
 * Collects test results and generates comprehensive reports
 * 
 * Note: File system operations need to be handled differently in Detox
 * This reporter collects data in memory - actual file writing happens via Jest reporter
 */

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screens?: string[];
  manual?: boolean; // Flag for tests requiring manual verification
}

export interface PassResult {
  pass: number;
  name: string;
  timestamp: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'partial';
  tests: {
    [key: string]: TestResult;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  errors: string[];
  warnings: string[];
  screens: string[];
  timePerFlow?: { [flow: string]: number };
}

class TestReporter {
  private results: Map<number, PassResult> = new Map();
  private currentPass: number | null = null;
  private startTime: number = 0;

  startPass(passNumber: number, passName: string) {
    this.currentPass = passNumber;
    this.startTime = Date.now();

    this.results.set(passNumber, {
      pass: passNumber,
      name: passName,
      timestamp: new Date().toISOString(),
      status: 'running',
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      },
      errors: [],
      warnings: [],
      screens: [],
    });
  }

  recordTest(testName: string, status: 'passed' | 'failed' | 'skipped', duration: number, error?: string, screens?: string[], manual?: boolean) {
    if (this.currentPass === null) return;

    const pass = this.results.get(this.currentPass)!;
    pass.tests[testName] = {
      name: testName,
      status,
      duration,
      error,
      screens,
      manual,
    };

    pass.summary.total++;
    if (status === 'passed') pass.summary.passed++;
    else if (status === 'failed') pass.summary.failed++;
    else if (status === 'skipped') pass.summary.skipped++;

    if (error) {
      pass.errors.push(`${testName}: ${error}`);
    }

    if (screens) {
      pass.screens = [...new Set([...pass.screens, ...screens])];
    }
  }

  addWarning(warning: string) {
    if (this.currentPass === null) return;
    const pass = this.results.get(this.currentPass)!;
    pass.warnings.push(warning);
  }

  addScreen(screenName: string) {
    if (this.currentPass === null) return;
    const pass = this.results.get(this.currentPass)!;
    if (!pass.screens.includes(screenName)) {
      pass.screens.push(screenName);
    }
  }

  recordFlowTime(flowName: string, duration: number) {
    if (this.currentPass === null) return;
    const pass = this.results.get(this.currentPass)!;
    if (!pass.timePerFlow) {
      pass.timePerFlow = {};
    }
    pass.timePerFlow[flowName] = duration;
  }

  completePass() {
    if (this.currentPass === null) return;

    const pass = this.results.get(this.currentPass)!;
    const totalDuration = Date.now() - this.startTime;

    // Determine overall status
    if (pass.summary.failed === 0 && pass.summary.total > 0) {
      pass.status = 'passed';
    } else if (pass.summary.passed > 0) {
      pass.status = 'partial';
    } else if (pass.summary.total === 0) {
      pass.status = 'pending';
    } else {
      pass.status = 'failed';
    }

    pass.timestamp = new Date().toISOString();
    this.currentPass = null;
  }

  generateReport(): {
    overall: {
      totalPasses: number;
      passed: number;
      failed: number;
      totalTests: number;
      totalPassed: number;
      totalFailed: number;
      totalSkipped: number;
      allScreens: string[];
    };
    passes: PassResult[];
  } {
    const passes = Array.from(this.results.values());
    
    const overall = {
      totalPasses: passes.length,
      passed: passes.filter(p => p.status === 'passed').length,
      failed: passes.filter(p => p.status === 'failed').length,
      totalTests: passes.reduce((sum, p) => sum + p.summary.total, 0),
      totalPassed: passes.reduce((sum, p) => sum + p.summary.passed, 0),
      totalFailed: passes.reduce((sum, p) => sum + p.summary.failed, 0),
      totalSkipped: passes.reduce((sum, p) => sum + p.summary.skipped, 0),
      allScreens: Array.from(new Set(passes.flatMap(p => p.screens))),
    };

    return { overall, passes };
  }

  async saveReport(filename: string = 'e2e-report.json') {
    const report = this.generateReport();
    
    // In Detox/Jest environment, we'll return the report data
    // File saving can be handled by Jest reporter or post-test script
    const reportData = JSON.stringify(report, null, 2);
    
    // Log report to console (Jest reporter can capture this)
    console.log('\n📊 E2E Test Report:');
    console.log(reportData);
    
    // Return report data for potential file saving
    return {
      filename,
      data: reportData,
      report,
    };
  }

  async generateHTMLReport(filename: string = 'e2e-report.html') {
    const report = this.generateReport();
    
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

    ${report.passes.map(pass => `
      <div class="pass-section">
        <h2>Pass ${pass.pass}: ${pass.name}</h2>
        <p><strong>Status:</strong> <span style="color: ${pass.status === 'passed' ? '#28a745' : pass.status === 'failed' ? '#dc3545' : '#ffc107'};">${pass.status.toUpperCase()}</span></p>
        <p><strong>Tests:</strong> ${pass.summary.total} | Passed: ${pass.summary.passed} | Failed: ${pass.summary.failed} | Skipped: ${pass.summary.skipped}</p>
        
        ${pass.screens.length > 0 ? `
          <div style="margin-top: 15px;">
            <strong>Screens Visited:</strong>
            <div class="screens-list">
              ${pass.screens.map(s => `<span class="screen-tag">${s}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-top: 20px;">
          <strong>Test Results:</strong>
          ${Object.values(pass.tests).map(test => `
            <div class="test-item ${test.status} ${test.manual ? 'manual' : ''}">
              <strong>${test.name}</strong>
              ${test.manual ? '<span class="badge badge-manual">MANUAL</span>' : ''}
              <span style="float: right;">${test.duration}ms</span>
              ${test.error ? `<div class="error-box">❌ ${test.error}</div>` : ''}
            </div>
          `).join('')}
        </div>
        
        ${pass.errors.length > 0 ? `
          <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border-radius: 4px;">
            <strong>Errors:</strong>
            <ul style="margin: 5px 0;">
              ${pass.errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${pass.warnings.length > 0 ? `
          <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
            <strong>Warnings:</strong>
            <ul style="margin: 5px 0;">
              ${pass.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('')}
    
    ${report.overall.allScreens.length > 0 ? `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
        <h2>All Screens Visited</h2>
        <div class="screens-list">
          ${report.overall.allScreens.map(s => `<span class="screen-tag">${s}</span>`).join('')}
        </div>
      </div>
    ` : ''}
  </div>
</body>
</html>`;
    
    return {
      filename,
      html,
      report,
    };
  }
}

// Singleton instance
export const testReporter = new TestReporter();

