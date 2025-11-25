"use client";

import { Event, Market, Platform } from "@/types";
import { formatProbability, getPlatformName, getPlatformColor } from "@/utils/calculations";

interface ComparisonTableProps {
  event: Event;
  visiblePlatforms: Set<Platform>;
}

export const ComparisonTable = ({
  event,
  visiblePlatforms,
}: ComparisonTableProps) => {
  const visibleMarkets = event.markets.filter((m) =>
    visiblePlatforms.has(m.platform)
  );

  if (visibleMarkets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Выберите хотя бы одну платформу для отображения
      </div>
    );
  }

  const probabilities = visibleMarkets.map((m) => m.probability);
  const minProb = Math.min(...probabilities);
  const maxProb = Math.max(...probabilities);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Платформа
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Название рынка
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
              Вероятность
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
              Спред
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
              Ссылка
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {visibleMarkets.map((market) => {
            const isMin = market.probability === minProb;
            const isMax = market.probability === maxProb;
            const spread = isMax
              ? `+${(market.probability - minProb).toFixed(1)}% vs min`
              : isMin
              ? `${(market.probability - maxProb).toFixed(1)}% vs max`
              : `${market.probability > (minProb + maxProb) / 2 ? "+" : ""}${(market.probability - (minProb + maxProb) / 2).toFixed(1)}%`;

            return (
              <tr
                key={market.id}
                className={`hover:bg-gray-50 ${
                  isMin ? "bg-red-50" : isMax ? "bg-green-50" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getPlatformColor(
                      market.platform
                    )}`}
                  >
                    {getPlatformName(market.platform)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {market.originalTitle}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-sm font-semibold ${
                      isMin
                        ? "text-red-600"
                        : isMax
                        ? "text-green-600"
                        : "text-gray-700"
                    }`}
                  >
                    {formatProbability(market.probability)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">
                  {spread}
                </td>
                <td className="px-4 py-3 text-center">
                  <a
                    href={market.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                  >
                    Open →
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

