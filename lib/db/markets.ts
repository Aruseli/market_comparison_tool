import { prisma } from './prisma'
import { Market } from '@/types'

/**
 * Получить рынок по ID
 */
export async function getMarketById(id: string): Promise<Market | null> {
  if (!prisma) {
    return null;
  }

  const dbMarket = await prisma.market.findUnique({
    where: { id },
  })

  if (!dbMarket) return null

  return {
    id: dbMarket.id,
    platform: dbMarket.platform as Market['platform'],
    originalTitle: dbMarket.originalTitle,
    probability: dbMarket.probability || 0,
    volume: dbMarket.volume ? Number(dbMarket.volume) : undefined,
    liquidity: dbMarket.liquidity ? Number(dbMarket.liquidity) : undefined,
    link: dbMarket.link || '',
    updatedAt: dbMarket.updatedAt.toISOString(),
  }
}

/**
 * Сохранить снимок рынка (для истории изменений)
 */
export async function saveMarketSnapshot(marketId: string, probability: number, volume?: number, liquidity?: number): Promise<void> {
  if (!prisma) {
    return;
  }

  await prisma.marketSnapshot.create({
    data: {
      marketId,
      probability,
      volume: volume ? BigInt(volume) : null,
      liquidity: liquidity ? BigInt(liquidity) : null,
    },
  })
}

