"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Platform } from "@/types";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PlatformFilter } from "@/components/PlatformFilter";
import { formatProbability, formatSpread, formatDate } from "@/utils/calculations";
import { useQuery } from "@tanstack/react-query";

interface GamePageClientProps {
  gameId: string;
}

async function fetchGameDetail(id: string) {
  const response = await fetch(`/api/polyrouter/games/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch game');
  }
  return response.json();
}

export default function GamePageClient({ gameId }: GamePageClientProps) {
  const router = useRouter();
  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<Platform>>(
    () => new Set(["polymarket", "manifold", "kalshi"])
  );

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => fetchGameDetail(gameId),
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
          <p className="mt-2 text-gray-600">Загрузка данных игры...</p>
        </div>
      </div>
    );
  }

  // API возвращает { data: Match, game: rawGame }
  const match = response?.data;
  const rawGame = response?.game;

  if (error || !match || !match.event || !match.event.markets || match.event.markets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error ? `Ошибка загрузки игры: ${error.message}` : 'Игра не найдена или не содержит рынков'}
          </p>
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

  // Используем данные из Match формата
  const event = match.event;
  const game = rawGame || {
    id: event.id,
    title: event.normalizedTitle,
    description: event.description,
    league: event.category,
    scheduled_at: undefined,
    status: undefined,
    teams: undefined,
  };
  
  // Используем markets из Match
  const markets = event.markets;
  const probabilities = markets.map((m: any) => m.probability).filter((p: number) => p > 0 && p !== undefined);
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
            {game.title}
          </h1>
          {game.description && (
            <p className="text-gray-600 mb-4">{game.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500 mr-2">Лига:</span>
              <span className="font-medium">{game.league}</span>
            </div>
            {game.scheduled_at && (
              <div>
                <span className="text-gray-500 mr-2">Запланировано:</span>
                <span className="font-medium">{formatDate(game.scheduled_at)}</span>
              </div>
            )}
            {game.status && (
              <div>
                <span className="text-gray-500 mr-2">Статус:</span>
                <span className="font-medium">{game.status}</span>
              </div>
            )}
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
            Сравнение рынков
          </h2>
          <ComparisonTable event={event} visiblePlatforms={visiblePlatforms} />
        </div>
      </div>
    </div>
  );
}

