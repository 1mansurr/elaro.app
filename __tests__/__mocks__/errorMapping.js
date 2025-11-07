module.exports = {
  mapErrorCodeToMessage: jest.fn(error => error.message || 'An error occurred'),
  getErrorTitle: jest.fn(error => 'Error'),
};
