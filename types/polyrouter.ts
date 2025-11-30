// Типы для PolyRouter API

export type PolyRouterPlatform = 'polymarket' | 'manifold' | 'kalshi' | 'limitless' | 'sxbet' | 'novig' | 'prophetx';

export type MarketStatus = 'open' | 'closed' | 'resolved';

// Пагинация (может быть cursor-based или offset-based)
export interface PolyRouterPagination {
  total: number;
  limit: number;
  offset?: number;
  cursor?: string;
  has_more: boolean;
  next_cursor?: string;
  next_offset?: number;
}

// Метаданные ответа
export interface PolyRouterMeta {
  request_time: number;
  cache_hit?: boolean;
  data_freshness?: string;
  platforms_queried?: string[];
  timestamp?: string;
  version?: string;
}

// Цены для бинарных рынков
export interface PolyRouterCurrentPrices {
  yes: {
    price: number;
    bid: number;
    ask: number;
  };
  no: {
    price: number;
    bid: number;
    ask: number;
  };
}

// Исходы рынка
export interface PolyRouterOutcome {
  id: string;
  name: string;
}

// Метаданные рынка
export interface PolyRouterMarketMetadata {
  marketType?: string;
  competitive?: number;
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  clobTokenIds?: string[];
  [key: string]: any;
}

// Рынок из PolyRouter (реальная структура)
export interface PolyRouterMarket {
  id: string;
  platform: PolyRouterPlatform;
  platform_id?: string; // Опционально для обратной совместимости
  event_id?: string;
  event_name?: string;
  event_slug?: string;
  title: string;
  market_slug?: string;
  description?: string;
  subcategory?: string | null;
  source_url?: string;
  status: MarketStatus;
  market_type?: string;
  category?: string;
  tags?: string[] | null;
  outcomes?: PolyRouterOutcome[];
  current_prices?: PolyRouterCurrentPrices;
  volume_7d?: number | null;
  volume_total?: number;
  liquidity?: number;
  liquidity_score?: number;
  open_interest?: number | null;
  unique_traders?: number | null;
  fee_rate?: number | null;
  trading_fee?: number | null;
  withdrawal_fee?: number | null;
  created_at?: string;
  trading_start_at?: string;
  trading_end_at?: string;
  resolution_date?: string;
  resolved_at?: string;
  resolution_criteria?: string | null;
  resolution_source?: string | null;
  price_24h_changes?: any;
  price_7d_changes?: any;
  last_trades?: any;
  metadata?: PolyRouterMarketMetadata;
  last_synced_at?: string;
  // Для обратной совместимости
  probability?: number;
  volume_24h?: number;
  url?: string;
  updated_at?: string;
}

// Ответ на запрос списка рынков
export interface PolyRouterMarketsResponse {
  markets: PolyRouterMarket[];
  pagination: PolyRouterPagination;
  meta: PolyRouterMeta;
}

// Ответ на запрос одного рынка (по API.md возвращает массив markets)
export interface PolyRouterMarketResponse {
  markets: PolyRouterMarket[];
  pagination?: PolyRouterPagination;
  meta?: PolyRouterMeta;
}

// Событие из PolyRouter
export interface PolyRouterEvent {
  id: string;
  platform: PolyRouterPlatform;
  platform_id: string;
  series_id?: string;
  title: string;
  event_slug?: string;
  description?: string;
  image_url?: string;
  resolution_source_url?: string;
  event_start_at?: string;
  event_end_at?: string;
  last_synced_at?: string;
  market_count?: number;
  total_volume?: number;
  markets?: PolyRouterMarket[]; // Nested markets когда with_nested_markets=true
}

// Ответ на запрос списка событий
export interface PolyRouterEventsResponse {
  events: PolyRouterEvent[];
  pagination: PolyRouterPagination;
  meta: PolyRouterMeta;
}

// Ответ на запрос одного события (по API.md возвращает массив events)
export interface PolyRouterEventResponse {
  events: PolyRouterEvent[];
  pagination?: PolyRouterPagination;
  meta?: PolyRouterMeta;
}

// Параметры запроса рынков
export interface GetMarketsParams {
  platform?: PolyRouterPlatform;
  status?: MarketStatus; // Опциональный, не передается если не указан
  limit?: number;
  offset?: number;
  cursor?: string;
  search?: string;
  include_raw?: boolean;
}

// Параметры запроса событий
// Events API не поддерживает offset, только cursor
export interface GetEventsParams {
  platform?: PolyRouterPlatform;
  limit?: number;
  cursor?: string;
  search?: string;
  include_raw?: boolean;
  with_nested_markets?: boolean;
}

// Серия из PolyRouter
export interface PolyRouterSeries {
  id: string;
  platform: PolyRouterPlatform;
  platform_id: string;
  title: string;
  series_slug?: string;
  description?: string;
  image_url?: string;
  category?: string;
  tags?: string[] | null;
  metadata?: Record<string, any>;
  events?: any[];
  markets?: any[];
  last_synced_at?: string;
  raw_data?: Record<string, any>;
}

// Ответ на запрос списка серий
export interface PolyRouterSeriesResponse {
  series: PolyRouterSeries[];
  pagination: PolyRouterPagination;
  meta: PolyRouterMeta;
}

// Ответ на запрос одной серии (по API.md возвращает массив series)
export interface PolyRouterSeriesDetailResponse {
  series: PolyRouterSeries[];
  pagination?: PolyRouterPagination;
  meta?: PolyRouterMeta;
}

// Параметры запроса серий
// Series API не поддерживает offset, только cursor
export interface GetSeriesParams {
  platform?: PolyRouterPlatform;
  limit?: number;
  cursor?: string;
  search?: string;
  include_raw?: boolean;
}

// Платформа из /platforms эндпоинта
export interface PolyRouterPlatformEndpoints {
  markets?: boolean;
  events?: boolean;
  series?: boolean;
  search?: boolean;
  price_history?: boolean;
  awards?: boolean;
  games?: boolean;
  list_games?: boolean;
  league_info?: boolean;
}

export interface PolyRouterPlatformFeatures {
  status_filtering?: boolean;
  date_filtering?: boolean;
  pagination_type?: 'offset' | 'cursor';
  market_types?: string[];
  odds_formats?: string[];
  supported_leagues?: string[];
}

export interface PolyRouterIdFormat {
  description?: string;
  example?: string;
  pattern?: string;
}

export interface PolyRouterPlatformInfo {
  platform: PolyRouterPlatform;
  display_name: string;
  endpoints: PolyRouterPlatformEndpoints;
  features: PolyRouterPlatformFeatures;
  id_format?: PolyRouterIdFormat;
  base_url?: string;
  rate_limit?: string;
}

export interface PolyRouterPlatformsSection {
  platforms: PolyRouterPlatformInfo[];
  health?: Record<string, any>;
  total_platforms: number;
}

// Ответ на запрос /platforms
export interface PolyRouterPlatformsResponse {
  markets?: PolyRouterPlatformsSection;
  sports?: PolyRouterPlatformsSection;
  meta: PolyRouterMeta;
}

// Price History
export interface PolyRouterPriceHistoryDataPoint {
  timestamp: number;
  price: {
    close: number;
    open: number;
    high: number;
    low: number;
  };
  volume: number;
  openInterest: number;
  bidAsk: {
    bid: {
      close: number;
      open: number;
      high: number;
      low: number;
    };
    ask: {
      close: number;
      open: number;
      high: number;
      low: number;
    };
  };
  platform: string;
  marketId: string;
  outcomeId: string;
}

export interface PolyRouterPriceHistoryMeta {
  total_points: number;
  platforms: string[];
  time_range: {
    start: number;
    end: number;
  };
  interval: string;
  request_time: number;
  cache_hit?: boolean;
  data_freshness?: string;
}

export interface PolyRouterPriceHistoryResponse {
  data: PolyRouterPriceHistoryDataPoint[];
  meta: PolyRouterPriceHistoryMeta;
}

export interface GetPriceHistoryParams {
  market_ids: string; // Comma-separated list, required
  start_ts?: number; // Unix timestamp, default: 1759333191
  end_ts?: number; // Unix timestamp, default: 1760283591
  interval?: '1m' | '5m' | '1h' | '4h' | '1d'; // default: '1d'
  limit?: number; // default: 10, range: 1-5000
}

// Trades
export interface PolyRouterTrade {
  trade_id: string;
  platform: string;
  market_id: string;
  timestamp: number;
  size: number;
  price: number;
  side: 'buy' | 'sell';
  yes_price: number;
  no_price: number;
  metadata?: Record<string, any>;
}

export interface PolyRouterTradesData {
  trades: PolyRouterTrade[];
  pagination: {
    total: number;
    limit: number;
    has_more: boolean;
    next_cursor?: string;
  };
  meta: {
    market_id: string;
    platform: string;
    request_time: number;
  };
}

export interface PolyRouterTradesResponse {
  data: PolyRouterTradesData;
  meta: {
    request_time: number;
  };
}

export interface GetTradesParams {
  market_id: string; // required
  limit?: number; // default: 100, range: 1-1000
  cursor?: string;
}

// Games
export interface PolyRouterGameTeam {
  abbreviation: string;
  name: string;
}

export interface PolyRouterGameTournament {
  id: number;
  name: string;
}

export interface PolyRouterGame {
  polyrouter_id?: string;
  id?: string; // For details endpoint
  prophetx_event_id?: number;
  title: string;
  teams?: string[]; // For details endpoint
  away_team?: PolyRouterGameTeam;
  home_team?: PolyRouterGameTeam;
  sport?: string;
  league?: string;
  description?: string;
  scheduled_at?: string;
  status?: 'not_started' | 'live' | 'finished' | 'scheduled';
  tournament?: PolyRouterGameTournament;
  markets?: Array<{
    platform: string;
    event_id: string;
    outcomes: Array<{
      name: string;
      price: number;
      volume: number;
      status: string;
    }>;
    metadata?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

export interface PolyRouterGamesResponse {
  games: PolyRouterGame[];
  pagination: PolyRouterPagination;
  meta: PolyRouterMeta;
}

export interface GetGamesListParams {
  league: 'nfl' | 'nba' | 'nhl' | 'mlb'; // required
  status?: 'not_started' | 'live' | 'finished';
}

export interface GetGameByIdParams {
  platform?: string; // Comma-separated: polymarket, kalshi, prophetx, novig, sxbet
  market_type?: 'moneyline' | 'spread' | 'total' | 'prop';
}

// Awards
export interface PolyRouterAwardCandidate {
  player_name: string;
  team_polyrouter_id: string;
  odds: {
    american: string;
    decimal: number;
    implied_probability: number;
  };
  volume_24h: number;
  last_trade_price: number;
  metadata?: Record<string, any>;
}

export interface PolyRouterAwardMarket {
  platform: string;
  market_id: string;
  candidates: PolyRouterAwardCandidate[];
}

export interface PolyRouterAward {
  id: string;
  award_name: string;
  league: string;
  season: number;
  award_type: string;
  platforms?: string[]; // For list endpoint
  markets?: PolyRouterAwardMarket[]; // For details endpoint
  metadata?: {
    deadline?: string;
    description?: string;
    eligibility?: string;
  };
}

export interface PolyRouterAwardsListData {
  awards: PolyRouterAward[];
  pagination: PolyRouterPagination;
  meta: {
    league?: string;
    data_freshness?: string;
  };
}

export interface PolyRouterAwardsListResponse {
  data: PolyRouterAwardsListData;
  meta: PolyRouterMeta;
}

export interface PolyRouterAwardsDetailResponse {
  awards: PolyRouterAward[];
  pagination?: PolyRouterPagination;
  meta?: PolyRouterMeta;
}

export interface GetAwardsListParams {
  league: 'nfl' | 'nba' | 'nhl' | 'mlb'; // required
  award_type?: string;
  season?: number; // default: 2025
}

export interface GetAwardByIdParams {
  platform?: string; // Comma-separated: polymarket, kalshi
  odds_format?: 'american' | 'decimal' | 'probability'; // default: 'american'
}

// Futures
export interface PolyRouterFutureOutcome {
  team_polyrouter_id: string;
  outcome_name: string;
  odds: {
    american: string;
    decimal: number;
    implied_probability: number;
  };
  volume_24h: number;
  last_trade_price: number;
  metadata?: Record<string, any>;
}

export interface PolyRouterFutureMarket {
  platform: string;
  market_id: string;
  outcomes: PolyRouterFutureOutcome[];
}

export interface PolyRouterFuture {
  id: string;
  future_name: string;
  league: string;
  season: number;
  future_type: string;
  category: string;
  platforms?: string[]; // For list endpoint
  markets?: PolyRouterFutureMarket[]; // For details endpoint
  metadata?: {
    deadline?: string;
    description?: string;
    eligible_teams?: string[];
  };
}

export interface PolyRouterFuturesListData {
  futures: PolyRouterFuture[];
  pagination: PolyRouterPagination;
  meta: {
    league?: string;
    data_freshness?: string;
  };
}

export interface PolyRouterFuturesListResponse {
  data: PolyRouterFuturesListData;
  meta: PolyRouterMeta;
}

export interface PolyRouterFuturesDetailResponse {
  futures: PolyRouterFuture[];
  pagination?: PolyRouterPagination;
  meta?: PolyRouterMeta;
}

export interface GetFuturesListParams {
  league: 'nfl' | 'nba' | 'nhl' | 'mlb'; // required
  future_type?: 'championship' | 'division' | 'conference';
  season?: number; // default: 2025
}

export interface GetFutureByIdParams {
  platform?: string; // Comma-separated: polymarket, kalshi
  odds_format?: 'american' | 'decimal' | 'probability'; // default: 'american'
}

// League Info
export interface PolyRouterLeagueSeason {
  year: number;
  start_date: string;
  end_date: string;
}

export interface PolyRouterLeague {
  id: string;
  name: string;
  abbreviation: string;
  sport: string;
  season: PolyRouterLeagueSeason;
  teams: any[];
}

export interface PolyRouterLeagueInfoResponse {
  leagues: PolyRouterLeague[];
  meta: PolyRouterMeta;
}

export interface GetLeagueInfoParams {
  league?: 'nfl' | 'nba' | 'nhl' | 'mlb'; // Optional, returns all if not specified
}

