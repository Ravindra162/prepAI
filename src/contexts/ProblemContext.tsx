import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { sheetsAPI, problemsAPI, progressAPI } from '../services/api';

interface Problem {
  id: string;
  step_no: number;
  sl_no_in_step: number;
  head_step_no: string;
  title: string;
  post_link: string;
  yt_link: string;
  cs_link: string;
  gfg_link: string;
  lc_link: string;
  company_tags: string | null;
  difficulty: number;
  ques_topic: string;
  plus_link: string | null;
  editorial_link: string | null;
  topics: string[];
  solved: boolean;
  bookmarked: boolean;
}

interface Sheet {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  problems: Problem[];
  solved: number;
  estimatedTime: string;
  author: string;
  tags: string[];
  problemCount?: number;
}

interface ProblemContextType {
  sheets: Sheet[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalSheets: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  filters: {
    difficulties: string[];
    tags: string[];
  } | null;
  getSheetById: (id: string) => Sheet | undefined;
  fetchSheetWithProblems: (id: string) => Promise<Sheet | null>;
  toggleProblemSolved: (sheetId: string, problemId: string) => Promise<void>;
  toggleProblemBookmarked: (sheetId: string, problemId: string) => Promise<void>;
  refreshSheets: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    difficulty?: string;
    tags?: string;
  }) => Promise<void>;
  loadFilters: () => Promise<void>;
}

const ProblemContext = createContext<ProblemContextType | undefined>(undefined);

export const ProblemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    totalPages: number;
    totalSheets: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);
  const [filters, setFilters] = useState<{
    difficulties: string[];
    tags: string[];
  } | null>(null);

  const loadFilters = useCallback(async () => {
    try {
      const filtersData = await sheetsAPI.getFilterOptions();
      setFilters(filtersData);
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  }, []);

  const refreshSheets = useCallback(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    difficulty?: string;
    tags?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch sheets from API with pagination and filters
      const response = await sheetsAPI.getAllSheets(params);
      const sheetsData = response.sheets || [];
      
      // Set pagination info
      setPagination(response.pagination || null);
      
      // Transform API data to match our interface
      const transformedSheets: Sheet[] = sheetsData.map((sheet: any) => {
        try {
          // For the sheet listing page, we don't need to fetch individual problems
          // We'll only fetch problems when viewing a specific sheet
          return {
            id: sheet.id,
            title: sheet.title || 'Untitled Sheet',
            description: sheet.description || 'No description available',
            difficulty: sheet.difficulty || 'intermediate',
            problems: [], // Empty for listing view
            solved: 0, // Will be populated from sheet progress if needed
            estimatedTime: sheet.estimated_time || 'Not specified',
            author: sheet.author || 'Unknown',
            tags: Array.isArray(sheet.tags) ? sheet.tags : [],
            problemCount: sheet.problemCount || 0 // Add problem count from backend
          };
        } catch (sheetError) {
          console.error(`Error processing sheet ${sheet.id}:`, sheetError);
          return {
            id: sheet.id,
            title: sheet.title || 'Untitled Sheet',
            description: sheet.description || 'No description available',
            difficulty: sheet.difficulty || 'intermediate',
            problems: [],
            solved: 0,
            estimatedTime: sheet.estimated_time || 'Not specified',
            author: sheet.author || 'Unknown',
            tags: Array.isArray(sheet.tags) ? sheet.tags : [],
            problemCount: 0
          };
        }
      });
      
      setSheets(transformedSheets);
    } catch (err) {
      console.error('Error fetching sheets:', err);
      setError('Failed to load sheets. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSheets();
    loadFilters();
  }, []);

  const getSheetById = (id: string) => {
    return sheets.find(sheet => sheet.id === id);
  };

  const fetchSheetWithProblems = useCallback(async (id: string): Promise<Sheet | null> => {
    try {
      const response = await sheetsAPI.getSheetById(id);
      
      if (!response) {
        return null;
      }

      const sheet = response;
      const problems = sheet.problems || [];

      const transformedSheet: Sheet = {
        id: sheet.id,
        title: sheet.title || 'Untitled Sheet',
        description: sheet.description || 'No description available',
        difficulty: sheet.difficulty || 'intermediate',
        problems: problems.map((problem: any) => ({
          id: problem.id,
          step_no: problem.step_no || 1,
          sl_no_in_step: problem.sl_no_in_step || 1,
          head_step_no: problem.head_step_no || 'General',
          title: problem.title,
          post_link: problem.post_link || '',
          yt_link: problem.yt_link || '',
          cs_link: problem.cs_link || '',
          gfg_link: problem.gfg_link || '',
          lc_link: problem.lc_link || '',
          company_tags: problem.company_tags,
          difficulty: problem.difficulty || 1,
          ques_topic: problem.ques_topic || '[]',
          plus_link: problem.plus_link,
          editorial_link: problem.editorial_link,
          topics: (() => {
            try {
              if (typeof problem.ques_topic === 'string') {
                const parsed = JSON.parse(problem.ques_topic);
                return Array.isArray(parsed) ? parsed.map((t: any) => t.label || t.value || t) : [];
              } else if (Array.isArray(problem.ques_topic)) {
                return problem.ques_topic.map((t: any) => t.label || t.value || t);
              }
              return [];
            } catch {
              return [];
            }
          })(),
          solved: problem.solved || problem.user_status === 'solved' || false,
          bookmarked: problem.bookmarked || problem.user_status === 'bookmarked' || false
        })),
        solved: problems.filter((p: any) => p.solved || p.user_status === 'solved').length,
        estimatedTime: sheet.estimated_time || 'Not specified',
        author: sheet.author || 'Unknown',
        tags: Array.isArray(sheet.tags) ? sheet.tags : [],
        problemCount: problems.length
      };

      // Update the sheet in the sheets array if it exists
      setSheets(prevSheets => 
        prevSheets.map(s => s.id === id ? transformedSheet : s)
      );

      return transformedSheet;
    } catch (err) {
      console.error('Error fetching sheet with problems:', err);
      return null;
    }
  }, []);

  const toggleProblemSolved = async (sheetId: string, problemId: string) => {
    try {
      // Find current problem state
      const sheet = sheets.find(s => s.id === sheetId);
      const problem = sheet?.problems.find(p => p.id === problemId);
      
      if (!problem) {
        console.error('Problem not found');
        return;
      }

      const newSolvedState = !problem.solved;

      // Optimistically update UI
      setSheets(prevSheets =>
        prevSheets.map(sheet => {
          if (sheet.id === sheetId) {
            const updatedProblems = sheet.problems.map(problem =>
              problem.id === problemId
                ? { ...problem, solved: newSolvedState }
                : problem
            );
            const solvedCount = updatedProblems.filter(p => p.solved).length;
            return {
              ...sheet,
              problems: updatedProblems,
              solved: solvedCount
            };
          }
          return sheet;
        })
      );

      // Make backend request
      await problemsAPI.toggleComplete(problemId, newSolvedState, sheetId);
      
    } catch (error) {
      console.error('Failed to update problem status:', error);
      
      // Revert optimistic update on error
      setSheets(prevSheets =>
        prevSheets.map(sheet => {
          if (sheet.id === sheetId) {
            const updatedProblems = sheet.problems.map(problem =>
              problem.id === problemId
                ? { ...problem, solved: !problem.solved } // Revert
                : problem
            );
            const solvedCount = updatedProblems.filter(p => p.solved).length;
            return {
              ...sheet,
              problems: updatedProblems,
              solved: solvedCount
            };
          }
          return sheet;
        })
      );
    }
  };

  const toggleProblemBookmarked = async (sheetId: string, problemId: string) => {
    try {
      // Find current problem state
      const sheet = sheets.find(s => s.id === sheetId);
      const problem = sheet?.problems.find(p => p.id === problemId);
      
      if (!problem) {
        console.error('Problem not found');
        return;
      }

      const newBookmarkedState = !problem.bookmarked;

      // Optimistically update UI
      setSheets(prevSheets =>
        prevSheets.map(sheet =>
          sheet.id === sheetId
            ? {
                ...sheet,
                problems: sheet.problems.map(problem =>
                  problem.id === problemId
                    ? { ...problem, bookmarked: newBookmarkedState }
                    : problem
                )
              }
            : sheet
        )
      );

      // Make backend request using progress API
      const status = newBookmarkedState ? 'bookmarked' : 'not_started';
      await progressAPI.updateProgress(problemId, sheetId, status);
      
    } catch (error) {
      console.error('Failed to update bookmark status:', error);
      
      // Revert optimistic update on error
      setSheets(prevSheets =>
        prevSheets.map(sheet =>
          sheet.id === sheetId
            ? {
                ...sheet,
                problems: sheet.problems.map(problem =>
                  problem.id === problemId
                    ? { ...problem, bookmarked: !problem.bookmarked } // Revert
                    : problem
                )
              }
            : sheet
        )
      );
    }
  };

  return (
    <ProblemContext.Provider value={{
      sheets,
      loading,
      error,
      pagination,
      filters,
      getSheetById,
      fetchSheetWithProblems,
      toggleProblemSolved,
      toggleProblemBookmarked,
      refreshSheets,
      loadFilters
    }}>
      {children}
    </ProblemContext.Provider>
  );
};

export const useProblemContext = () => {
  const context = useContext(ProblemContext);
  if (context === undefined) {
    throw new Error('useProblemContext must be used within a ProblemProvider');
  }
  return context;
};