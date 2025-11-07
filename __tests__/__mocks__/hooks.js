// Mock for hooks
export const useHomeScreenData = () => ({
  data: null,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  isRefetching: false,
});

export const useMonthlyTaskCount = () => ({
  monthlyTaskCount: 0,
});

export const useCompleteTask = () => ({
  mutateAsync: jest.fn(),
});

export const useDeleteTask = () => ({
  mutateAsync: jest.fn(),
});

export const useRestoreTask = () => ({
  mutateAsync: jest.fn(),
});

export const useStableCallback = callback => callback;
export const useExpensiveMemo = (fn, deps, options) => fn();
