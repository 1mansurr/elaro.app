describe('ELARO App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show welcome message', async () => {
    await expect(element(by.id('welcomeMessage'))).toBeVisible();
  });
});
