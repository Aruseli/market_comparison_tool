"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Platform } from "@/types";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PlatformFilter } from "@/components/PlatformFilter";
import { formatProbability, formatSpread, formatDate } from "@/utils/calculations";
import { useQuery } from "@tanstack/react-query";

interface MarketPageClientProps {
  marketId: string;
}

async function fetchMarketDetail(id: string) {
  const response = await fetch(`/api/polyrouter/markets/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch market');
  }
  return response.json();
}

export default function MarketPageClient({ marketId }: MarketPageClientProps) {
  const router = useRouter();
  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<Platform>>(
    () => new Set(["polymarket", "manifold", "kalshi"])
  );

  const { data: market, isLoading, error } = useQuery({
    queryKey: ['market', marketId],
    queryFn: () => fetchMarketDetail(marketId),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  useEffect(() => {
    loadPlatformPreferences();
  }, []);

  const loadPlatformPreferences = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("visiblePlatforms");
      if (saved) {
        try {
          const platforms = JSON.parse(saved) as Platform[];
          setVisiblePlatforms(new Set(platforms));
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  };

  const handlePlatformToggle = (platform: Platform, checked: boolean) => {
    const newSet = new Set(visiblePlatforms);
    if (checked) {
      newSet.add(platform);
    } else {
      newSet.delete(platform);
    }
    setVisiblePlatforms(newSet);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "visiblePlatforms",
        JSON.stringify(Array.from(newSet))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-2 text-gray-600">Загрузка данных рынка...</p>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Ошибка загрузки рынка</p>
          <button
            onClick={() => router.push("/")}
            className="text-teal-600 hover:text-teal-900"
          >
            ← Назад к списку
          </button>
        </div>
      </div>
    );
  }

  // Преобразуем market в формат Event для совместимости с ComparisonTable
  const event = {
    id: market.id,
    normalizedTitle: market.originalTitle || market.title || 'Рынок',
    description: market.description,
    category: market.category || 'Другое',
    tags: [],
    markets: [market],
  };

  const probabilities = [market.probability || 0];
  const minProb = Math.min(...probabilities);
  const maxProb = Math.max(...probabilities);
  const spread = maxProb - minProb;

  const availablePlatforms = [market.platform] as Platform[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-teal-600 hover:text-teal-900 flex items-center"
          >
            ← Назад к списку событий
          </button>
          <div className="text-sm text-gray-500">
            Источник: <span className="font-medium text-green-600">PolyRouter API</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {event.normalizedTitle}
          </h1>
          {event.description && (
            <p className="text-gray-600 mb-4">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500 mr-2">Категория:</span>
              <span className="font-medium">{event.category}</span>
            </div>
            <div>
              <span className="text-gray-500 mr-2">Платформа:</span>
              <span className="font-medium">{market.platform}</span>
            </div>
            {market.updatedAt && (
              <div>
                <span className="text-gray-500 mr-2">Обновлено:</span>
                <span className="font-medium">{formatDate(market.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Информация о рынке
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Вероятность</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatProbability(market.probability || 0)}
              </div>
            </div>
            {market.volume && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Объем</div>
                <div className="text-2xl font-bold text-purple-600">
                  ${market.volume.toLocaleString()}
                </div>
              </div>
            )}
            {market.liquidity && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Ликвидность</div>
                <div className="text-2xl font-bold text-indigo-600">
                  ${market.liquidity.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {market.link && (
          <div className="mb-6">
            <a
              href={market.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Открыть на платформе →
            </a>
          </div>
        )}

        <div className="mb-6">
          <PlatformFilter
            platforms={availablePlatforms}
            selected={visiblePlatforms}
            onChange={handlePlatformToggle}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Детали рынка
          </h2>
          <ComparisonTable event={event} visiblePlatforms={visiblePlatforms} />
        </div>
      </div>
    </div>
  );
}

