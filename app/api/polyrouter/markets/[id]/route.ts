import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { normalizePolyRouterMarket } from '@/utils/normalizers/polyrouter-normalizer';
import { marketCache } from '@/utils/api/cache';
import { getEventById } from '@/utils/events';
import { getMarketById } from '@/lib/db/markets';
import { getEventById as getDbEventById } from '@/lib/db/events';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeRaw = searchParams.get('include_raw') === 'true';
    
    console.log(`[API] /api/polyrouter/markets/${id} - Request`);
    
    // Проверяем in-memory кэш
    const cacheKey = `market:${id}:${includeRaw}`;
    const cached = marketCache.get<any>(cacheKey);
    if (cached) {
      console.log('[API] Returning from in-memory cache');
      return NextResponse.json(cached);
    }

    // Проверяем БД (если доступна)
    if (process.env.DATABASE_URL) {
      try {
        const dbMarket = await getMarketById(id);
        if (dbMarket) {
          console.log('[API] Returning from DB');
          marketCache.set(cacheKey, dbMarket, 30000);
          return NextResponse.json(dbMarket);
        }
      } catch (dbError) {
        console.warn('[API] DB check failed:', dbError);
      }
    }

    // Получаем данные из PolyRouter
    console.log(`[API] Fetching market ${id} from PolyRouter...`);
    const rawMarket = await polyRouterClient.getMarketById(id, includeRaw);
    
    if (rawMarket) {
      // Нормализуем данные
      const normalizedMarket = normalizePolyRouterMarket(rawMarket);
      
      // Сохраняем в кэш
      marketCache.set(cacheKey, normalizedMarket, 30000); // 30 секунд
      
      console.log('[API] Market found in PolyRouter');
      return NextResponse.json(normalizedMarket);
    }

    // Если не найден в PolyRouter, пробуем найти в БД события
    if (process.env.DATABASE_URL) {
      try {
        const dbEvent = await getDbEventById(id);
        if (dbEvent && dbEvent.markets.length > 0) {
          console.log('[API] Event found in DB, returning first market');
          return NextResponse.json(dbEvent.markets[0]);
        }
      } catch (dbError) {
        console.warn('[API] DB event check failed:', dbError);
      }
    }

    // Если не найден в PolyRouter, пробуем найти в моковых данных
    const mockEvent = getEventById(id);
    if (mockEvent && mockEvent.markets.length > 0) {
      console.log('[API] Event found in mock data');
      // Возвращаем первый рынок из события
      const mockMarket = mockEvent.markets[0];
      return NextResponse.json(mockMarket);
    }

    // Если не найдено нигде
    console.log('[API] Market not found');
    return NextResponse.json(
      { error: 'Market not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error(`Error in /api.polyrouter.io/functions/v1/markets-v2/[id]:`, error);
    
    // Fallback на моковые данные при ошибке
    try {
      const { id } = await params;
      const mockEvent = getEventById(id);
      if (mockEvent && mockEvent.markets.length > 0) {
        const mockMarket = mockEvent.markets[0];
        return NextResponse.json(mockMarket);
      }
    } catch (fallbackError) {
      console.error('Error in fallback to mock data:', fallbackError);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch market', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

