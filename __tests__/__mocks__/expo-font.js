module.exports = {
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  getAssetForDisplay: jest.fn(),
};
