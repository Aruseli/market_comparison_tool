import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { normalizePolyRouterMarkets } from '@/utils/normalizers/polyrouter-normalizer';
import { marketCache } from '@/utils/api/cache';
import type { GetMarketsParams } from '@/types/polyrouter';
import { getFreshMatches } from '@/lib/db/matches';

console.log('[API Route] /api/polyrouter/markets route module loaded');

export async function GET(request: Request) {
  const startTime = Date.now();
  
  console.log('[API] ========== /api/polyrouter/markets GET called ==========');
  console.log('[API] Request URL:', request.url);
  console.log('[API] Request method:', request.method);
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));
    
    // Ограничиваем limit до максимум 25 (требование PolyRouter API)
    // По умолчанию 5 для Markets согласно документации
    const requestedLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 5;
    const limit = Math.min(Math.max(1, requestedLimit), 25); // От 1 до 25
    
    const params: GetMarketsParams = {
      platform: searchParams.get('platform') as any,
      status: searchParams.get('status') ? (searchParams.get('status') as any) : undefined, // Опциональный - передаем только если указан
      limit,
      // Поддержка cursor-based пагинации (приоритет над offset)
      cursor: searchParams.get('cursor') || undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      search: searchParams.get('search') || undefined,
      include_raw: searchParams.get('include_raw') === 'true',
    };

    console.log('[API] /api/polyrouter/markets - Request params:', params);

    // Проверяем, есть ли параметр для очистки кэша (для отладки)
    const clearCache = searchParams.get('clearCache') === 'true';
    if (clearCache) {
      console.log('[API] Clearing cache as requested');
      marketCache.clear();
    }

    // Создаем ключ кэша
    const cacheKey = `markets:${JSON.stringify(params)}`;
    
    // Проверяем in-memory кэш (только если не запрошена очистка)
    if (!clearCache) {
      const cached = marketCache.get<any>(cacheKey);
      if (cached) {
        // Проверяем, что кэш не пустой
        const cachedData = Array.isArray(cached) ? cached : (cached.data || []);
        if (cachedData.length > 0) {
          console.log('[API] Returning from in-memory cache');
          // Если кэш содержит старый формат (без метаданных), оборачиваем
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
    // Только если нет параметра search (для поиска всегда запрашиваем свежие данные)
    if (!params.search && process.env.DATABASE_URL) {
      try {
        const dbMatches = await getFreshMatches(5);
        if (dbMatches.length > 0) {
          console.log(`[API] Returning ${dbMatches.length} matches from DB`);
          // Сохраняем в in-memory кэш
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

    // Получаем данные из PolyRouter - только Markets
    console.log('[API] Fetching Markets from PolyRouter...');
    console.log('[API] POLYROUTER_API_KEY present:', !!process.env.POLYROUTER_API_KEY);
    console.log('[API] POLYROUTER_API_KEY length:', process.env.POLYROUTER_API_KEY?.length || 0);
    console.log('[API] POLYROUTER_API_URL from env:', process.env.POLYROUTER_API_URL);
    console.log('[API] POLYROUTER_API_URL value:', process.env.POLYROUTER_API_URL || 'NOT SET - using default');
    
    let marketsResponse: any;
    let rawMarkets: any[] = [];
    
    // Загружаем Markets - PolyRouter сам агрегирует данные со всех платформ
    try {
      console.log('[API] Fetching Markets from PolyRouter (all platforms aggregated)...');
      marketsResponse = await polyRouterClient.getMarkets(params);
      rawMarkets = marketsResponse.markets || [];
      console.log(`[API] Received ${rawMarkets.length} markets from PolyRouter`);
    } catch (error) {
      console.error('[API] PolyRouter API error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch from PolyRouter', 
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'error',
          data: [],
        },
        { status: 500 }
      );
    }
    console.log(`[API] Received ${rawMarkets.length} markets from PolyRouter`);
    console.log(`[API] Response structure:`, {
      hasMarkets: !!marketsResponse.markets,
      marketsCount: rawMarkets.length,
      hasSports: !!(marketsResponse as any).sports,
      pagination: marketsResponse.pagination,
    });
    
    if (rawMarkets.length === 0) {
      console.warn('[API] WARNING: PolyRouter returned 0 markets! This might indicate an issue with the API request.');
    }
    
    // Логируем платформы из сырых данных
    const platformsCount = new Map<string, number>();
    rawMarkets.forEach(m => {
      platformsCount.set(m.platform, (platformsCount.get(m.platform) || 0) + 1);
    });
    console.log('[API] Markets by platform:', Object.fromEntries(platformsCount));
    
    // Нормализуем данные
    const normalizedMarkets = normalizePolyRouterMarkets(rawMarkets);
    console.log(`[API] Normalized to ${normalizedMarkets.length} markets (from ${rawMarkets.length} raw markets)`);
    
    if (normalizedMarkets.length === 0 && rawMarkets.length > 0) {
      console.warn('[API] WARNING: All markets were filtered out during normalization!');
      console.warn('[API] Sample raw market statuses:', rawMarkets.slice(0, 5).map(m => `${m.platform}: ${m.status}`));
    }
    
    // Логируем платформы после нормализации
    const normalizedPlatformsCount = new Map<string, number>();
    normalizedMarkets.forEach(m => {
      normalizedPlatformsCount.set(m.platform, (normalizedPlatformsCount.get(m.platform) || 0) + 1);
    });
    console.log('[API] Normalized markets by platform:', Object.fromEntries(normalizedPlatformsCount));
    
    // Логируем event_id из нормализованных рынков
    const eventIdsCount = new Map<string, number>();
    normalizedMarkets.forEach(m => {
      if (m.eventId) {
        eventIdsCount.set(m.eventId, (eventIdsCount.get(m.eventId) || 0) + 1);
      }
    });
    console.log('[API] Markets with event_id:', eventIdsCount.size, 'unique event_ids');
    if (eventIdsCount.size > 0) {
      console.log('[API] Event_ids distribution:', Array.from(eventIdsCount.entries()).slice(0, 10));
    }
    
    // Логируем первые несколько названий для диагностики
    if (normalizedMarkets.length > 0) {
      console.log('[API] Sample market titles:', normalizedMarkets.slice(0, 5).map(m => `${m.platform}: ${m.originalTitle.substring(0, 50)} (eventId: ${m.eventId || 'none'})`));
    }
    
    // Категории - это типы данных, а не поля в ответе
    // Markets, Events, Series - это разные эндпоинты
    const availableCategories = ['Markets', 'Events', 'Series'];
    console.log('[API] Available data type categories:', availableCategories);
    
    // Логируем категории из нормализованных рынков
    const categoriesFromMarkets = new Set<string>();
    normalizedMarkets.forEach(m => {
      if (m.category) {
        categoriesFromMarkets.add(m.category);
      }
    });
    console.log('[API] Categories found in normalized markets:', Array.from(categoriesFromMarkets).sort());
    
    // PolyRouter уже возвращает данные со множества платформ - просто возвращаем нормализованные markets
    // Группируем markets по event_id для удобства отображения
    const marketsByEventId = new Map<string, typeof normalizedMarkets>();
    normalizedMarkets.forEach(market => {
      const eventId = market.eventId || market.id; // Используем eventId или id как ключ
      if (!marketsByEventId.has(eventId)) {
        marketsByEventId.set(eventId, []);
      }
      marketsByEventId.get(eventId)!.push(market);
    });

    // Преобразуем в формат Match для совместимости с фронтендом
    const matches = Array.from(marketsByEventId.entries()).map(([eventId, markets]) => {
      const platforms = new Set(markets.map(m => m.platform));
      const probabilities = markets.map(m => m.probability).filter(p => p !== undefined && p > 0) as number[];
      const minProbability = probabilities.length > 0 ? Math.min(...probabilities) : 0;
      const maxProbability = probabilities.length > 0 ? Math.max(...probabilities) : 0;
      const spread = maxProbability - minProbability;

      // Используем ID первого market для детальных запросов (это platform_id)
      const detailId = markets[0]?.id || eventId;

      return {
        eventId,
        event: {
          id: detailId, // Используем ID market для детальных запросов
          normalizedTitle: markets[0].originalTitle,
          description: undefined,
          category: markets[0].category || 'Другое',
          tags: [],
          markets,
        },
        minProbability,
        maxProbability,
        spread,
        platformsCount: platforms.size,
        dataType: 'market' as const,
      };
    });

    console.log(`[API] Grouped ${normalizedMarkets.length} markets into ${matches.length} events`);
    
    // Сохраняем в in-memory кэш
    marketCache.set(cacheKey, matches, 60000);
    
    const duration = Date.now() - startTime;
    console.log(`[API] Request completed in ${duration}ms`);
    
    // Возвращаем с метаданными о источнике
    return NextResponse.json({
      data: matches,
      source: 'polyrouter',
      marketsCount: rawMarkets.length,
      matchesCount: matches.length,
      pagination: marketsResponse.pagination,
      meta: marketsResponse.meta,
    });
  } catch (error) {
    console.error('[API] Error in /api/polyrouter/markets:', error);
    
    // В dev режиме НЕ используем fallback на моки - показываем ошибку
    // Это позволяет видеть реальные проблемы с API
    return NextResponse.json(
      { 
        error: 'Failed to fetch markets from PolyRouter', 
        message: error instanceof Error ? error.message : 'Unknown error',
        source: 'error',
        data: [],
        // Fallback данные только для информации (не используем их)
        _fallbackAvailable: true,
      },
      { status: 500 }
    );
  }
}

