import { useQuery } from '@tanstack/react-query';
import { Market, Event } from '@/types';

type DataType = 'market' | 'event' | 'series' | 'game' | 'award' | 'future';

async function fetchDetail(id: string, type: DataType): Promise<any> {
  let endpoint = '';
  switch (type) {
    case 'market':
      endpoint = `/api/polyrouter/markets/${id}`;
      break;
    case 'event':
      endpoint = `/api/polyrouter/events/${id}?with_nested_markets=true`;
      break;
    case 'series':
      endpoint = `/api/polyrouter/series/${id}`;
      break;
    case 'game':
      endpoint = `/api/polyrouter/games/${id}`;
      break;
    case 'award':
      endpoint = `/api/polyrouter/awards/${id}`;
      break;
    case 'future':
      endpoint = `/api/polyrouter/futures/${id}`;
      break;
    default:
      throw new Error(`Unknown data type: ${type}`);
  }
  
  const response = await fetch(endpoint);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${type}`);
  }

  return response.json();
}

export function useMarket(id: string) {
  return useQuery({
    queryKey: ['market', id],
    queryFn: () => fetchDetail(id, 'market'),
    enabled: !!id,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false,
  });
}

// Универсальный хук для получения деталей любого типа
export function useDetail(id: string, type: DataType) {
  return useQuery({
    queryKey: [type, id],
    queryFn: () => fetchDetail(id, type),
    enabled: !!id,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false,
  });
}

// Hook для получения события (для обратной совместимости)
export function useEvent(id: string, initialEvent?: Event) {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchDetail(id, 'event'),
    enabled: !!id,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false,
  });

  // Преобразуем данные из API в формат Event
  const apiMatch = response?.data;
  const apiEvent = apiMatch?.event;

  if (!apiEvent && !initialEvent) {
    return {
      event: undefined,
      isLoading,
      error,
      dataSource: 'mock' as const,
    };
  }

  const event: Event = apiEvent || initialEvent!;

  return {
    event,
    isLoading,
    error,
    dataSource: (apiEvent && !error) ? 'real' : 'mock' as 'real' | 'mock',
  };
}

