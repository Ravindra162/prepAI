import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', sessions: 120, problems: 89 },
  { name: 'Tue', sessions: 189, problems: 134 },
  { name: 'Wed', sessions: 234, problems: 178 },
  { name: 'Thu', sessions: 298, problems: 221 },
  { name: 'Fri', sessions: 387, problems: 287 },
  { name: 'Sat', sessions: 456, problems: 342 },
  { name: 'Sun', sessions: 323, problems: 245 },
];

export const AnalyticsChart: React.FC = () => {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                    <p className="font-medium text-slate-800">{`${label}`}</p>
                    <p className="text-blue-600">
                      {`Sessions: ${payload[0].value}`}
                    </p>
                    <p className="text-green-600">
                      {`Problems: ${payload[1].value}`}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="problems" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};