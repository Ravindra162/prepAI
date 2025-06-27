import React from 'react';
import { User, Calendar, Mail } from 'lucide-react';

const recentUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', joinDate: '2024-01-15', status: 'active' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', joinDate: '2024-01-14', status: 'active' },
  { id: 3, name: 'Carol Brown', email: 'carol@example.com', joinDate: '2024-01-13', status: 'inactive' },
  { id: 4, name: 'David Wilson', email: 'david@example.com', joinDate: '2024-01-12', status: 'active' },
  { id: 5, name: 'Eve Davis', email: 'eve@example.com', joinDate: '2024-01-11', status: 'active' },
];

export const RecentUsers: React.FC = () => {
  return (
    <div className="space-y-4">
      {recentUsers.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-800">{user.name}</p>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-600">{new Date(user.joinDate).toLocaleDateString()}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              user.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-slate-100 text-slate-800'
            }`}>
              {user.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};