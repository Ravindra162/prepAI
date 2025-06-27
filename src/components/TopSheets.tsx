import React from 'react';
import { BookOpen, Users, TrendingUp } from 'lucide-react';

const topSheets = [
  { name: 'Striver A2Z DSA', users: 1247, growth: '+12%' },
  { name: 'Love Babbar 450', users: 892, growth: '+8%' },
  { name: 'NeetCode 150', users: 634, growth: '+23%' },
  { name: 'Blind 75', users: 543, growth: '+15%' },
  { name: 'Beginner Friendly', users: 234, growth: '+5%' },
];

export const TopSheets: React.FC = () => {
  return (
    <div className="space-y-4">
      {topSheets.map((sheet, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-800">{sheet.name}</p>
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <Users className="w-4 h-4" />
                <span>{sheet.users} users</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">{sheet.growth}</span>
          </div>
        </div>
      ))}
    </div>
  );
};