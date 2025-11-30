import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { normalizePolyRouterSeriesList, normalizePolyRouterSeries, normalizePolyRouterMarket } from '@/utils/normalizers/polyrouter-normalizer';
import { marketCache } from '@/utils/api/cache';
import type { GetSeriesParams } from '@/types/polyrouter';
import { getFreshMatches } from '@/lib/db/matches';

console.log('[API Route] /api/polyrouter/series route module loaded');

export async function GET(request: Request) {
  const startTime = Date.now();
  
  console.log('[API] ========== /api/polyrouter/series GET called ==========');
  console.log('[API] Request URL:', request.url);
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));
    
    // Ограничиваем limit до максимум 25 (требование PolyRouter API)
    // По умолчанию 10 для Series согласно документации
    const requestedLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const limit = Math.min(Math.max(1, requestedLimit), 25); // От 1 до 25
    
    const params: GetSeriesParams = {
      platform: searchParams.get('platform') as any,
      limit,
      cursor: searchParams.get('cursor') || undefined,
      // Series API не поддерживает offset, только cursor
      search: searchParams.get('search') || undefined,
      include_raw: searchParams.get('include_raw') === 'true',
    };

    console.log('[API] /api/polyrouter/series - Request params:', params);

    // Проверяем, есть ли параметр для очистки кэша
    const clearCache = searchParams.get('clearCache') === 'true';
    if (clearCache) {
      console.log('[API] Clearing cache as requested');
      marketCache.clear();
    }

    // Создаем ключ кэша
    const cacheKey = `series:${JSON.stringify(params)}`;
    
    // Проверяем in-memory кэш
    if (!clearCache) {
      const cached = marketCache.get<any>(cacheKey);
      if (cached) {
        const cachedData = Array.isArray(cached) ? cached : (cached.data || []);
        if (cachedData.length > 0) {
          console.log('[API] Returning from in-memory cache');
          if (Array.isArray(cached)) {
            return NextResponse.json({
              data: cached,
              source: 'cache',
            });
          }
          return NextResponse.json(cached);
        } else {
          console.log('[API] Cache contains empty data, ignoring cache');
          marketCache.delete(cacheKey);
        }
      }
    }

    // Проверяем БД на наличие свежих матчей (обновлены за последние 5 минут)
    if (!params.search && process.env.DATABASE_URL) {
      try {
        const dbMatches = await getFreshMatches(5);
        if (dbMatches.length > 0) {
          console.log(`[API] Returning ${dbMatches.length} matches from DB`);
          const response = {
            data: dbMatches,
            source: 'database',
          };
          marketCache.set(cacheKey, response, 60000);
          return NextResponse.json(response);
        }
      } catch (dbError) {
        console.warn('[API] DB check failed, continuing with PolyRouter:', dbError);
      }
    }

    // Получаем данные из PolyRouter
    console.log('[API] Fetching Series from PolyRouter...');
    let seriesResponse: any;
    let rawSeries: any[] = [];
    
    try {
      seriesResponse = await polyRouterClient.getSeries(params);
      rawSeries = seriesResponse.series || [];
      console.log(`[API] Received ${rawSeries.length} series from PolyRouter`);
    } catch (error) {
      console.error('[API] PolyRouter API error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch series from PolyRouter', 
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'error',
          data: [],
        },
        { status: 500 }
      );
    }
    
    if (rawSeries.length === 0) {
      console.warn('[API] WARNING: PolyRouter returned 0 series!');
    }
    
    // Нормализуем данные (преобразуем Series в Markets)
    // Если Series содержат nested markets, извлекаем их для расчета probability
    const normalizedMarkets: any[] = [];
    const nestedMarketsBySeriesId = new Map<string, any[]>();
    
    rawSeries.forEach(series => {
      // Если Series содержит nested markets, нормализуем их отдельно
      if (series.markets && Array.isArray(series.markets) && series.markets.length > 0) {
        const marketObjects = series.markets.filter(
          (m: any) => m && typeof m === 'object' && 'id' in m && 'status' in m
        );
        
        if (marketObjects.length > 0) {
          const normalizedNestedMarkets = marketObjects
            .filter((m: any) => m.status === 'open')
            .map((m: any) => normalizePolyRouterMarket(m));
          
          if (normalizedNestedMarkets.length > 0) {
            nestedMarketsBySeriesId.set(series.id, normalizedNestedMarkets);
            normalizedMarkets.push(...normalizedNestedMarkets);
          }
        }
      }
      
      // Также нормализуем сам Series
      normalizedMarkets.push(normalizePolyRouterSeries(series));
    });
    
    console.log(`[API] Normalized to ${normalizedMarkets.length} markets (from ${rawSeries.length} series)`);
    
    // Группируем markets по event_id (или series id)
    const marketsByEventId = new Map<string, typeof normalizedMarkets>();
    normalizedMarkets.forEach(market => {
      const eventId = market.eventId || market.id;
      if (!marketsByEventId.has(eventId)) {
        marketsByEventId.set(eventId, []);
      }
      marketsByEventId.get(eventId)!.push(market);
    });

    // Преобразуем в формат Match для совместимости с фронтендом
    const matches = Array.from(marketsByEventId.entries()).map(([eventId, markets]) => {
      // Если есть nested markets для этого series, используем их для расчета probability
      const nestedMarkets = nestedMarketsBySeriesId.get(eventId);
      const marketsForProbability = nestedMarkets && nestedMarkets.length > 0 ? nestedMarkets : markets;
      
      const platforms = new Set(marketsForProbability.map(m => m.platform));
      const probabilities = marketsForProbability.map(m => m.probability).filter(p => p !== undefined && p > 0) as number[];
      const minProbability = probabilities.length > 0 ? Math.min(...probabilities) : 0;
      const maxProbability = probabilities.length > 0 ? Math.max(...probabilities) : 0;
      const spread = maxProbability - minProbability;

      // Используем nested markets если они есть, иначе используем нормализованные markets
      const finalMarkets = nestedMarkets && nestedMarkets.length > 0 ? nestedMarkets : markets;

      const rawSeriesItem = rawSeries.find(s => s.id === eventId);
      // Используем platform_id для детальных запросов, если доступен
      const detailId = rawSeriesItem?.platform_id || eventId;

      return {
        eventId,
        event: {
          id: detailId, // Используем platform_id для детальных запросов
          normalizedTitle: markets[0].originalTitle,
          description: rawSeriesItem?.description,
          category: markets[0].category || 'Другое',
          tags: rawSeriesItem?.tags || [],
          markets: finalMarkets,
        },
        minProbability,
        maxProbability,
        spread,
        platformsCount: platforms.size,
        dataType: 'series' as const,
      };
    });

    console.log(`[API] Grouped ${normalizedMarkets.length} markets into ${matches.length} events`);
    
    // Сохраняем в in-memory кэш
    marketCache.set(cacheKey, matches, 60000);
    
    const duration = Date.now() - startTime;
    console.log(`[API] Request completed in ${duration}ms`);
    
    // Возвращаем с метаданными
    return NextResponse.json({
      data: matches,
      source: 'polyrouter',
      seriesCount: rawSeries.length,
      matchesCount: matches.length,
      pagination: seriesResponse.pagination,
      meta: seriesResponse.meta,
    });
  } catch (error) {
    console.error('[API] Error in /api/polyrouter/series:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch series from PolyRouter', 
        message: error instanceof Error ? error.message : 'Unknown error',
        source: 'error',
        data: [],
      },
      { status: 500 }
    );
  }
}

