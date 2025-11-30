import { useQuery } from '@tanstack/react-query';

interface PlatformEndpoint {
  markets?: boolean;
  events?: boolean;
  series?: boolean;
  search?: boolean;
  price_history?: boolean;
}

interface PlatformFeature {
  status_filtering?: boolean;
  date_filtering?: boolean;
  pagination_type?: string;
  market_types?: string[];
}

interface Platform {
  platform: string;
  displayName: string;
  endpoints: PlatformEndpoint;
  features: PlatformFeature;
}

interface PlatformsResponse {
  data: Platform[];
  source: string;
  total: number;
  error?: string;
}

async function fetchPlatforms(): Promise<PlatformsResponse> {
  const response = await fetch('/api/polyrouter/platforms');
  if (!response.ok) {
    throw new Error(`Failed to fetch platforms: ${response.statusText}`);
  }
  return response.json();
}

export function usePlatforms() {
  return useQuery<PlatformsResponse, Error>({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
  });
}

