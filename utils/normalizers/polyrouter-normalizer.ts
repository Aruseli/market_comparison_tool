import { PolyRouterMarket, PolyRouterEvent, PolyRouterSeries, PolyRouterGame } from '@/types/polyrouter';
import { Market, Platform } from '@/types';

/**
 * Нормализует данные PolyRouter в единый формат Market
 */
export function normalizePolyRouterMarket(
  raw: PolyRouterMarket
): Market {
  // Преобразуем платформу в наш формат
  const platformMap: Record<string, Platform> = {
    polymarket: 'polymarket',
    manifold: 'manifold',
    kalshi: 'kalshi',
  };

  const platform = platformMap[raw.platform] || 'polymarket';

  // Извлекаем вероятность из current_prices.yes.price (0-1 формат)
  // Это приоритетный источник, так как это реальные данные из PolyRouter
  let probability = 0;
  if (raw.current_prices?.yes?.price !== undefined) {
    // current_prices.yes.price в формате 0-1, преобразуем в проценты
    probability = raw.current_prices.yes.price * 100;
  } else if (raw.probability !== undefined) {
    // Fallback на старое поле probability (для обратной совместимости)
    probability = raw.probability <= 1 ? raw.probability * 100 : raw.probability;
  }

  // Используем volume_total как приоритетный источник объема
  const volume = raw.volume_total ?? raw.volume_24h ?? undefined;

  // Создаем ссылку на рынок (приоритет: source_url, затем url, затем генерируем)
  const link = raw.source_url || raw.url || getPlatformUrl(raw.platform, raw.id);

  // Используем last_synced_at как приоритетный источник времени обновления
  const updatedAt = raw.last_synced_at || raw.updated_at || new Date().toISOString();

  return {
    id: raw.id,
    platform,
    originalTitle: raw.title,
    probability: Math.round(probability * 10) / 10, // Округляем до 1 знака
    volume,
    liquidity: raw.liquidity,
    link,
    updatedAt,
    eventId: raw.event_id,
    eventName: raw.event_name,
    category: raw.category, // Используем category из PolyRouter
    // Дополнительные поля из API
    price_24h_changes: raw.price_24h_changes,
    price_7d_changes: raw.price_7d_changes,
    last_trades: raw.last_trades ? (Array.isArray(raw.last_trades) ? raw.last_trades : [raw.last_trades]) : undefined,
    withdrawal_fee: raw.withdrawal_fee ?? undefined,
    fee_rate: raw.fee_rate ?? undefined,
    trading_fee: raw.trading_fee ?? undefined,
    open_interest: raw.open_interest ?? undefined,
    unique_traders: raw.unique_traders ?? undefined,
    volume_24h: raw.volume_24h,
    volume_7d: raw.volume_7d ?? undefined,
    liquidity_score: raw.liquidity_score,
    current_prices: raw.current_prices,
  };
}

/**
 * Генерирует URL для платформы на основе ID
 */
function getPlatformUrl(platform: string, id: string): string {
  const urlMap: Record<string, (id: string) => string> = {
    polymarket: (id) => `https://polymarket.com/event/${id}`,
    manifold: (id) => `https://manifold.markets/${id}`,
    kalshi: (id) => `https://kalshi.com/markets/${id}`,
  };

  const urlGenerator = urlMap[platform];
  return urlGenerator ? urlGenerator(id) : `https://${platform}.com/market/${id}`;
}

/**
 * Нормализует массив рынков
 */
export function normalizePolyRouterMarkets(
  markets: PolyRouterMarket[]
): Market[] {
  return markets
    .filter(m => m.status === 'open') // Только открытые рынки
    .map(normalizePolyRouterMarket);
}

/**
 * Нормализует Event в массив Market
 * Если Event содержит nested markets (with_nested_markets=true), создает отдельный Market для каждого nested market
 * Это позволяет правильно отображать все данные по ценам для каждого рынка
 */
export function normalizePolyRouterEvent(
  raw: PolyRouterEvent
): Market[] {
  const platformMap: Record<string, Platform> = {
    polymarket: 'polymarket',
    manifold: 'manifold',
    kalshi: 'kalshi',
  };

  const platform = platformMap[raw.platform] || 'polymarket';
  const markets: Market[] = [];

  // Если Event содержит nested markets, создаем отдельный Market для каждого
  if (raw.markets && Array.isArray(raw.markets) && raw.markets.length > 0) {
    // Проверяем, являются ли markets объектами PolyRouterMarket
    const marketObjects = raw.markets.filter(
      (m: any) => m && typeof m === 'object' && 'id' in m
    ) as PolyRouterMarket[];
    
    if (marketObjects.length > 0) {
      // Создаем отдельный Market для каждого nested market
      marketObjects.forEach(market => {
        // Нормализуем каждый nested market как обычный Market
        const normalizedMarket = normalizePolyRouterMarket(market);
        markets.push(normalizedMarket);
      });
    } else {
      // Если markets не являются объектами PolyRouterMarket, создаем один Market из Event
      let probability = 0;
      const probabilities = raw.markets
        .map((m: any) => {
          if (m?.current_prices?.yes?.price !== undefined) {
            return m.current_prices.yes.price * 100;
          }
          return undefined;
        })
        .filter((p): p is number => p !== undefined && p > 0);
      
      if (probabilities.length > 0) {
        probability = probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length;
      }

      const volume = raw.total_volume ?? undefined;
      const link = getPlatformUrl(raw.platform, raw.id);

      markets.push({
        id: raw.id,
        platform,
        originalTitle: raw.title,
        probability: Math.round(probability * 10) / 10,
        volume,
        liquidity: undefined,
        link,
        updatedAt: raw.last_synced_at || new Date().toISOString(),
        eventId: raw.id,
        eventName: raw.title,
        category: undefined,
      });
    }
  } else {
    // Если нет nested markets, создаем один Market из Event
    const volume = raw.total_volume ?? undefined;
    const link = getPlatformUrl(raw.platform, raw.id);

    markets.push({
      id: raw.id,
      platform,
      originalTitle: raw.title,
      probability: 0,
      volume,
      liquidity: undefined,
      link,
      updatedAt: raw.last_synced_at || new Date().toISOString(),
      eventId: raw.id,
      eventName: raw.title,
      category: undefined,
    });
  }

  return markets;
}

/**
 * Нормализует массив событий в массив Market
 */
export function normalizePolyRouterEvents(
  events: PolyRouterEvent[]
): Market[] {
  return events.flatMap(normalizePolyRouterEvent);
}

/**
 * Нормализует Series в Market (создает виртуальный market на основе серии)
 * Если Series содержит nested markets, извлекает probability из них
 */
export function normalizePolyRouterSeries(
  raw: PolyRouterSeries
): Market {
  const platformMap: Record<string, Platform> = {
    polymarket: 'polymarket',
    manifold: 'manifold',
    kalshi: 'kalshi',
  };

  const platform = platformMap[raw.platform] || 'polymarket';

  // Если Series содержит markets, извлекаем probability из них
  let probability = 0;
  if (raw.markets && Array.isArray(raw.markets) && raw.markets.length > 0) {
    // Проверяем, являются ли markets объектами PolyRouterMarket
    const marketObjects = raw.markets.filter(
      (m: any) => m && typeof m === 'object' && 'id' in m && 'current_prices' in m
    ) as PolyRouterMarket[];
    
    if (marketObjects.length > 0) {
      // Извлекаем probabilities из всех nested markets
      const probabilities = marketObjects
        .map(market => {
          if (market.current_prices?.yes?.price !== undefined) {
            return market.current_prices.yes.price * 100;
          }
          return undefined;
        })
        .filter((p): p is number => p !== undefined && p > 0);
      
      // Используем среднее значение probability из всех markets
      if (probabilities.length > 0) {
        probability = probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length;
      }
    }
  }

  const link = getPlatformUrl(raw.platform, raw.id);

  return {
    id: raw.id,
    platform,
    originalTitle: raw.title,
    probability: Math.round(probability * 10) / 10, // Округляем до 1 знака
    volume: undefined,
    liquidity: undefined,
    link,
    updatedAt: raw.last_synced_at || new Date().toISOString(),
    eventId: raw.id,
    eventName: raw.title,
    category: raw.category,
  };
}

/**
 * Нормализует массив серий
 */
export function normalizePolyRouterSeriesList(
  series: PolyRouterSeries[]
): Market[] {
  return series.map(normalizePolyRouterSeries);
}

/**
 * Нормализует Game в массив Market (создает отдельный Market для каждого outcome в каждом market)
 * Это позволяет правильно отображать все ставки и данные для игр
 */
export function normalizePolyRouterGame(
  raw: PolyRouterGame
): Market[] {
  const platformMap: Record<string, Platform> = {
    polymarket: 'polymarket',
    manifold: 'manifold',
    kalshi: 'kalshi',
    prophetx: 'polymarket', // Fallback
    novig: 'polymarket', // Fallback
    sxbet: 'polymarket', // Fallback
  };

  const gameId = raw.polyrouter_id || raw.id || '';
  const markets: Market[] = [];

  // Если Game содержит markets с outcomes, создаем отдельный Market для каждого outcome
  if (raw.markets && Array.isArray(raw.markets) && raw.markets.length > 0) {
    raw.markets.forEach((gameMarket, marketIndex) => {
      const platform = platformMap[gameMarket.platform] || 'polymarket';
      
      if (gameMarket.outcomes && Array.isArray(gameMarket.outcomes) && gameMarket.outcomes.length > 0) {
        // Создаем отдельный Market для каждого outcome
        gameMarket.outcomes.forEach((outcome, outcomeIndex) => {
          // price в формате 0-1 или 0-100, нормализуем к процентам
          let probability = 0;
          if (outcome.price !== undefined) {
            probability = outcome.price <= 1 ? outcome.price * 100 : outcome.price;
          }

          // Создаем уникальный ID для этого outcome
          const marketId = `${gameId}_${gameMarket.event_id || marketIndex}_${outcomeIndex}`;
          
          // Создаем ссылку на рынок
          const link = gameMarket.event_id 
            ? (platform === 'polymarket' 
                ? `https://polymarket.com/event/${gameMarket.event_id}`
                : platform === 'kalshi'
                ? `https://kalshi.com/markets/${gameMarket.event_id}`
                : `https://${platform}.com/market/${gameMarket.event_id}`)
            : `https://polyrouter.io/games/${gameId}`;

          markets.push({
            id: marketId,
            platform,
            originalTitle: `${raw.title} - ${outcome.name}`,
            probability: Math.round(probability * 10) / 10,
            volume: outcome.volume,
            liquidity: undefined,
            link,
            updatedAt: raw.scheduled_at || new Date().toISOString(),
            eventId: gameId,
            eventName: raw.title,
            category: raw.league || 'Sports',
            // Сохраняем дополнительные данные из outcome
            // Можно расширить тип Market для хранения status и других полей
          });
        });
      } else {
        // Если нет outcomes, создаем один Market для всего gameMarket
        const marketId = `${gameId}_${gameMarket.event_id || marketIndex}`;
        const link = gameMarket.event_id 
          ? (platform === 'polymarket' 
              ? `https://polymarket.com/event/${gameMarket.event_id}`
              : platform === 'kalshi'
              ? `https://kalshi.com/markets/${gameMarket.event_id}`
              : `https://${platform}.com/market/${gameMarket.event_id}`)
          : `https://polyrouter.io/games/${gameId}`;

        markets.push({
          id: marketId,
          platform,
          originalTitle: raw.title,
          probability: 0,
          volume: undefined,
          liquidity: undefined,
          link,
          updatedAt: raw.scheduled_at || new Date().toISOString(),
          eventId: gameId,
          eventName: raw.title,
          category: raw.league || 'Sports',
        });
      }
    });
  } else {
    // Если нет markets, создаем один базовый Market
    markets.push({
      id: gameId,
      platform: 'polymarket',
      originalTitle: raw.title,
      probability: 0,
      volume: undefined,
      liquidity: undefined,
      link: `https://polyrouter.io/games/${gameId}`,
      updatedAt: raw.scheduled_at || new Date().toISOString(),
      eventId: gameId,
      eventName: raw.title,
      category: raw.league || 'Sports',
    });
  }

  return markets;
}

/**
 * Нормализует массив игр в массив Market
 */
export function normalizePolyRouterGames(
  games: PolyRouterGame[]
): Market[] {
  return games.flatMap(normalizePolyRouterGame);
}

