import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { normalizePolyRouterEvents, normalizePolyRouterEvent, normalizePolyRouterMarket } from '@/utils/normalizers/polyrouter-normalizer';
import { marketCache } from '@/utils/api/cache';
import type { GetEventsParams } from '@/types/polyrouter';
import { getFreshMatches } from '@/lib/db/matches';

console.log('[API Route] /api/polyrouter/events route module loaded');

export async function GET(request: Request) {
  const startTime = Date.now();
  
  console.log('[API] ========== /api/polyrouter/events GET called ==========');
  console.log('[API] Request URL:', request.url);
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));
    
    // Ограничиваем limit до максимум 25 (требование PolyRouter API)
    // По умолчанию 10 для Events согласно документации
    const requestedLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const limit = Math.min(Math.max(1, requestedLimit), 25); // От 1 до 25
    
    const params: GetEventsParams = {
      platform: searchParams.get('platform') as any,
      limit,
      cursor: searchParams.get('cursor') || undefined,
      // Events API не поддерживает offset, только cursor
      search: searchParams.get('search') || undefined,
      include_raw: searchParams.get('include_raw') === 'true',
      // Используем with_nested_markets по умолчанию для получения probability
      with_nested_markets: searchParams.get('with_nested_markets') !== 'false', // По умолчанию true
    };

    console.log('[API] /api/polyrouter/events - Request params:', params);

    // Проверяем, есть ли параметр для очистки кэша
    const clearCache = searchParams.get('clearCache') === 'true';
    if (clearCache) {
      console.log('[API] Clearing cache as requested');
      marketCache.clear();
    }

    // Создаем ключ кэша
    const cacheKey = `events:${JSON.stringify(params)}`;
    
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
    console.log('[API] Fetching Events from PolyRouter...');
    let eventsResponse: any;
    let rawEvents: any[] = [];
    
    try {
      eventsResponse = await polyRouterClient.getEvents(params);
      rawEvents = eventsResponse.events || [];
      console.log(`[API] Received ${rawEvents.length} events from PolyRouter`);
    } catch (error) {
      console.error('[API] PolyRouter API error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch events from PolyRouter', 
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'error',
          data: [],
        },
        { status: 500 }
      );
    }
    
    if (rawEvents.length === 0) {
      console.warn('[API] WARNING: PolyRouter returned 0 events!');
    }
    
    // Нормализуем данные (преобразуем Events в Markets)
    // Если Events содержат nested markets, извлекаем их для расчета probability
    const normalizedMarkets: any[] = [];
    const nestedMarketsByEventId = new Map<string, any[]>();
    
    rawEvents.forEach(event => {
      // Если Event содержит nested markets, нормализуем их отдельно
      if (event.markets && Array.isArray(event.markets) && event.markets.length > 0) {
        const normalizedNestedMarkets = event.markets
          .filter((m: any) => m.status === 'open')
          .map((m: any) => normalizePolyRouterMarket(m));
        
        if (normalizedNestedMarkets.length > 0) {
          nestedMarketsByEventId.set(event.id, normalizedNestedMarkets);
          normalizedMarkets.push(...normalizedNestedMarkets);
        } else {
          // Если nested markets пустые или все закрыты, нормализуем сам Event
          normalizedMarkets.push(normalizePolyRouterEvent(event));
        }
      } else {
        // Если нет nested markets, нормализуем сам Event
        normalizedMarkets.push(normalizePolyRouterEvent(event));
      }
    });
    
    console.log(`[API] Normalized to ${normalizedMarkets.length} markets (from ${rawEvents.length} events)`);
    
    // Группируем markets по event_id
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
      // Если есть nested markets для этого event, используем их для расчета probability
      const nestedMarkets = nestedMarketsByEventId.get(eventId);
      const marketsForProbability = nestedMarkets && nestedMarkets.length > 0 ? nestedMarkets : markets;
      
      const platforms = new Set(marketsForProbability.map(m => m.platform));
      const probabilities = marketsForProbability.map(m => m.probability).filter(p => p !== undefined && p > 0) as number[];
      const minProbability = probabilities.length > 0 ? Math.min(...probabilities) : 0;
      const maxProbability = probabilities.length > 0 ? Math.max(...probabilities) : 0;
      const spread = maxProbability - minProbability;

      // Используем nested markets если они есть, иначе используем нормализованные markets
      const finalMarkets = nestedMarkets && nestedMarkets.length > 0 ? nestedMarkets : markets;

      const rawEvent = rawEvents.find(e => e.id === eventId);
      // Используем platform_id для детальных запросов, если доступен
      const detailId = rawEvent?.platform_id || eventId;

      return {
        eventId,
        event: {
          id: detailId, // Используем platform_id для детальных запросов
          normalizedTitle: markets[0].originalTitle,
          description: rawEvent?.description,
          category: markets[0].category || 'Другое',
          tags: [],
          markets: finalMarkets,
        },
        minProbability,
        maxProbability,
        spread,
        platformsCount: platforms.size,
        dataType: 'event' as const,
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
      eventsCount: rawEvents.length,
      matchesCount: matches.length,
      pagination: eventsResponse.pagination,
      meta: eventsResponse.meta,
    });
  } catch (error) {
    console.error('[API] Error in /api/polyrouter/events:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch events from PolyRouter', 
        message: error instanceof Error ? error.message : 'Unknown error',
        source: 'error',
        data: [],
      },
      { status: 500 }
    );
  }
}

