"use client";

import { Match } from "@/types";
import { formatProbability, formatSpread } from "@/utils/calculations";
import Link from "next/link";

interface EventCardProps {
  match: Match;
}

export const EventCard = ({ match }: EventCardProps) => {
  const { event, minProbability, maxProbability, spread, platformsCount } =
    match;

  return (
    <Link href={`/event/${event.id}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {event.normalizedTitle}
        </h3>
        <div className="flex items-center space-2 mb-3">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {event.category}
          </span>
          <span className="text-xs text-gray-500">
            {platformsCount} платформ
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <div>
              <span className="text-xs text-gray-500 mr-1">Мин:</span>
              <span className="text-sm font-medium text-red-600">
                {formatProbability(minProbability)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 mr-1">Макс:</span>
              <span className="text-sm font-medium text-teal-600">
                {formatProbability(maxProbability)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 mr-1">Spread:</span>
            <span className="text-sm font-bold text-orange-600">
              {formatSpread(spread)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

