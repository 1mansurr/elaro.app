// Simple debounce utility function with cleanup
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): { debounced: (...args: Parameters<T>) => void; cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };

  const cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return { debounced, cancel };
}
