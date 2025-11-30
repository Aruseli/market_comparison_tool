import {
  PolyRouterMarket,
  PolyRouterMarketsResponse,
  PolyRouterMarketResponse,
  PolyRouterEvent,
  PolyRouterEventsResponse,
  PolyRouterEventResponse,
  PolyRouterSeries,
  PolyRouterSeriesResponse,
  PolyRouterSeriesDetailResponse,
  PolyRouterPlatformsResponse,
  GetMarketsParams,
  GetEventsParams,
  GetSeriesParams,
  PolyRouterPriceHistoryResponse,
  GetPriceHistoryParams,
  PolyRouterTradesResponse,
  GetTradesParams,
  PolyRouterGamesResponse,
  GetGamesListParams,
  GetGameByIdParams,
  PolyRouterAwardsListResponse,
  PolyRouterAwardsDetailResponse,
  GetAwardsListParams,
  GetAwardByIdParams,
  PolyRouterFuturesListResponse,
  PolyRouterFuturesDetailResponse,
  GetFuturesListParams,
  GetFutureByIdParams,
  PolyRouterLeagueInfoResponse,
  GetLeagueInfoParams,
} from '@/types/polyrouter';

export class PolyRouterClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.POLYROUTER_API_KEY || '';
    // Убеждаемся, что baseUrl заканчивается на /
    const envUrl = process.env.POLYROUTER_API_URL || 'https://api.polyrouter.io/functions/v1';
    this.baseUrl = envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
    
    // Детальное логирование для диагностики
    console.log('[PolyRouter Client] Constructor called');
    console.log('[PolyRouter Client] POLYROUTER_API_URL from env:', process.env.POLYROUTER_API_URL);
    console.log('[PolyRouter Client] Final baseUrl:', this.baseUrl);
    console.log('[PolyRouter Client] POLYROUTER_API_KEY present:', !!this.apiKey);
    console.log('[PolyRouter Client] POLYROUTER_API_KEY length:', this.apiKey.length);
    
    if (!this.apiKey) {
      console.warn('[PolyRouter Client] POLYROUTER_API_KEY is not set');
    } else {
      console.log('[PolyRouter Client] API Key starts with:', this.apiKey.substring(0, 10) + '...');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Убираем ведущий слеш из endpoint, если есть (baseUrl уже заканчивается на /)
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseUrl}${cleanEndpoint}`;
    
    console.log(`[PolyRouter Client] Making request to: ${url}`);
    console.log(`[PolyRouter Client] API Key present: ${!!this.apiKey}`);
    console.log(`[PolyRouter Client] API Key length: ${this.apiKey.length}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`[PolyRouter Client] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PolyRouter Client] API error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`PolyRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[PolyRouter Client] Response received, data keys:`, Object.keys(data));
    return data;
  }

  async getMarkets(params: GetMarketsParams = {}): Promise<PolyRouterMarketsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.platform) {
        queryParams.append('platform', params.platform);
      }
      // status опциональный - передаем только если указан явно
      if (params.status !== undefined) {
        queryParams.append('status', params.status);
      }
      // Всегда передаем limit (по умолчанию 5 для Markets согласно документации)
      const limit = params.limit || 5;
      queryParams.append('limit', limit.toString());
      // Поддержка cursor-based пагинации (приоритет над offset)
      if (params.cursor) {
        queryParams.append('cursor', params.cursor);
      } else if (params.offset !== undefined) {
        queryParams.append('offset', params.offset.toString());
      }
      if (params.search) {
        queryParams.append('query', params.search); // PolyRouter API использует 'query', а не 'search'
      }
      if (params.include_raw) {
        queryParams.append('include_raw', 'true');
      }

      // Убираем ведущий слеш из endpoint, так как baseUrl уже заканчивается на /
      const endpoint = `markets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log(`[PolyRouter Client] getMarkets endpoint: ${endpoint}`);
      const data = await this.request<PolyRouterMarketsResponse>(endpoint);
      
      return data;
    } catch (error) {
      console.error('Error fetching markets from PolyRouter:', error);
      throw error;
    }
  }

  async getMarketsList(params: GetMarketsParams = {}): Promise<PolyRouterMarket[]> {
    const response = await this.getMarkets(params);
    return response.markets || [];
  }

  async getMarketById(id: string, includeRaw?: boolean): Promise<PolyRouterMarket | null> {
    try {
      const queryParams = new URLSearchParams();
      if (includeRaw) {
        queryParams.append('include_raw', 'true');
      }
      const endpoint = `markets/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterMarketResponse>(endpoint);
      // PolyRouter возвращает массив markets, берем первый
      if (Array.isArray(data.markets) && data.markets.length > 0) {
        return data.markets[0];
      }
      return null;
    } catch (error) {
      console.error(`Error fetching market ${id} from PolyRouter:`, error);
      return null;
    }
  }

  async searchMarkets(query: string, limit: number = 50): Promise<PolyRouterMarket[]> {
    return this.getMarketsList({
      search: query, // Внутренне используем search, но в getMarkets он преобразуется в 'query'
      limit,
      status: 'open',
    });
  }

  async getEvents(params: GetEventsParams = {}): Promise<PolyRouterEventsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.platform) {
        queryParams.append('platform', params.platform);
      }
      // Всегда передаем limit (по умолчанию 10 для Events согласно документации)
      const limit = params.limit || 10;
      queryParams.append('limit', limit.toString());
      // Поддержка cursor-based пагинации (Events API не поддерживает offset, только cursor)
      if (params.cursor) {
        queryParams.append('cursor', params.cursor);
      }
      if (params.search) {
        queryParams.append('query', params.search); // PolyRouter API использует 'query', а не 'search'
      }
      if (params.include_raw) {
        queryParams.append('include_raw', 'true');
      }
      if (params.with_nested_markets) {
        queryParams.append('with_nested_markets', 'true');
      }

      const endpoint = `events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterEventsResponse>(endpoint);
      
      return data;
    } catch (error) {
      console.error('Error fetching events from PolyRouter:', error);
      throw error;
    }
  }

  async getEventById(
    eventId: string,
    includeRaw?: boolean,
    withNestedMarkets?: boolean
  ): Promise<PolyRouterEventResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (includeRaw) {
        queryParams.append('include_raw', 'true');
      }
      if (withNestedMarkets) {
        queryParams.append('with_nested_markets', 'true');
      }
      const endpoint = `events/${eventId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterEventResponse>(endpoint);
      return data;
    } catch (error) {
      console.error(`Error fetching event ${eventId} from PolyRouter:`, error);
      throw error;
    }
  }

  async getSeries(params: GetSeriesParams = {}): Promise<PolyRouterSeriesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.platform) {
        queryParams.append('platform', params.platform);
      }
      // Всегда передаем limit (по умолчанию 10 для Series согласно документации)
      const limit = params.limit || 10;
      queryParams.append('limit', limit.toString());
      // Поддержка cursor-based пагинации (Series API не поддерживает offset, только cursor)
      if (params.cursor) {
        queryParams.append('cursor', params.cursor);
      }
      if (params.search) {
        queryParams.append('query', params.search); // PolyRouter API использует 'query', а не 'search'
      }
      if (params.include_raw) {
        queryParams.append('include_raw', 'true');
      }

      const endpoint = `series${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterSeriesResponse>(endpoint);
      
      return data;
    } catch (error) {
      console.error('Error fetching series from PolyRouter:', error);
      throw error;
    }
  }

  async getSeriesById(seriesId: string, includeRaw?: boolean): Promise<PolyRouterSeriesDetailResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (includeRaw) {
        queryParams.append('include_raw', 'true');
      }
      const endpoint = `series/${seriesId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterSeriesDetailResponse>(endpoint);
      return data;
    } catch (error) {
      console.error(`Error fetching series ${seriesId} from PolyRouter:`, error);
      throw error;
    }
  }

  async getPlatforms(): Promise<PolyRouterPlatformsResponse> {
    try {
      const data = await this.request<PolyRouterPlatformsResponse>('platforms');
      return data;
    } catch (error) {
      console.error('Error fetching platforms from PolyRouter:', error);
      throw error;
    }
  }

  async getPriceHistory(params: GetPriceHistoryParams): Promise<PolyRouterPriceHistoryResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('market_ids', params.market_ids);
      if (params.start_ts !== undefined) {
        queryParams.append('start_ts', params.start_ts.toString());
      }
      if (params.end_ts !== undefined) {
        queryParams.append('end_ts', params.end_ts.toString());
      }
      if (params.interval) {
        queryParams.append('interval', params.interval);
      }
      if (params.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }
      const endpoint = `price-history?${queryParams.toString()}`;
      const data = await this.request<PolyRouterPriceHistoryResponse>(endpoint);
      return data;
    } catch (error) {
      console.error('Error fetching price history from PolyRouter:', error);
      throw error;
    }
  }

  async getTrades(params: GetTradesParams): Promise<PolyRouterTradesResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('market_id', params.market_id);
      if (params.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params.cursor) {
        queryParams.append('cursor', params.cursor);
      }
      const endpoint = `trades?${queryParams.toString()}`;
      const data = await this.request<PolyRouterTradesResponse>(endpoint);
      return data;
    } catch (error) {
      console.error('Error fetching trades from PolyRouter:', error);
      throw error;
    }
  }

  async getGamesList(params: GetGamesListParams): Promise<PolyRouterGamesResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('league', params.league);
      if (params.status) {
        queryParams.append('status', params.status);
      }
      const endpoint = `list-games?${queryParams.toString()}`;
      const response = await this.request<{ data: PolyRouterGamesResponse; meta?: any }>(endpoint);
      // PolyRouter возвращает ответ в формате { data: { games, pagination, meta }, meta: {...} }
      // Извлекаем data из ответа
      if (response.data) {
        return response.data;
      }
      // Fallback на случай, если структура другая
      return response as unknown as PolyRouterGamesResponse;
    } catch (error) {
      console.error('Error fetching games list from PolyRouter:', error);
      throw error;
    }
  }

  async getGameById(gameId: string, params: GetGameByIdParams = {}): Promise<PolyRouterGamesResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.platform) {
        queryParams.append('platform', params.platform);
      }
      if (params.market_type) {
        queryParams.append('market_type', params.market_type);
      }
      const endpoint = `games/${gameId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterGamesResponse>(endpoint);
      return data;
    } catch (error) {
      console.error(`Error fetching game ${gameId} from PolyRouter:`, error);
      throw error;
    }
  }

  async getAwardsList(params: GetAwardsListParams): Promise<PolyRouterAwardsListResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('league', params.league);
      if (params.award_type) {
        queryParams.append('award_type', params.award_type);
      }
      if (params.season !== undefined) {
        queryParams.append('season', params.season.toString());
      }
      const endpoint = `list-awards?${queryParams.toString()}`;
      const data = await this.request<PolyRouterAwardsListResponse>(endpoint);
      return data;
    } catch (error) {
      console.error('Error fetching awards list from PolyRouter:', error);
      throw error;
    }
  }

  async getAwardById(awardId: string, params: GetAwardByIdParams = {}): Promise<PolyRouterAwardsDetailResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.platform) {
        queryParams.append('platform', params.platform);
      }
      if (params.odds_format) {
        queryParams.append('odds_format', params.odds_format);
      }
      const endpoint = `awards/${awardId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterAwardsDetailResponse>(endpoint);
      return data;
    } catch (error) {
      console.error(`Error fetching award ${awardId} from PolyRouter:`, error);
      throw error;
    }
  }

  async getFuturesList(params: GetFuturesListParams): Promise<PolyRouterFuturesListResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('league', params.league);
      if (params.future_type) {
        queryParams.append('future_type', params.future_type);
      }
      if (params.season !== undefined) {
        queryParams.append('season', params.season.toString());
      }
      const endpoint = `list-futures?${queryParams.toString()}`;
      const data = await this.request<PolyRouterFuturesListResponse>(endpoint);
      return data;
    } catch (error) {
      console.error('Error fetching futures list from PolyRouter:', error);
      throw error;
    }
  }

  async getFutureById(futureId: string, params: GetFutureByIdParams = {}): Promise<PolyRouterFuturesDetailResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.platform) {
        queryParams.append('platform', params.platform);
      }
      if (params.odds_format) {
        queryParams.append('odds_format', params.odds_format);
      }
      const endpoint = `futures/${futureId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterFuturesDetailResponse>(endpoint);
      return data;
    } catch (error) {
      console.error(`Error fetching future ${futureId} from PolyRouter:`, error);
      throw error;
    }
  }

  async getLeagueInfo(params: GetLeagueInfoParams = {}): Promise<PolyRouterLeagueInfoResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.league) {
        queryParams.append('league', params.league);
      }
      const endpoint = `league-info${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.request<PolyRouterLeagueInfoResponse>(endpoint);
      return data;
    } catch (error) {
      console.error('Error fetching league info from PolyRouter:', error);
      throw error;
    }
  }
}

// Singleton instance - создается при импорте модуля
console.log('[PolyRouter Client] Module loaded, creating singleton instance...');
export const polyRouterClient = new PolyRouterClient();
console.log('[PolyRouter Client] Singleton instance created');

