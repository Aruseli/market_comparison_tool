import { MarketCache } from '@/utils/api/cache';

describe('MarketCache', () => {
  let cache: MarketCache;

  beforeEach(() => {
    cache = new MarketCache(1000); // 1 секунда TTL для тестов
  });

  afterEach(() => {
    cache.clear();
  });

  it('должен сохранять и получать данные', () => {
    const testData = { markets: ['test'] };
    cache.set('key1', testData);

    const result = cache.get('key1');
    expect(result).toEqual(testData);
  });

  it('должен возвращать null для несуществующего ключа', () => {
    const result = cache.get('non-existent');
    expect(result).toBeNull();
  });

  it('должен удалять устаревшие данные', async () => {
    cache.set('key1', { data: 'test' }, 100); // 100ms TTL

    await new Promise(resolve => setTimeout(resolve, 150));

    const result = cache.get('key1');
    expect(result).toBeNull();
  });

  it('должен сохранять данные с разными TTL', () => {
    cache.set('key1', { data: 'short' }, 100);
    cache.set('key2', { data: 'long' }, 1000);

    expect(cache.get('key1')).toBeDefined();
    expect(cache.get('key2')).toBeDefined();
  });

  it('должен очищать весь кэш', () => {
    cache.set('key1', { data: 'test1' });
    cache.set('key2', { data: 'test2' });

    cache.clear();

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('должен удалять конкретный ключ', () => {
    cache.set('key1', { data: 'test1' });
    cache.set('key2', { data: 'test2' });

    cache.delete('key1');

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeDefined();
  });
});

