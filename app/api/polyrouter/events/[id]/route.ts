import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { normalizePolyRouterEvents } from '@/utils/normalizers/polyrouter-normalizer';
import { marketCache } from '@/utils/api/cache';

console.log('[API Route] /api/polyrouter/events/[id] route module loaded');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeRaw = searchParams.get('include_raw') === 'true';
    const withNestedMarkets = searchParams.get('with_nested_markets') === 'true';
    
    console.log(`[API] /api/polyrouter/events/${id} - Request`);
    console.log(`[API] include_raw: ${includeRaw}, with_nested_markets: ${withNestedMarkets}`);
    
    // Проверяем in-memory кэш
    const cacheKey = `event:${id}:${includeRaw}:${withNestedMarkets}`;
    const cached = marketCache.get<any>(cacheKey);
    if (cached) {
      console.log('[API] Returning from in-memory cache');
      return NextResponse.json(cached);
    }

    // Получаем данные из PolyRouter
    console.log(`[API] Fetching event ${id} from PolyRouter...`);
    const eventsResponse = await polyRouterClient.getEventById(id, includeRaw, withNestedMarkets);
    
    if (!eventsResponse.events || eventsResponse.events.length === 0) {
      console.log('[API] Event not found');
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const rawEvent = eventsResponse.events[0];
    
    // Нормализуем данные (преобразуем Event в Market для совместимости)
    const normalizedMarkets = normalizePolyRouterEvents([rawEvent]);
    
    // Группируем по event_id (хотя будет только один)
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
      const platforms = new Set(markets.map(m => m.platform));
      const probabilities = markets.map(m => m.probability).filter(p => p !== undefined && p > 0) as number[];
      const minProbability = probabilities.length > 0 ? Math.min(...probabilities) : 0;
      const maxProbability = probabilities.length > 0 ? Math.max(...probabilities) : 0;
      const spread = maxProbability - minProbability;

      return {
        eventId,
        event: {
          id: eventId,
          normalizedTitle: markets[0].originalTitle,
          description: rawEvent.description,
          category: markets[0].category || 'Другое',
          tags: [],
          markets,
        },
        minProbability,
        maxProbability,
        spread,
        platformsCount: platforms.size,
      };
    });

    const response = {
      data: matches.length > 0 ? matches[0] : null,
      source: 'polyrouter',
      event: rawEvent,
      pagination: eventsResponse.pagination,
      meta: eventsResponse.meta,
    };
    
    // Сохраняем в кэш
    marketCache.set(cacheKey, response, 60000);
    
    console.log('[API] Event found in PolyRouter');
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error in /api/polyrouter/events/[id]:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch event', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
