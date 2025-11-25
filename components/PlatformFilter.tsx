"use client";

import { Platform } from "@/types";
import { getPlatformName } from "@/utils/calculations";

interface PlatformFilterProps {
  platforms: Platform[];
  selected: Set<Platform>;
  onChange: (platform: Platform, checked: boolean) => void;
}

export const PlatformFilter = ({
  platforms,
  selected,
  onChange,
}: PlatformFilterProps) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Показать платформы:
      </h3>
      <div className="flex flex-wrap gap-3">
        {platforms.map((platform) => (
          <label
            key={platform}
            className="flex items-center cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(platform)}
              onChange={(e) => onChange(platform, e.target.checked)}
              className="size-4 text-teal-600 border-gray-300 rounded focus:ring-teal-600"
            />
            <span className="ml-2 text-sm text-gray-700">
              {getPlatformName(platform)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

