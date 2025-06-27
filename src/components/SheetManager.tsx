import React from 'react';
import { Edit, Trash2, ExternalLink, Users } from 'lucide-react';

interface SheetManagerProps {
  searchTerm: string;
}

const sheets = [
  { id: 1, title: 'Striver A2Z DSA Sheet', problems: 450, users: 1247, difficulty: 'Intermediate' },
  { id: 2, title: 'Love Babbar DSA Sheet', problems: 450, users: 892, difficulty: 'Intermediate' },
  { id: 3, title: 'NeetCode 150', problems: 150, users: 634, difficulty: 'Advanced' },
  { id: 4, title: 'Blind 75', problems: 75, users: 543, difficulty: 'Advanced' },
  { id: 5, title: 'Beginner Friendly', problems: 100, users: 234, difficulty: 'Beginner' },
];

export const SheetManager: React.FC<SheetManagerProps> = ({ searchTerm }) => {
  const filteredSheets = sheets.filter(sheet =>
    sheet.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Sheet Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Problems
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSheets.map((sheet) => (
              <tr key={sheet.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{sheet.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">{sheet.problems}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-900">{sheet.users}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    sheet.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                    sheet.difficulty === 'Intermediate' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {sheet.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="text-slate-600 hover:text-slate-800">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};