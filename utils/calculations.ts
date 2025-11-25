import { Event, Match } from "@/types";

export function calculateMatch(event: Event): Match {
  const probabilities = event.markets.map((m) => m.probability);
  const minProbability = Math.min(...probabilities);
  const maxProbability = Math.max(...probabilities);
  const spread = maxProbability - minProbability;
  const platformsCount = new Set(event.markets.map((m) => m.platform)).size;

  return {
    eventId: event.id,
    event,
    minProbability,
    maxProbability,
    spread,
    platformsCount,
  };
}

export function formatProbability(prob: number): string {
  return `${prob.toFixed(1)}%`;
}

export function formatSpread(spread: number): string {
  return `${spread.toFixed(1)} п.п.`;
}

export function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    polymarket: "Polymarket",
    manifold: "Manifold",
    kalshi: "Kalshi",
  };
  return names[platform] || platform;
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    polymarket: "bg-blue-100 text-blue-800",
    manifold: "bg-purple-100 text-purple-800",
    kalshi: "bg-green-100 text-green-800",
  };
  return colors[platform] || "bg-gray-100 text-gray-800";
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

