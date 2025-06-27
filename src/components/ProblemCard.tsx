import React, { useState } from 'react';
import { ExternalLink, CheckCircle, Circle, Bookmark, BookmarkCheck, Clock } from 'lucide-react';
import { useProblemContext } from '../contexts/ProblemContext';

interface Problem {
  id: string;
  title: string;
  difficulty: number;
  topics: string[];
  lc_link: string;
  yt_link: string;
  solved: boolean;
  bookmarked: boolean;
}

interface ProblemCardProps {
  problem: Problem;
  index: number;
  sheetId: string;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({ problem, index, sheetId }) => {
  const { toggleProblemSolved, toggleProblemBookmarked } = useProblemContext();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleToggleSolved = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await toggleProblemSolved(sheetId, problem.id);
    } catch (error) {
      console.error('Failed to toggle problem solved status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleBookmarked = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await toggleProblemBookmarked(sheetId, problem.id);
    } catch (error) {
      console.error('Failed to toggle problem bookmark status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 0: return 'bg-green-100 text-green-800';
      case 1: return 'bg-orange-100 text-orange-800';
      case 2: return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getDifficultyText = (difficulty: number) => {
    switch (difficulty) {
      case 0: return 'Easy';
      case 1: return 'Medium';
      case 2: return 'Hard';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 ${
      problem.solved ? 'ring-2 ring-green-200' : ''
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-slate-500">#{index}</span>
          <button
            onClick={handleToggleSolved}
            disabled={isUpdating}
            className={`text-slate-400 hover:text-green-500 transition-colors ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {problem.solved ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
          <h3 className={`text-lg font-semibold ${
            problem.solved ? 'text-green-700' : 'text-slate-800'
          }`}>
            {problem.title}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
            {getDifficultyText(problem.difficulty)}
          </div>
          <button
            onClick={handleToggleBookmarked}
            disabled={isUpdating}
            className={`text-slate-400 hover:text-blue-500 transition-colors ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {problem.bookmarked ? (
              <BookmarkCheck className="w-5 h-5 text-blue-500" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {problem.topics.map((topic) => (
          <span key={topic} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">
            {topic}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <a
            href={problem.lc_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>LeetCode</span>
          </a>
          {/* {problem.yt_link && (
            <a
              href={problem.yt_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>YouTube</span>
            </a>
          )} */}
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Clock className="w-4 h-4" />
          <span>30-45 min</span>
        </div>
      </div>
    </div>
  );
};