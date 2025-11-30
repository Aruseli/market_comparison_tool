import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetGameByIdParams } from '@/types/polyrouter';
import { normalizePolyRouterGame } from '@/utils/normalizers/polyrouter-normalizer';
import { marketCache } from '@/utils/api/cache';

console.log('[API Route] /api/polyrouter/games/[id] route module loaded');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    console.log(`[API] /api/polyrouter/games/${id} - Request`);
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const queryParams: GetGameByIdParams = {
      platform: searchParams.get('platform') || undefined,
      market_type: (searchParams.get('market_type') as GetGameByIdParams['market_type']) || undefined,
    };

    console.log('[API] /api/polyrouter/games/[id] - Request params:', queryParams);

    // Проверяем кэш
    const cacheKey = `game:${id}:${JSON.stringify(queryParams)}`;
    const cached = marketCache.get<any>(cacheKey);
    if (cached) {
      console.log('[API] Returning from cache');
      return NextResponse.json(cached);
    }

    const response = await polyRouterClient.getGameById(id, queryParams);
    
    if (!response.games || response.games.length === 0) {
      console.log('[API] Game not found');
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const rawGame = response.games[0];
    
    // Нормализуем данные (преобразуем Game в массив Market)
    const normalizedMarkets = normalizePolyRouterGame(rawGame);
    console.log(`[API] Normalized to ${normalizedMarkets.length} markets from game`);

    // Группируем по gameId
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

      return {
        eventId: gameId,
        event: {
          id: gameId,
          normalizedTitle: rawGame.title,
          description: rawGame.description,
          category: markets[0]?.category || rawGame.league || 'Sports',
          tags: [],
          markets,
        },
        minProbability,
        maxProbability,
        spread,
        platformsCount: platforms.size,
        dataType: 'game' as const,
      };
    });

    const result = {
      data: matches.length > 0 ? matches[0] : null,
      source: 'polyrouter',
      game: rawGame,
      pagination: response.pagination,
      meta: response.meta,
    };

    // Сохраняем в кэш
    marketCache.set(cacheKey, result, 60000);
    
    console.log('[API] Game details retrieved and normalized successfully');
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error in /api/polyrouter/games/[id]:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch game details', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

