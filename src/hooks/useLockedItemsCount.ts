type ItemType = 'courses' | 'assignments' | 'lectures' | 'study_sessions';

export const useLockedItemsCount = (_itemType: ItemType) => {
  return {
    data: { totalCount: 0, lockedCount: 0 },
    isLoading: false,
    isError: false,
    error: null,
  };
};
