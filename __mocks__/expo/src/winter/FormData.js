// Mock for expo/src/winter/FormData
// jest-expo tries to mock this module but it may not exist
module.exports = class FormData {
  append() {}
  delete() {}
  get() {}
  getAll() {}
  has() {}
  set() {}
  entries() {}
  keys() {}
  values() {}
};
