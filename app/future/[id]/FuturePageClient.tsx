"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Platform } from "@/types";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PlatformFilter } from "@/components/PlatformFilter";
import { formatProbability, formatSpread } from "@/utils/calculations";
import { useQuery } from "@tanstack/react-query";

interface FuturePageClientProps {
  futureId: string;
}

async function fetchFutureDetail(id: string) {
  const response = await fetch(`/api/polyrouter/futures/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch future');
  }
  return response.json();
}

export default function FuturePageClient({ futureId }: FuturePageClientProps) {
  const router = useRouter();
  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<Platform>>(
    () => new Set(["polymarket", "manifold", "kalshi"])
  );

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['future', futureId],
    queryFn: () => fetchFutureDetail(futureId),
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
          <p className="mt-2 text-gray-600">Загрузка данных фьючерса...</p>
        </div>
      </div>
    );
  }

  if (error || !response?.futures || response.futures.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Ошибка загрузки фьючерса</p>
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

  const future = response.futures[0];
  
  // Преобразуем future в формат Event для совместимости
  const markets = future.markets?.flatMap((m: any) => 
    m.outcomes?.map((outcome: any) => ({
      id: `${future.id}-${m.platform}-${outcome.outcome_name}`,
      platform: m.platform as Platform,
      originalTitle: `${future.future_name} - ${outcome.outcome_name}`,
      probability: outcome.odds?.implied_probability ? outcome.odds.implied_probability * 100 : 0,
      volume: outcome.volume_24h,
      link: `#`,
      updatedAt: new Date().toISOString(),
      eventId: future.id,
      eventName: future.future_name,
      category: future.league || 'Sports',
    })) || []
  ) || [];

  const event = {
    id: future.id,
    normalizedTitle: future.future_name,
    description: future.metadata?.description,
    category: future.league || 'Sports',
    tags: [],
    markets,
  };

  const probabilities = markets.map((m: any) => m.probability).filter((p: number) => p > 0);
  const minProb = probabilities.length > 0 ? Math.min(...probabilities) : 0;
  const maxProb = probabilities.length > 0 ? Math.max(...probabilities) : 0;
  const spread = maxProb - minProb;

  const availablePlatforms = Array.from(
    new Set(markets.map((m: any) => m.platform))
  ) as Platform[];

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
            {future.future_name}
          </h1>
          {future.metadata?.description && (
            <p className="text-gray-600 mb-4">{future.metadata.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500 mr-2">Лига:</span>
              <span className="font-medium">{future.league}</span>
            </div>
            <div>
              <span className="text-gray-500 mr-2">Сезон:</span>
              <span className="font-medium">{future.season}</span>
            </div>
            <div>
              <span className="text-gray-500 mr-2">Тип:</span>
              <span className="font-medium">{future.future_type}</span>
            </div>
            <div>
              <span className="text-gray-500 mr-2">Категория:</span>
              <span className="font-medium">{future.category}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Резюме mispricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Максимальная вероятность</div>
              <div className="text-2xl font-bold text-green-600">
                {formatProbability(maxProb)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Минимальная вероятность</div>
              <div className="text-2xl font-bold text-red-600">
                {formatProbability(minProb)}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Spread</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatSpread(spread)}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <PlatformFilter
            platforms={availablePlatforms}
            selected={visiblePlatforms}
            onChange={handlePlatformToggle}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Сравнение исходов
          </h2>
          <ComparisonTable event={event} visiblePlatforms={visiblePlatforms} />
        </div>
      </div>
    </div>
  );
}

