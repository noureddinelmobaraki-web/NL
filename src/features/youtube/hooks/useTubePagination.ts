import { useCallback, useEffect, useState } from 'react';

export function useTubePagination<T>(items: T[], pageSize: number) {
  const [shown, setShown] = useState(pageSize);

  useEffect(() => { setShown(pageSize); }, [items, pageSize]);

  const visible = items.slice(0, shown);
  const canShowMore = shown < items.length;
  const showMore = useCallback(() => setShown((n) => n + pageSize), [pageSize]);

  return { visible, canShowMore, showMore };
}
