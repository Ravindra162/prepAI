import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Target, ExternalLink, User } from 'lucide-react';

interface Sheet {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  problems: any[];
  solved: number;
  estimatedTime: string;
  author: string;
  tags: string[];
}

interface SheetCardProps {
  sheet: Sheet;
}

export const SheetCard: React.FC<SheetCardProps> = ({ sheet }) => {
  const progressPercentage = (sheet.solved / sheet.problems.length) * 100;
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-orange-100 text-orange-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">{sheet.title}</h3>
          <p className="text-slate-600 text-sm mb-3">{sheet.description}</p>
          <div className="flex items-center space-x-2 mb-3">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">{sheet.author}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(sheet.difficulty)}`}>
          {sheet.difficulty}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Progress</span>
          <span className="font-medium text-slate-800">{sheet.solved}/{sheet.problems.length}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
        <div className="flex items-center space-x-1">
          <Clock className="w-4 h-4" />
          <span>{sheet.estimatedTime}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Target className="w-4 h-4" />
          <span>{sheet.problems.length} problems</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {sheet.tags.map((tag) => (
          <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
            {tag}
          </span>
        ))}
      </div>

      <Link
        to={`/sheets/${sheet.id}`}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
      >
        <BookOpen className="w-4 h-4" />
        <span>Start Practicing</span>
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  );
};