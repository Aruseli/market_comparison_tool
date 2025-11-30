import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { marketCache } from '@/utils/api/cache';

export async function GET(request: Request) {
  try {
    const cacheKey = 'platforms:list';
    
    // Проверяем кэш
    const cached = marketCache.get<any>(cacheKey);
    if (cached) {
      console.log('[API Platforms] Returning from cache');
      return NextResponse.json(cached);
    }

    // Получаем платформы из PolyRouter
    console.log('[API Platforms] Fetching platforms from PolyRouter...');
    const platformsResponse = await polyRouterClient.getPlatforms();
    
    // Извлекаем список платформ из markets.platforms
    const platforms = platformsResponse.markets?.platforms || [];
    
    const response = {
      data: platforms.map(p => ({
        platform: p.platform,
        displayName: p.display_name,
        endpoints: p.endpoints,
        features: p.features,
      })),
      source: 'polyrouter',
      total: platforms.length,
    };

    // Кэшируем на 5 минут
    marketCache.set(cacheKey, response, 300000);
    
    console.log(`[API Platforms] Returning ${platforms.length} platforms`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API Platforms] Error fetching platforms:', error);
    
    // Fallback на известные платформы
    const fallbackPlatforms = [
      {
        platform: 'polymarket',
        displayName: 'Polymarket',
        endpoints: { markets: true, events: true, series: true, search: true, price_history: true },
        features: { status_filtering: true, date_filtering: true, pagination_type: 'offset' },
      },
      {
        platform: 'manifold',
        displayName: 'Manifold Markets',
        endpoints: { markets: true, events: false, series: false, search: true, price_history: false },
        features: { status_filtering: true, date_filtering: false, pagination_type: 'offset' },
      },
      {
        platform: 'kalshi',
        displayName: 'Kalshi',
        endpoints: { markets: true, events: true, series: true, search: true, price_history: true },
        features: { status_filtering: true, date_filtering: true, pagination_type: 'cursor' },
      },
    ];

    return NextResponse.json({
      data: fallbackPlatforms,
      source: 'fallback',
      total: fallbackPlatforms.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

