describe('Simple Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle basic math', () => {
    expect(2 * 3).toBe(6);
  });

  it('should handle strings', () => {
    expect('hello').toContain('lo');
  });
});
