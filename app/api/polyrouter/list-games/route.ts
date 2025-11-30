import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetGamesListParams } from '@/types/polyrouter';
import { normalizePolyRouterGames } from '@/utils/normalizers/polyrouter-normalizer';
import { marketCache } from '@/utils/api/cache';

console.log('[API Route] /api/polyrouter/list-games route module loaded');

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] /api/polyrouter/list-games - Request');
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const league = searchParams.get('league') as GetGamesListParams['league'];
    if (!league) {
      return NextResponse.json(
        { error: 'league parameter is required (nfl, nba, nhl, mlb)' },
        { status: 400 }
      );
    }

    const params: GetGamesListParams = {
      league,
      status: (searchParams.get('status') as GetGamesListParams['status']) || undefined,
    };

    console.log('[API] /api/polyrouter/list-games - Request params:', params);

    // Проверяем кэш
    const cacheKey = `games:${JSON.stringify(params)}`;
    const cached = marketCache.get<any>(cacheKey);
    if (cached) {
      console.log('[API] Returning from cache');
      return NextResponse.json(cached);
    }

    const response = await polyRouterClient.getGamesList(params);
    
    if (!response.games || response.games.length === 0) {
      console.warn('[API] WARNING: PolyRouter returned 0 games!');
      return NextResponse.json({
        data: [],
        source: 'polyrouter',
        gamesCount: 0,
        matchesCount: 0,
        pagination: response.pagination,
        meta: response.meta,
      });
    }

    // Нормализуем данные (преобразуем Games в Markets)
    const normalizedMarkets = normalizePolyRouterGames(response.games);
    console.log(`[API] Normalized to ${normalizedMarkets.length} markets (from ${response.games.length} games)`);
    
    // Группируем markets по game_id
    const marketsByGameId = new Map<string, typeof normalizedMarkets>();
    normalizedMarkets.forEach(market => {
      const gameId = market.eventId || market.id;
      if (!marketsByGameId.has(gameId)) {
        marketsByGameId.set(gameId, []);
      }
      marketsByGameId.get(gameId)!.push(market);
    });

    // Преобразуем в формат Match для совместимости с фронтендом
    const matches = Array.from(marketsByGameId.entries()).map(([gameId, markets]) => {
      const platforms = new Set(markets.map(m => m.platform));
      const probabilities = markets.map(m => m.probability).filter(p => p !== undefined && p > 0) as number[];
      const minProbability = probabilities.length > 0 ? Math.min(...probabilities) : 0;
      const maxProbability = probabilities.length > 0 ? Math.max(...probabilities) : 0;
      const spread = maxProbability - minProbability;

      const rawGame = response.games.find(g => (g.polyrouter_id || g.id) === gameId);

      return {
        eventId: gameId,
        event: {
          id: gameId,
          normalizedTitle: markets[0].originalTitle,
          description: rawGame?.description,
          category: markets[0].category || 'Sports',
          tags: [],
          markets,
        },
        minProbability,
        maxProbability,
        spread,
        platformsCount: platforms.size,
        dataType: 'game' as const, // Добавляем тип для определения в EventCard
      };
    });

    console.log(`[API] Grouped ${normalizedMarkets.length} markets into ${matches.length} games`);
    
    // Сохраняем в кэш
    const result = {
      data: matches,
      source: 'polyrouter',
      gamesCount: response.games.length,
      matchesCount: matches.length,
      pagination: response.pagination,
      meta: response.meta,
    };
    
    marketCache.set(cacheKey, result, 60000);
    
    const duration = Date.now() - startTime;
    console.log(`[API] Request completed in ${duration}ms`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/polyrouter/list-games:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch games list', 
        message: error instanceof Error ? error.message : 'Unknown error',
        source: 'error',
        data: [],
      },
      { status: 500 }
    );
  }
}

