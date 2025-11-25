export type Platform = "polymarket" | "manifold" | "kalshi";

export interface PlatformInfo {
  id: Platform;
  name: string;
  logo?: string;
  url: string;
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
}

