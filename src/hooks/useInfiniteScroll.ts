import { useState, useEffect, useCallback } from 'react';

export const useInfiniteScroll = <T>(
  fetchData: (offset: number, limit: number) => Promise<T[]>,
  limit: number = 50
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const newData = await fetchData(offset, limit);
      if (newData.length < limit) {
        setHasMore(false);
      }
      setData(prev => [...prev, ...newData]);
      setOffset(prev => prev + limit);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchData, offset, limit, loading, hasMore]);

  const reset = useCallback(() => {
    setData([]);
    setOffset(0);
    setHasMore(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMore();
  }, []);

  return { data, loading, hasMore, loadMore, reset };
};