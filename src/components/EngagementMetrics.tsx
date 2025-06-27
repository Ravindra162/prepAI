import React from 'react';
import { Activity, Clock, Users, Play } from 'lucide-react';

const metrics = [
  { label: 'Daily Active Users', value: '1,247', icon: Users, color: 'text-blue-600' },
  { label: 'Avg. Session Duration', value: '23 min', icon: Clock, color: 'text-green-600' },
  { label: 'Code Executions', value: '8,432', icon: Play, color: 'text-purple-600' },
  { label: 'Problem Completion Rate', value: '67%', icon: Activity, color: 'text-orange-600' },
];

export const EngagementMetrics: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-6">Engagement Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="text-center">
            <div className="flex items-center justify-center mb-2">
              <metric.icon className={`w-8 h-8 ${metric.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{metric.value}</p>
            <p className="text-sm text-slate-600">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};