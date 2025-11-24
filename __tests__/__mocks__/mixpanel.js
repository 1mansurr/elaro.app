module.exports = {
  mixpanelService: {
    init: jest.fn(),
    track: jest.fn(),
    identify: jest.fn(),
    set: jest.fn(),
    reset: jest.fn(),
  },
};
