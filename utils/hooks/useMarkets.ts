import { useQuery, useQueries } from '@tanstack/react-query';
import { Match } from '@/types';

interface UseMarketsParams {
  category?: string; // Markets, Events, Series, или 'all' для всех
  search?: string;
  platform?: string;
}

interface MarketsResponse {
  data: Match[];
  source: 'polyrouter' | 'database' | 'cache' | 'mock' | 'error';
  marketsCount?: number;
  matchesCount?: number;
  categories?: string[]; // Категории из PolyRouter API
  error?: string;
}

async function fetchMarkets(params: UseMarketsParams): Promise<MarketsResponse> {
  // Если category === 'all', агрегируем данные из всех эндпоинтов
  if (params.category === 'all') {
    const queryParams = new URLSearchParams();
    if (params.platform) {
      queryParams.append('platform', params.platform);
    }
    if (params.search) {
      queryParams.append('search', params.search);
    }
    // Используем правильные значения по умолчанию для каждого эндпоинта
    // Markets: default 5, Events: default 10, Series: default 10, Games: default 10

    // Делаем параллельные запросы ко всем эндпоинтам
    const marketsParams = new URLSearchParams(queryParams);
    marketsParams.append('status', 'open');
    if (!marketsParams.has('limit')) {
      marketsParams.append('limit', '5'); // Markets default
    }
    
    const eventsParams = new URLSearchParams(queryParams);
    if (!eventsParams.has('limit')) {
      eventsParams.append('limit', '10'); // Events default
    }
    
    const seriesParams = new URLSearchParams(queryParams);
    if (!seriesParams.has('limit')) {
      seriesParams.append('limit', '10'); // Series default
    }
    
    // Для Games нужен параметр league, используем 'nfl' по умолчанию
    const gamesParams = new URLSearchParams();
    gamesParams.append('league', 'nfl'); // По умолчанию NFL
    if (params.search) {
      // Games не поддерживает search напрямую, но можем попробовать
    }
    
    const [marketsRes, eventsRes, seriesRes, gamesRes] = await Promise.allSettled([
      fetch(`/api/polyrouter/markets?${marketsParams.toString()}`),
      fetch(`/api/polyrouter/events?${eventsParams.toString()}`),
      fetch(`/api/polyrouter/series?${seriesParams.toString()}`),
      fetch(`/api/polyrouter/list-games?${gamesParams.toString()}`),
    ]);

    // Собираем данные из всех успешных запросов
    const allMatches: any[] = [];

    if (marketsRes.status === 'fulfilled' && marketsRes.value.ok) {
      const marketsData = await marketsRes.value.json();
      if (marketsData.data && Array.isArray(marketsData.data)) {
        allMatches.push(...marketsData.data);
      }
    }

    if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
      const eventsData = await eventsRes.value.json();
      if (eventsData.data && Array.isArray(eventsData.data)) {
        allMatches.push(...eventsData.data);
      }
    }

    if (seriesRes.status === 'fulfilled' && seriesRes.value.ok) {
      const seriesData = await seriesRes.value.json();
      if (seriesData.data && Array.isArray(seriesData.data)) {
        allMatches.push(...seriesData.data);
      }
    }

    if (gamesRes.status === 'fulfilled' && gamesRes.value.ok) {
      const gamesData = await gamesRes.value.json();
      if (gamesData.data && Array.isArray(gamesData.data)) {
        allMatches.push(...gamesData.data);
      }
    }

    return {
      data: allMatches,
      source: 'polyrouter',
      matchesCount: allMatches.length,
    };
  }

  // Для конкретной категории вызываем соответствующий эндпоинт
  const queryParams = new URLSearchParams();
  
  if (params.platform) {
    queryParams.append('platform', params.platform);
  }
  if (params.search) {
    queryParams.append('search', params.search);
  }

  let endpoint = '/api/polyrouter/markets';
  if (params.category === 'Events') {
    endpoint = '/api/polyrouter/events';
    // Events default limit: 10
    if (!queryParams.has('limit')) {
      queryParams.append('limit', '10');
    }
  } else if (params.category === 'Series') {
    endpoint = '/api/polyrouter/series';
    // Series default limit: 10
    if (!queryParams.has('limit')) {
      queryParams.append('limit', '10');
    }
  } else if (params.category === 'Games') {
    endpoint = '/api/polyrouter/list-games';
    // Games требует league параметр, используем 'nfl' по умолчанию
    if (!queryParams.has('league')) {
      queryParams.append('league', 'nfl');
    }
    // Games не поддерживает search напрямую, но можем попробовать
    if (queryParams.has('search')) {
      queryParams.delete('search');
    }
  } else {
    // Для Markets добавляем status и default limit: 5
    queryParams.append('status', 'open');
    if (!queryParams.has('limit')) {
      queryParams.append('limit', '5');
    }
  }

  const response = await fetch(`${endpoint}?${queryParams.toString()}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch data');
  }

  const result = await response.json();
  
  // Поддержка старого формата (просто массив) для обратной совместимости
  if (Array.isArray(result)) {
    return {
      data: result,
      source: 'polyrouter',
    };
  }
  
  // Если result.data - это массив матчей, возвращаем как есть
  if (result.data && Array.isArray(result.data)) {
    return result;
  }
  
  return result;
}

// Функции для получения данных из отдельных эндпоинтов
async function fetchMarketsData(params: UseMarketsParams): Promise<Match[]> {
  const queryParams = new URLSearchParams();
  if (params.platform) {
    queryParams.append('platform', params.platform);
  }
  if (params.search) {
    queryParams.append('search', params.search);
  }
  queryParams.append('status', 'open');
  if (!queryParams.has('limit')) {
    queryParams.append('limit', '5');
  }
  
  const response = await fetch(`/api/polyrouter/markets?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch markets');
  }
  const data = await response.json();
  return Array.isArray(data.data) ? data.data : [];
}

async function fetchEventsData(params: UseMarketsParams): Promise<Match[]> {
  const queryParams = new URLSearchParams();
  if (params.platform) {
    queryParams.append('platform', params.platform);
  }
  if (params.search) {
    queryParams.append('search', params.search);
  }
  if (!queryParams.has('limit')) {
    queryParams.append('limit', '10');
  }
  
  const response = await fetch(`/api/polyrouter/events?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }
  const data = await response.json();
  return Array.isArray(data.data) ? data.data : [];
}

async function fetchSeriesData(params: UseMarketsParams): Promise<Match[]> {
  const queryParams = new URLSearchParams();
  if (params.platform) {
    queryParams.append('platform', params.platform);
  }
  if (params.search) {
    queryParams.append('search', params.search);
  }
  if (!queryParams.has('limit')) {
    queryParams.append('limit', '10');
  }
  
  const response = await fetch(`/api/polyrouter/series?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch series');
  }
  const data = await response.json();
  return Array.isArray(data.data) ? data.data : [];
}

async function fetchGamesData(params: UseMarketsParams): Promise<Match[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('league', 'nfl'); // По умолчанию NFL
  // Games не поддерживает search напрямую
  
  const response = await fetch(`/api/polyrouter/list-games?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch games');
  }
  const data = await response.json();
  return Array.isArray(data.data) ? data.data : [];
}

export function useMarkets(params: UseMarketsParams = {}) {
  // ВСЕГДА вызываем useQueries для обеспечения одинакового порядка хуков
  // Это исправляет проблему с изменением порядка хуков при переключении категорий
  const queries = useQueries({
    queries: [
      {
        queryKey: ['markets', params],
        queryFn: () => fetchMarketsData(params),
        staleTime: 300000,
        gcTime: 600000,
        enabled: params.category === 'all' || params.category === 'Markets' || !params.category,
      },
      {
        queryKey: ['events', params],
        queryFn: () => fetchEventsData(params),
        staleTime: 300000,
        gcTime: 600000,
        enabled: params.category === 'all' || params.category === 'Events',
      },
      {
        queryKey: ['series', params],
        queryFn: () => fetchSeriesData(params),
        staleTime: 300000,
        gcTime: 600000,
        enabled: params.category === 'all' || params.category === 'Series',
      },
      {
        queryKey: ['games', params],
        queryFn: () => fetchGamesData(params),
        staleTime: 300000,
        gcTime: 600000,
        enabled: params.category === 'all' || params.category === 'Games',
      },
    ],
  });

  // Если category === 'all', объединяем все данные
  if (params.category === 'all') {
    const allData = queries.flatMap(q => q.data || []);
    const isLoading = queries.some(q => q.isLoading);
    const error = queries.find(q => q.error)?.error;

    return {
      data: {
        data: allData,
        source: 'polyrouter' as const,
        matchesCount: allData.length,
      },
      isLoading,
      error,
      isError: !!error,
    };
  }

  // Для конкретной категории используем соответствующий запрос
  let activeQuery;
  if (params.category === 'Events') {
    activeQuery = queries[1]; // events
  } else if (params.category === 'Series') {
    activeQuery = queries[2]; // series
  } else if (params.category === 'Games') {
    activeQuery = queries[3]; // games
  } else {
    activeQuery = queries[0]; // markets (по умолчанию)
  }

  // Преобразуем данные в формат MarketsResponse
  const data = activeQuery.data || [];
  const response: MarketsResponse = {
    data: Array.isArray(data) ? data : [],
    source: 'polyrouter',
    matchesCount: Array.isArray(data) ? data.length : 0,
  };

  return {
    data: response,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    isError: !!activeQuery.error,
  };
}

