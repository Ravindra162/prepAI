import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, BookOpen, Clock, Target, ExternalLink } from 'lucide-react';
import { SheetCard } from '../components/SheetCard';
import { Pagination } from '../components/Pagination';
import { useProblemContext } from '../contexts/ProblemContext';

export const Sheets: React.FC = () => {
  const { sheets, loading, error, pagination, filters, refreshSheets } = useProblemContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchParamsRef = useRef<string>('');

  // Create a stable search function that doesn't change on every render
  const performSearch = useCallback(async (searchValue: string, difficulty: string, tag: string, page: number = 1) => {
    const searchParams = JSON.stringify({ searchValue, difficulty, tag, page });
    
    // Prevent duplicate searches
    if (searchParams === lastSearchParamsRef.current && !loading) {
      return;
    }
    
    lastSearchParamsRef.current = searchParams;
    setIsSearching(true);
    
    try {
      await refreshSheets({
        page,
        limit: 20,
        search: searchValue.trim() || undefined,
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        tags: tag !== 'all' ? tag : undefined,
      });
    } finally {
      setIsSearching(false);
    }
  }, [refreshSheets, loading]);

  // Debounced search for input changes
  const debouncedSearch = useCallback((searchValue: string, difficulty: string, tag: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      performSearch(searchValue, difficulty, tag, 1);
    }, 500);
  }, [performSearch]);

  // Handle search input change
  useEffect(() => {
    debouncedSearch(searchTerm, selectedDifficulty, selectedTag);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, selectedDifficulty, selectedTag, debouncedSearch]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page === currentPage || isSearching) {
      return; // Prevent duplicate page changes
    }
    
    setCurrentPage(page);
    performSearch(searchTerm, selectedDifficulty, selectedTag, page);
  }, [currentPage, isSearching, performSearch, searchTerm, selectedDifficulty, selectedTag]);

  const clearFilters = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setSearchTerm('');
    setSelectedDifficulty('all');
    setSelectedTag('all');
    setCurrentPage(1);
    lastSearchParamsRef.current = '';
    
    // Immediately perform search with cleared filters
    performSearch('', 'all', 'all', 1);
  }, [performSearch]);

  if (loading && !sheets.length) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading DSA sheets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Sheets</div>
          <p className="text-slate-600 mb-4">{error}</p>
          <button 
            onClick={() => refreshSheets()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-800">DSA Practice / Company-wise Sheets</h1>
        <p className="text-xl text-slate-600">Curated problem sets to master Data Structures & Algorithms</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sheets by title, description, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2 gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              {filters?.difficulties?.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Tags</option>
              {filters?.tags?.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            {(searchTerm || selectedDifficulty !== 'all' || selectedTag !== 'all') && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results summary */}
        {pagination && !isSearching && (
          <div className="mt-4 text-sm text-slate-600">
            Showing {sheets.length > 0 ? ((pagination.currentPage - 1) * 20) + 1 : 0} - {Math.min(pagination.currentPage * 20, pagination.totalSheets)} of {pagination.totalSheets} sheets
          </div>
        )}
        
        {isSearching && (
          <div className="mt-4 text-sm text-blue-600">
            Searching...
          </div>
        )}
      </div>

      {/* Sheets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sheets.map((sheet) => (
          <SheetCard key={sheet.id} sheet={sheet} />
        ))}
      </div>

      {/* Empty State */}
      {sheets.length === 0 && !loading && !isSearching && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">No sheets found</h3>
          <p className="text-slate-500">Try adjusting your search or filter criteria</p>
          {(searchTerm || selectedDifficulty !== 'all' || selectedTag !== 'all') && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Loading overlay for search */}
      {isSearching && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-slate-600">Searching...</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && !isSearching && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          className="mt-8"
        />
      )}
    </div>
  );
};