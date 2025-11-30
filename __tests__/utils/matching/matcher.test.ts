import { findMatches } from '@/utils/matching/matcher';
import { Market } from '@/types';

describe('Matcher', () => {
  it('должен находить похожие события на разных платформах', () => {
    const markets: Market[] = [
      {
        id: 'poly-1',
        platform: 'polymarket',
        originalTitle: 'Will Trump win 2024 election?',
        probability: 65,
        link: 'https://polymarket.com/event/trump',
      },
      {
        id: 'manifold-1',
        platform: 'manifold',
        originalTitle: 'Trump wins 2024 US Presidential Election',
        probability: 60,
        link: 'https://manifold.markets/trump-2024',
      },
      {
        id: 'kalshi-1',
        platform: 'kalshi',
        originalTitle: 'TRUMP.WIN.PRES.2024',
        probability: 63,
        link: 'https://kalshi.com/markets/trump',
      },
    ];

    const matches = findMatches(markets, 0.5);

    expect(matches.length).toBeGreaterThan(0);
    const match = matches[0];
    expect(match.event.markets.length).toBeGreaterThanOrEqual(2);
    expect(match.platformsCount).toBeGreaterThanOrEqual(2);
  });

  it('должен группировать только рынки с разных платформ', () => {
    const markets: Market[] = [
      {
        id: 'poly-1',
        platform: 'polymarket',
        originalTitle: 'Bitcoin above 100k',
        probability: 50,
        link: 'https://polymarket.com/btc',
      },
      {
        id: 'poly-2',
        platform: 'polymarket',
        originalTitle: 'Bitcoin reaches 100k',
        probability: 48,
        link: 'https://polymarket.com/btc2',
      },
      {
        id: 'manifold-1',
        platform: 'manifold',
        originalTitle: 'Bitcoin price >= 100000',
        probability: 52,
        link: 'https://manifold.markets/btc',
      },
    ];

    const matches = findMatches(markets, 0.5);
    
    // Должен найти матч только между poly и manifold, не между двумя poly
    const match = matches.find(m => 
      m.event.markets.some(mkt => mkt.platform === 'polymarket') &&
      m.event.markets.some(mkt => mkt.platform === 'manifold')
    );
    
    expect(match).toBeDefined();
    expect(match!.event.markets.length).toBe(2); // Только poly-1 и manifold-1
  });

  it('должен рассчитывать spread правильно', () => {
    const markets: Market[] = [
      {
        id: 'poly-1',
        platform: 'polymarket',
        originalTitle: 'Test Event',
        probability: 70,
        link: 'https://polymarket.com/test',
      },
      {
        id: 'manifold-1',
        platform: 'manifold',
        originalTitle: 'Test Event',
        probability: 50,
        link: 'https://manifold.markets/test',
      },
    ];

    const matches = findMatches(markets, 0.8);
    
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].spread).toBe(20); // 70 - 50
    expect(matches[0].minProbability).toBe(50);
    expect(matches[0].maxProbability).toBe(70);
  });

  it('должен сортировать по spread (максимальный mispricing)', () => {
    const markets: Market[] = [
      {
        id: 'poly-1',
        platform: 'polymarket',
        originalTitle: 'Event A',
        probability: 80,
        link: 'https://polymarket.com/a',
      },
      {
        id: 'manifold-1',
        platform: 'manifold',
        originalTitle: 'Event A',
        probability: 50,
        link: 'https://manifold.markets/a',
      },
      {
        id: 'poly-2',
        platform: 'polymarket',
        originalTitle: 'Event B',
        probability: 55,
        link: 'https://polymarket.com/b',
      },
      {
        id: 'kalshi-1',
        platform: 'kalshi',
        originalTitle: 'Event B',
        probability: 52,
        link: 'https://kalshi.com/b',
      },
    ];

    const matches = findMatches(markets, 0.8);
    
    // Может быть 1 или 2 матча в зависимости от порога схожести
    expect(matches.length).toBeGreaterThanOrEqual(1);
    
    // Если есть несколько матчей, они должны быть отсортированы по spread
    if (matches.length >= 2) {
      expect(matches[0].spread).toBeGreaterThanOrEqual(matches[1].spread);
    }
  });

  it('должен извлекать категорию из названия', () => {
    const markets: Market[] = [
      {
        id: 'poly-1',
        platform: 'polymarket',
        originalTitle: 'Will Trump win the 2024 US Presidential Election?',
        probability: 65,
        link: 'https://polymarket.com/trump',
      },
      {
        id: 'manifold-1',
        platform: 'manifold',
        originalTitle: 'Trump elected President in 2024',
        probability: 60,
        link: 'https://manifold.markets/trump',
      },
    ];

    const matches = findMatches(markets, 0.5);
    
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].event.category).toBe('Политика');
  });
});

