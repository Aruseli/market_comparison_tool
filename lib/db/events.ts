import { prisma } from './prisma'
import { Event } from '@/types'

/**
 * Получить событие по ID
 */
export async function getEventById(id: string): Promise<Event | null> {
  if (!prisma) {
    return null;
  }

  const dbEvent = await prisma.event.findUnique({
    where: { id },
    include: {
      markets: true,
    },
  })

  if (!dbEvent) return null

  return {
    id: dbEvent.id,
    normalizedTitle: dbEvent.normalizedTitle,
    description: dbEvent.description || undefined,
    category: dbEvent.category,
    tags: dbEvent.tags,
    resolutionDate: dbEvent.resolutionDate?.toISOString(),
    markets: dbEvent.markets.map((m) => ({
      id: m.id,
      platform: m.platform as Event['markets'][0]['platform'],
      originalTitle: m.originalTitle,
      probability: m.probability || 0,
      volume: m.volume ? Number(m.volume) : undefined,
      liquidity: m.liquidity ? Number(m.liquidity) : undefined,
      link: m.link || '',
      updatedAt: m.updatedAt.toISOString(),
    })),
  }
}

