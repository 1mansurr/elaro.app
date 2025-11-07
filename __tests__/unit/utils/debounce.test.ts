import { debounce } from '@/utils/debounce';

describe('debounce utility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should debounce function calls', () => {
    const fn = jest.fn();
    const { debounced } = debounce(fn, 500);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel debounced function', () => {
    const fn = jest.fn();
    const { debounced, cancel } = debounce(fn, 500);

    debounced();
    cancel();

    jest.advanceTimersByTime(500);

    expect(fn).not.toHaveBeenCalled();
  });

  it('should pass arguments to debounced function', () => {
    const fn = jest.fn();
    const { debounced } = debounce(fn, 500);

    debounced('arg1', 'arg2');
    jest.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should reset timer on new calls', () => {
    const fn = jest.fn();
    const { debounced } = debounce(fn, 500);

    debounced();
    jest.advanceTimersByTime(300);

    debounced(); // Should reset timer
    jest.advanceTimersByTime(300);

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple debounced functions independently', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();

    const { debounced: debounced1 } = debounce(fn1, 500);
    const { debounced: debounced2 } = debounce(fn2, 300);

    debounced1();
    debounced2();

    jest.advanceTimersByTime(300);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn1).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(fn1).toHaveBeenCalledTimes(1);
  });

  it('should handle cancel after function has been called', () => {
    const fn = jest.fn();
    const { debounced, cancel } = debounce(fn, 500);

    debounced();
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);

    // Cancel should not throw
    cancel();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle rapid cancel and re-call', () => {
    const fn = jest.fn();
    const { debounced, cancel } = debounce(fn, 500);

    debounced();
    cancel();
    debounced();
    jest.advanceTimersByTime(500);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
