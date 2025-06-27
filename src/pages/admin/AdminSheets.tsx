import React, { useState } from 'react';
import { Plus, Search, BookOpen, Edit, Trash2 } from 'lucide-react';
import { SheetManager } from '../../components/SheetManager';
import { CreateSheetModal } from '../../components/CreateSheetModal';

export const AdminSheets: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Sheet Management</h1>
          <p className="text-slate-600 mt-2">Create and manage DSA practice sheets</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sheet</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sheets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Sheet Manager */}
      <SheetManager searchTerm={searchTerm} />

      {/* Create Sheet Modal */}
      {showCreateModal && (
        <CreateSheetModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};