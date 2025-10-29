// Basic HomeScreen integration test
describe('HomeScreen Basic Integration', () => {
  it('should have proper component structure', () => {
    const fs = require('fs');
    const path = require('path');
    
    // Check main HomeScreen file
    const homeScreenPath = path.resolve(__dirname, '../../../screens/HomeScreen.tsx');
    expect(fs.existsSync(homeScreenPath)).toBe(true);
    
    // Check component files
    const headerPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    const contentPath = path.resolve(__dirname, '../HomeScreenContent.tsx');
    const fabPath = path.resolve(__dirname, '../HomeScreenFAB.tsx');
    const modalsPath = path.resolve(__dirname, '../HomeScreenModals.tsx');
    const hooksPath = path.resolve(__dirname, '../HomeScreenHooks.tsx');
    const indexPath = path.resolve(__dirname, '../index.ts');
    
    expect(fs.existsSync(headerPath)).toBe(true);
    expect(fs.existsSync(contentPath)).toBe(true);
    expect(fs.existsSync(fabPath)).toBe(true);
    expect(fs.existsSync(modalsPath)).toBe(true);
    expect(fs.existsSync(hooksPath)).toBe(true);
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it('should have proper exports in index file', () => {
    const fs = require('fs');
    const path = require('path');
    const indexPath = path.resolve(__dirname, '../index.ts');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for required exports
    expect(content).toContain('export { default as HomeScreenHeader }');
    expect(content).toContain('export { default as HomeScreenContent }');
    expect(content).toContain('export { default as HomeScreenFAB }');
    expect(content).toContain('export { default as HomeScreenModals }');
    expect(content).toContain('export * from \'./HomeScreenHooks\'');
  });

  it('should have proper TypeScript structure', () => {
    const fs = require('fs');
    const path = require('path');
    
    // Check HomeScreenHeader
    const headerPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    
    expect(headerContent).toContain('import React');
    expect(headerContent).toContain('interface HomeScreenHeaderProps');
    expect(headerContent).toContain('export default HomeScreenHeader');
    expect(headerContent).toContain('memo');
    expect(headerContent).toContain('useMemo');
    
    // Check HomeScreenContent
    const contentPath = path.resolve(__dirname, '../HomeScreenContent.tsx');
    const contentContent = fs.readFileSync(contentPath, 'utf8');
    
    expect(contentContent).toContain('import React');
    expect(contentContent).toContain('interface HomeScreenContentProps');
    expect(contentContent).toContain('export default HomeScreenContent');
    expect(contentContent).toContain('memo');
    
    // Check HomeScreenFAB
    const fabPath = path.resolve(__dirname, '../HomeScreenFAB.tsx');
    const fabContent = fs.readFileSync(fabPath, 'utf8');
    
    expect(fabContent).toContain('import React');
    expect(fabContent).toContain('interface HomeScreenFABProps');
    expect(fabContent).toContain('export default HomeScreenFAB');
    expect(fabContent).toContain('memo');
    
    // Check HomeScreenModals
    const modalsPath = path.resolve(__dirname, '../HomeScreenModals.tsx');
    const modalsContent = fs.readFileSync(modalsPath, 'utf8');
    
    expect(modalsContent).toContain('import React');
    expect(modalsContent).toContain('interface HomeScreenModalsProps');
    expect(modalsContent).toContain('export default HomeScreenModals');
    expect(modalsContent).toContain('memo');
  });

  it('should have performance optimizations', () => {
    const fs = require('fs');
    const path = require('path');
    
    // Check for performance monitoring
    const headerPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    
    expect(headerContent).toContain('performanceMonitoringService');
    expect(headerContent).toContain('useExpensiveMemo');
    expect(headerContent).toContain('useStableCallback');
    
    // Check for memoization
    const contentPath = path.resolve(__dirname, '../HomeScreenContent.tsx');
    const contentContent = fs.readFileSync(contentPath, 'utf8');
    
    expect(contentContent).toContain('memo');
    expect(contentContent).toContain('useCallback');
    expect(contentContent).toContain('useMemo');
  });

  it('should have proper test files', () => {
    const fs = require('fs');
    const path = require('path');
    
    // Check for test files
    const testDir = path.resolve(__dirname);
    const files = fs.readdirSync(testDir);
    
    expect(files).toContain('HomeScreen.basic.test.js');
    expect(files).toContain('component-structure.simple.test.js');
    expect(files).toContain('HomeScreenHeader.structure.test.js');
  });
});
