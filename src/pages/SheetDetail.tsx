import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { ProblemCard } from '../components/ProblemCard';
import { useProblemContext } from '../contexts/ProblemContext';

export const SheetDetail: React.FC = () => {
  const { sheetId } = useParams<{ sheetId: string }>();
  const { getSheetById } = useProblemContext();
  const [selectedTopic, setSelectedTopic] = useState('all');

  const sheet = getSheetById(sheetId || '');

  if (!sheet) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-600 mb-2">Sheet not found</h3>
        <Link to="/sheets" className="text-blue-600 hover:text-blue-800">
          ← Back to sheets
        </Link>
      </div>
    );
  }

  const topics = [...new Set(sheet.problems.flatMap(p => p.topics))];
  const filteredProblems = selectedTopic === 'all' 
    ? sheet.problems 
    : sheet.problems.filter(p => p.topics.includes(selectedTopic));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/sheets" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-800">{sheet.title}</h1>
          <p className="text-slate-600 mt-2">{sheet.description}</p>
        </div>
      </div>

      {/* Sheet Stats */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{sheet.problems.length}</div>
            <div className="text-sm text-slate-600">Total Problems</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{sheet.solved}</div>
            <div className="text-sm text-slate-600">Solved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{sheet.estimatedTime}</div>
            <div className="text-sm text-slate-600">Est. Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round((sheet.solved / sheet.problems.length) * 100)}%</div>
            <div className="text-sm text-slate-600">Progress</div>
          </div>
        </div>
      </div>

      {/* Topic Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTopic('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTopic === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Topics
          </button>
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTopic === topic
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Problems List */}
      <div className="space-y-4">
        {filteredProblems.map((problem, index) => (
          <ProblemCard key={problem.id} problem={problem} index={index + 1} sheetId={sheet.id} />
        ))}
      </div>
    </div>
  );
};