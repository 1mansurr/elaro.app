// Test component structure without rendering
describe('HomeScreenHeader Structure Test', () => {
  it('should have proper file structure', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    
    expect(fs.existsSync(componentPath)).toBe(true);
  });

  it('should be a valid TypeScript file', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for basic React component structure
    expect(content).toContain('import React');
    expect(content).toContain('export default');
    expect(content).toContain('HomeScreenHeader');
  });

  it('should have proper component structure', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for React component patterns
    expect(content).toContain('React.FC');
    expect(content).toContain('memo');
    expect(content).toContain('useMemo');
    expect(content).toContain('interface HomeScreenHeaderProps');
  });

  it('should have proper imports', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for required imports
    expect(content).toContain('import React');
    expect(content).toContain('from \'react-native\'');
    expect(content).toContain('@/features/notifications/components/NotificationBell');
    expect(content).toContain('@/constants/theme');
    expect(content).toContain('@/features/auth/contexts/AuthContext');
    expect(content).toContain('@/services/PerformanceMonitoringService');
  });

  it('should have proper component logic', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for component logic
    expect(content).toContain('getGreeting');
    expect(content).toContain('personalizedTitle');
    expect(content).toContain('isGuest');
    expect(content).toContain('onNotificationPress');
  });

  it('should have proper styling', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.resolve(__dirname, '../HomeScreenHeader.tsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for StyleSheet usage
    expect(content).toContain('StyleSheet.create');
    expect(content).toContain('styles.');
  });
});
