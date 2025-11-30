import { PolyRouterClient } from '@/utils/api/polyrouter-client';
import { PolyRouterMarket } from '@/types/polyrouter';

// Mock fetch
global.fetch = jest.fn();

describe('PolyRouterClient', () => {
  let client: PolyRouterClient;

  beforeEach(() => {
    process.env.POLYROUTER_API_KEY = 'test-key';
    process.env.POLYROUTER_API_URL = 'https://api.polyrouter.io/functions/v1';
    (fetch as jest.Mock).mockClear();
    client = new PolyRouterClient();
  });

  afterEach(() => {
    delete process.env.POLYROUTER_API_KEY;
    delete process.env.POLYROUTER_API_URL;
  });

  describe('getMarkets', () => {
    it('должен делать запрос к PolyRouter API', async () => {
      const mockMarkets: PolyRouterMarket[] = [
        {
          id: 'market-1',
          platform_id: 'market-1',
          title: 'Test Market',
          platform: 'polymarket',
          status: 'open',
          probability: 0.65,
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ markets: mockMarkets }),
      });

      const result = await client.getMarkets({ limit: 10 });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.polyrouter.io/functions/v1/markets-v2'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
        })
      );

      expect(result.markets).toEqual(mockMarkets);
    });

    it('должен передавать параметры фильтрации', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ markets: [] }),
      });

      await client.getMarkets({
        platform: 'polymarket',
        status: 'open',
        limit: 50,
      });

      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('platform=polymarket');
      expect(callUrl).toContain('status=open');
      expect(callUrl).toContain('limit=50');
    });

    it('должен обрабатывать ошибки API', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      await expect(client.getMarkets({})).rejects.toThrow();
    });
  });

  describe('getMarketById', () => {
    it('должен получать конкретный рынок', async () => {
      const mockMarket: PolyRouterMarket = {
        id: 'market-123',
        platform_id: 'market-123',
        title: 'Test Market',
        platform: 'polymarket',
        status: 'open',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ market: mockMarket }),
      });

      const result = await client.getMarketById('market-123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/markets-v2/market-123'),
        expect.any(Object)
      );

      expect(result).toEqual(mockMarket);
    });

    it('должен возвращать null если рынок не найден', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ market: null }),
      });

      const result = await client.getMarketById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('searchMarkets', () => {
    it('должен искать рынки по запросу', async () => {
      const mockMarkets: PolyRouterMarket[] = [
        {
          id: 'search-1',
          platform_id: 'search-1',
          title: 'Trump 2024',
          platform: 'polymarket',
          status: 'open',
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ markets: mockMarkets }),
      });

      const result = await client.searchMarkets('trump', 20);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=trump'),
        expect.any(Object)
      );

      expect(result).toEqual(mockMarkets);
    });
  });
});

