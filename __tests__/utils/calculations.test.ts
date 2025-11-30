import { calculateMatch, formatProbability, formatSpread, formatDate } from '@/utils/calculations';
import { Event } from '@/types';

describe('Calculations', () => {
  describe('calculateMatch', () => {
    it('должен рассчитывать min, max и spread', () => {
      const event: Event = {
        id: 'test-1',
        normalizedTitle: 'Test Event',
        category: 'Технологии',
        tags: ['test'],
        markets: [
          {
            id: 'm1',
            platform: 'polymarket',
            originalTitle: 'Test',
            probability: 50,
            link: 'https://test.com',
          },
          {
            id: 'm2',
            platform: 'manifold',
            originalTitle: 'Test',
            probability: 60,
            link: 'https://test.com',
          },
          {
            id: 'm3',
            platform: 'kalshi',
            originalTitle: 'Test',
            probability: 55,
            link: 'https://test.com',
          },
        ],
      };

      const match = calculateMatch(event);

      expect(match.minProbability).toBe(50);
      expect(match.maxProbability).toBe(60);
      expect(match.spread).toBe(10);
      expect(match.platformsCount).toBe(3);
    });
  });

  describe('formatProbability', () => {
    it('должен форматировать вероятность с одним знаком после запятой', () => {
      expect(formatProbability(65.123)).toBe('65.1%');
      expect(formatProbability(50)).toBe('50.0%');
      expect(formatProbability(99.99)).toBe('100.0%');
    });
  });

  describe('formatSpread', () => {
    it('должен форматировать spread с одним знаком после запятой', () => {
      expect(formatSpread(8.5)).toBe('8.5 п.п.');
      expect(formatSpread(10)).toBe('10.0 п.п.');
    });
  });

  describe('formatDate', () => {
    it('должен форматировать дату в формат dd.mm.yyyy', () => {
      expect(formatDate('2024-11-05')).toBe('05.11.2024');
      expect(formatDate('2024-12-31')).toBe('31.12.2024');
      expect(formatDate('2024-01-01')).toBe('01.01.2024');
    });
  });
});

