import { prisma } from './prisma'
import { Match, Event, Market } from '@/types'

/**
 * Получить свежие матчи из БД (обновлены за последние N минут)
 */
export async function getFreshMatches(minutes: number = 5): Promise<Match[]> {
  if (!prisma) {
    return [];
  }

  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)

  const dbMatches = await prisma.match.findMany({
    where: {
      updatedAt: {
        gte: cutoffTime,
      },
    },
    include: {
      event: {
        include: {
          markets: true,
        },
      },
    },
    orderBy: {
      spread: 'desc',
    },
    take: 100,
  })

  return dbMatches.map(convertDbMatchToMatch)
}

/**
 * Сохранить или обновить матч в БД
 */
export async function upsertMatch(match: Match): Promise<void> {
  if (!prisma) {
    return;
  }

  const { event, minProbability, maxProbability, spread, platformsCount } = match

  // Сначала создаем/обновляем событие
  await prisma.event.upsert({
    where: { id: event.id },
    update: {
      normalizedTitle: event.normalizedTitle,
      description: event.description,
      category: event.category,
      tags: event.tags,
      resolutionDate: event.resolutionDate ? new Date(event.resolutionDate) : null,
      updatedAt: new Date(),
    },
    create: {
      id: event.id,
      normalizedTitle: event.normalizedTitle,
      description: event.description,
      category: event.category,
      tags: event.tags,
      resolutionDate: event.resolutionDate ? new Date(event.resolutionDate) : null,
    },
  })

  // Создаем/обновляем рынки
  for (const market of event.markets) {
    await prisma.market.upsert({
      where: { id: market.id },
      update: {
        platform: market.platform,
        originalTitle: market.originalTitle,
        probability: market.probability,
        volume: market.volume ? BigInt(market.volume) : null,
        liquidity: market.liquidity ? BigInt(market.liquidity) : null,
        link: market.link,
        eventId: event.id,
        updatedAt: new Date(),
      },
      create: {
        id: market.id,
        platform: market.platform,
        originalTitle: market.originalTitle,
        probability: market.probability,
        volume: market.volume ? BigInt(market.volume) : null,
        liquidity: market.liquidity ? BigInt(market.liquidity) : null,
        link: market.link,
        eventId: event.id,
      },
    })
  }

  // Создаем/обновляем матч
  await prisma.match.upsert({
    where: { eventId: event.id },
    update: {
      minProbability,
      maxProbability,
      spread,
      platformsCount,
      updatedAt: new Date(),
    },
    create: {
      eventId: event.id,
      minProbability,
      maxProbability,
      spread,
      platformsCount,
    },
  })
}

/**
 * Сохранить несколько матчей в БД
 */
export async function upsertMatches(matches: Match[]): Promise<void> {
  for (const match of matches) {
    await upsertMatch(match)
  }
}

/**
 * Получить матч по ID события
 */
export async function getMatchByEventId(eventId: string): Promise<Match | null> {
  if (!prisma) {
    return null;
  }

  const dbMatch = await prisma.match.findUnique({
    where: { eventId },
    include: {
      event: {
        include: {
          markets: true,
        },
      },
    },
  })

  if (!dbMatch) return null

  return convertDbMatchToMatch(dbMatch)
}

/**
 * Конвертировать DB Match в наш формат Match
 */
function convertDbMatchToMatch(dbMatch: any): Match {
  return {
    eventId: dbMatch.eventId,
    event: {
      id: dbMatch.event.id,
      normalizedTitle: dbMatch.event.normalizedTitle,
      description: dbMatch.event.description || undefined,
      category: dbMatch.event.category,
      tags: dbMatch.event.tags,
      resolutionDate: dbMatch.event.resolutionDate?.toISOString(),
      markets: dbMatch.event.markets.map((m: any) => ({
        id: m.id,
        platform: m.platform as Market['platform'],
        originalTitle: m.originalTitle,
        probability: m.probability || 0,
        volume: m.volume ? Number(m.volume) : undefined,
        liquidity: m.liquidity ? Number(m.liquidity) : undefined,
        link: m.link || '',
        updatedAt: m.updatedAt?.toISOString(),
      })),
    },
    minProbability: dbMatch.minProbability,
    maxProbability: dbMatch.maxProbability,
    spread: dbMatch.spread,
    platformsCount: dbMatch.platformsCount,
  }
}

