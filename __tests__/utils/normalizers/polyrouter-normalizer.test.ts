import { normalizePolyRouterMarket, normalizePolyRouterMarkets } from '@/utils/normalizers/polyrouter-normalizer';
import { PolyRouterMarket } from '@/types/polyrouter';
import { Market } from '@/types';

describe('PolyRouter Normalizer', () => {
  describe('normalizePolyRouterMarket', () => {
    it('должен нормализовать рынок Polymarket', () => {
      const rawMarket: PolyRouterMarket = {
        id: 'poly-123',
        title: 'Will Trump win 2024?',
        platform: 'polymarket',
        status: 'open',
        probability: 0.65,
        volume_24h: 1000000,
        liquidity: 500000,
        url: 'https://polymarket.com/event/trump-2024',
        updated_at: '2024-01-15T10:00:00Z',
      };

      const normalized = normalizePolyRouterMarket(rawMarket);

      expect(normalized).toMatchObject({
        id: 'poly-123',
        platform: 'polymarket',
        originalTitle: 'Will Trump win 2024?',
        probability: 65,
        volume: 1000000,
        liquidity: 500000,
        link: 'https://polymarket.com/event/trump-2024',
      });
    });

    it('должен преобразовать вероятность из формата 0-1 в проценты', () => {
      const rawMarket: PolyRouterMarket = {
        id: 'test-1',
        title: 'Test Market',
        platform: 'polymarket',
        status: 'open',
        probability: 0.75,
      };

      const normalized = normalizePolyRouterMarket(rawMarket);
      expect(normalized.probability).toBe(75);
    });

    it('должен обработать вероятность уже в процентах', () => {
      const rawMarket: PolyRouterMarket = {
        id: 'test-2',
        title: 'Test Market',
        platform: 'polymarket',
        status: 'open',
        probability: 80,
      };

      const normalized = normalizePolyRouterMarket(rawMarket);
      expect(normalized.probability).toBe(80);
    });

    it('должен сгенерировать URL если его нет', () => {
      const rawMarket: PolyRouterMarket = {
        id: 'test-123',
        title: 'Test Market',
        platform: 'polymarket',
        status: 'open',
      };

      const normalized = normalizePolyRouterMarket(rawMarket);
      expect(normalized.link).toContain('polymarket.com');
      expect(normalized.link).toContain('test-123');
    });

    it('должен обработать разные платформы', () => {
      const platforms = ['polymarket', 'manifold', 'kalshi'] as const;
      
      platforms.forEach(platform => {
        const rawMarket: PolyRouterMarket = {
          id: `test-${platform}`,
          title: 'Test Market',
          platform,
          status: 'open',
        };

        const normalized = normalizePolyRouterMarket(rawMarket);
        expect(normalized.platform).toBe(platform);
      });
    });
  });

  describe('normalizePolyRouterMarkets', () => {
    it('должен отфильтровать только открытые рынки', () => {
      const rawMarkets: PolyRouterMarket[] = [
        {
          id: 'open-1',
          title: 'Open Market',
          platform: 'polymarket',
          status: 'open',
          probability: 0.5,
        },
        {
          id: 'closed-1',
          title: 'Closed Market',
          platform: 'polymarket',
          status: 'closed',
          probability: 0.5,
        },
        {
          id: 'resolved-1',
          title: 'Resolved Market',
          platform: 'polymarket',
          status: 'resolved',
          probability: 0.5,
        },
      ];

      const normalized = normalizePolyRouterMarkets(rawMarkets);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].id).toBe('open-1');
    });

    it('должен нормализовать массив рынков', () => {
      const rawMarkets: PolyRouterMarket[] = [
        {
          id: 'market-1',
          title: 'Market 1',
          platform: 'polymarket',
          status: 'open',
          probability: 0.6,
        },
        {
          id: 'market-2',
          title: 'Market 2',
          platform: 'manifold',
          status: 'open',
          probability: 0.7,
        },
      ];

      const normalized = normalizePolyRouterMarkets(rawMarkets);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].probability).toBe(60);
      expect(normalized[1].probability).toBe(70);
    });
  });
});

