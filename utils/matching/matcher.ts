import { Market, Event, Match } from '@/types';
import { calculateMatch } from '@/utils/calculations';
import { compareTwoStrings } from 'string-similarity';

/**
 * Нормализует название для сравнения
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Удаляем спецсимволы
    .replace(/\s+/g, ' ') // Множественные пробелы в один
    .trim();
}

/**
 * Вычисляет схожесть двух строк используя библиотеку string-similarity
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeTitle(str1);
  const s2 = normalizeTitle(str2);

  if (s1 === s2) return 1.0;

  // Используем библиотеку string-similarity для более точного сравнения
  return compareTwoStrings(s1, s2);
}

/**
 * Находит похожие рынки и группирует их в события
 */
export function findMatches(
  markets: Market[],
  threshold: number = 0.5 // Снижен порог для более агрессивного матчинга
): Match[] {
  console.log(`[Matcher] Starting matching for ${markets.length} markets with threshold ${threshold}`);
  
  const matches: Match[] = [];
  const processed = new Set<string>();

  // Группируем рынки по платформам для статистики
  const marketsByPlatform = new Map<string, number>();
  markets.forEach(m => {
    marketsByPlatform.set(m.platform, (marketsByPlatform.get(m.platform) || 0) + 1);
  });
  console.log(`[Matcher] Markets by platform:`, Object.fromEntries(marketsByPlatform));

  // Сначала группируем по event_id (точный матчинг)
  const marketsByEventId = new Map<string, Market[]>();
  for (const market of markets) {
    if (market.eventId) {
      if (!marketsByEventId.has(market.eventId)) {
        marketsByEventId.set(market.eventId, []);
      }
      marketsByEventId.get(market.eventId)!.push(market);
    }
  }

  let eventIdMatches = 0;
  let stringMatches = 0;

  // Обрабатываем матчи по event_id
  for (const [eventId, eventMarkets] of marketsByEventId.entries()) {
    const platforms = new Set(eventMarkets.map(m => m.platform));
    if (platforms.size >= 2) {
      // Нашли событие с несколькими платформами по event_id
      const event = createEventFromMarkets(eventMarkets);
      const match = calculateMatch(event);
      matches.push(match);
      eventMarkets.forEach(m => processed.add(m.id));
      eventIdMatches++;
      console.log(`[Matcher] Found event_id match: "${event.normalizedTitle.substring(0, 50)}" (event_id: ${eventId}) with ${eventMarkets.length} markets from ${platforms.size} platforms`);
    }
  }

  // Затем ищем матчи по строковому сходству (для рынков без event_id или с разными event_id)
  for (const market of markets) {
    if (processed.has(market.id)) continue;

    // Ищем похожие рынки
    const similarMarkets: Market[] = [market];
    
    for (const otherMarket of markets) {
      if (
        otherMarket.id === market.id ||
        processed.has(otherMarket.id) ||
        otherMarket.platform === market.platform // Не группируем рынки с одной платформы
      ) {
        continue;
      }

      // Если у обоих есть event_id и они разные, пропускаем (уже обработали выше)
      if (market.eventId && otherMarket.eventId && market.eventId !== otherMarket.eventId) {
        continue;
      }

      const similarity = stringSimilarity(
        market.originalTitle,
        otherMarket.originalTitle
      );

      if (similarity >= threshold) {
        similarMarkets.push(otherMarket);
        console.log(`[Matcher] Found string match: "${market.originalTitle.substring(0, 50)}" <-> "${otherMarket.originalTitle.substring(0, 50)}" (similarity: ${similarity.toFixed(2)})`);
      }
    }

    // Если нашли хотя бы 2 рынка с разных платформ, создаем событие
    const platforms = new Set(similarMarkets.map(m => m.platform));
    if (platforms.size >= 2) {
      const event = createEventFromMarkets(similarMarkets);
      const match = calculateMatch(event);
      matches.push(match);
      stringMatches++;

      console.log(`[Matcher] Created string match: "${event.normalizedTitle.substring(0, 50)}" with ${similarMarkets.length} markets from ${platforms.size} platforms (spread: ${match.spread.toFixed(2)}%)`);

      // Помечаем все рынки как обработанные
      similarMarkets.forEach(m => processed.add(m.id));
    }
  }

  console.log(`[Matcher] Matching stats: ${eventIdMatches} matches by event_id, ${stringMatches} matches by string similarity`);

  // Сортируем по spread (максимальный mispricing)
  matches.sort((a, b) => b.spread - a.spread);

  console.log(`[Matcher] Matching completed: ${matches.length} matches found from ${markets.length} markets`);
  
  if (matches.length === 0 && markets.length > 0) {
    console.warn(`[Matcher] No matches found! Possible reasons:`);
    console.warn(`  - All markets from single platform (need at least 2 platforms)`);
    console.warn(`  - Similarity threshold too high (current: ${threshold})`);
    console.warn(`  - Market titles too different`);
  }

  return matches;
}

/**
 * Создает событие из группы похожих рынков
 */
function createEventFromMarkets(markets: Market[]): Event {
  // Используем название первого рынка как нормализованное
  const normalizedTitle = markets[0].originalTitle;
  
  // Используем category из рынков (если есть), иначе извлекаем из названия
  const categoryFromMarkets = markets.find(m => m.category)?.category;
  const category = categoryFromMarkets || extractCategory(normalizedTitle);
  
  // Извлекаем теги из названия
  const tags = extractTags(normalizedTitle);

  // Генерируем ID на основе нормализованного названия
  const id = generateEventId(normalizedTitle);

  return {
    id,
    normalizedTitle,
    description: undefined,
    category,
    tags,
    resolutionDate: undefined,
    markets,
  };
}

/**
 * Извлекает категорию из названия
 */
function extractCategory(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('trump') || titleLower.includes('election') || titleLower.includes('president')) {
    return 'Политика';
  }
  if (titleLower.includes('bitcoin') || titleLower.includes('crypto') || titleLower.includes('btc')) {
    return 'Криптовалюты';
  }
  if (titleLower.includes('fed') || titleLower.includes('rate') || titleLower.includes('recession')) {
    return 'Экономика';
  }
  if (titleLower.includes('stock') || titleLower.includes('tesla') || titleLower.includes('nvidia')) {
    return 'Финансы';
  }
  if (titleLower.includes('gpt') || titleLower.includes('ai') || titleLower.includes('iphone')) {
    return 'Технологии';
  }
  if (titleLower.includes('olympics') || titleLower.includes('euro') || titleLower.includes('sport')) {
    return 'Спорт';
  }
  
  return 'Другое';
}

/**
 * Извлекает теги из названия
 */
function extractTags(title: string): string[] {
  const tags: string[] = [];
  const titleLower = title.toLowerCase();
  
  // Ключевые слова для тегов
  const keywords = [
    'trump', 'bitcoin', 'btc', 'fed', 'tesla', 'nvidia', 'gpt', 'ai',
    'election', 'president', 'crypto', 'stock', 'olympics', 'euro'
  ];
  
  keywords.forEach(keyword => {
    if (titleLower.includes(keyword)) {
      tags.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });
  
  return tags;
}

/**
 * Генерирует ID события на основе названия
 */
function generateEventId(title: string): string {
  return normalizeTitle(title)
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .replace(/-+$/, ''); // Убираем дефисы в конце
}

