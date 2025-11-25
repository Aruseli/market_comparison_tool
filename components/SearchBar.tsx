"use client";

import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  value: string;
}

export const SearchBar = ({ onSearch, value }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск событий (например: Trump, Bitcoin, Fed...)"
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-600 focus:border-transparent outline-none"
        />
        <svg
          className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </form>
  );
};

