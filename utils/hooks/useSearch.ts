import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Match } from '@/types';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

async function searchMarkets(query: string): Promise<Match[]> {
  // Используем наш API route вместо прямого обращения к PolyRouter
  const response = await fetch(`/api/polyrouter/search?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    throw new Error('Failed to search markets');
  }

  const result = await response.json();
  // Возвращаем data из ответа, если есть
  return result.data || result;
}

export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 500);
  
  return useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchMarkets(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
    retry: 3,
  });
}

