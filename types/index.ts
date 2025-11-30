export type Platform = "polymarket" | "manifold" | "kalshi";

export interface PlatformInfo {
  id: Platform;
  name: string;
  logo?: string;
  url: string;
}

// Изменения цен за период
export interface PriceChanges {
  yes?: {
    price?: number;
    percent?: number;
  };
  no?: {
    price?: number;
    percent?: number;
  };
}

// Последние сделки
export interface LastTrade {
  trade_id?: string;
  timestamp?: number;
  size?: number;
  price?: number;
  side?: 'buy' | 'sell';
  yes_price?: number;
  no_price?: number;
}

export interface Market {
  id: string;
  platform: Platform;
  originalTitle: string;
  probability: number; // 0-100
  volume?: number;
  liquidity?: number;
  link: string;
  updatedAt?: string;
  eventId?: string; // ID события из PolyRouter (для точного матчинга)
  eventName?: string; // Название события из PolyRouter
  category?: string; // Категория из PolyRouter
  // Дополнительные поля из API
  price_24h_changes?: PriceChanges;
  price_7d_changes?: PriceChanges;
  last_trades?: LastTrade[];
  withdrawal_fee?: number;
  fee_rate?: number;
  trading_fee?: number;
  open_interest?: number;
  unique_traders?: number;
  volume_24h?: number;
  volume_7d?: number;
  liquidity_score?: number;
  // Текущие цены bid/ask
  current_prices?: {
    yes?: {
      price?: number;
      bid?: number;
      ask?: number;
    };
    no?: {
      price?: number;
      bid?: number;
      ask?: number;
    };
  };
}

export interface Event {
  id: string;
  normalizedTitle: string;
  description?: string;
  category: string;
  tags: string[];
  resolutionDate?: string;
  markets: Market[];
}

export interface Match {
  eventId: string;
  event: Event;
  minProbability: number;
  maxProbability: number;
  spread: number; // max - min
  platformsCount: number;
  dataType?: 'market' | 'event' | 'series' | 'game' | 'award' | 'future'; // Тип данных для определения правильного URL
}

