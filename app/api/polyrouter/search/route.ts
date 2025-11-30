import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { normalizePolyRouterMarkets } from '@/utils/normalizers/polyrouter-normalizer';
import { findMatches } from '@/utils/matching/matcher';
import { marketCache } from '@/utils/api/cache';
import { getMatches } from '@/utils/events';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Создаем ключ кэша
    const cacheKey = `search:${query}`;
    
    // Проверяем кэш
    const cached = marketCache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Получаем данные из PolyRouter
    const rawMarkets = await polyRouterClient.searchMarkets(query, 100);
    console.log(`[API Search] Received ${rawMarkets.length} markets from PolyRouter`);
    
    // Нормализуем данные
    const normalizedMarkets = normalizePolyRouterMarkets(rawMarkets);
    console.log(`[API Search] Normalized to ${normalizedMarkets.length} markets`);
    
    // Находим матчи (события)
    const matches = findMatches(normalizedMarkets);
    console.log(`[API Search] Found ${matches.length} matches`);
    
    // Сохраняем в кэш
    const response = {
      data: matches,
      source: 'polyrouter',
      marketsCount: rawMarkets.length,
      matchesCount: matches.length,
    };
    marketCache.set(cacheKey, response, 60000); // 60 секунд
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/polyrouter/search:', error);
    
    // Fallback на моковые данные при ошибке
    try {
      const query = new URL(request.url).searchParams.get('q') || new URL(request.url).searchParams.get('query') || '';
      if (query && query.length >= 2) {
        const fallbackMatches = getMatches(undefined, query);
        console.log(`[API Search] Fallback to ${fallbackMatches.length} mock matches`);
        return NextResponse.json({
          data: fallbackMatches,
          source: 'mock',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (fallbackError) {
      console.error('Error in fallback to mock data:', fallbackError);
    }
    
    return NextResponse.json(
      { error: 'Failed to search markets', message: error instanceof Error ? error.message : 'Unknown error', source: 'error' },
      { status: 500 }
    );
  }
}

