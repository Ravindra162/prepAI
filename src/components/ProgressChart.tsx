import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyProgress {
  date: string;
  problems_solved: number;
}

interface ProgressChartProps {
  dailyProgress?: DailyProgress[];
}

// Default data for when no user data is available
const defaultData = [
  { name: 'Mon', solved: 0 },
  { name: 'Tue', solved: 0 },
  { name: 'Wed', solved: 0 },
  { name: 'Thu', solved: 0 },
  { name: 'Fri', solved: 0 },
  { name: 'Sat', solved: 0 },
  { name: 'Sun', solved: 0 },
];

export const ProgressChart: React.FC<ProgressChartProps> = ({ dailyProgress }) => {
  // Transform backend data to chart format
  const chartData = React.useMemo(() => {
    if (!dailyProgress || dailyProgress.length === 0) {
      return defaultData;
    }

    // Get last 7 days of data
    const last7Days = dailyProgress.slice(0, 7).reverse();
    
    return last7Days.map((day) => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      return {
        name: dayName,
        solved: day.problems_solved,
        fullDate: day.date
      };
    });
  }, [dailyProgress]);

  const maxValue = Math.max(...chartData.map(d => d.solved), 1);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
          <YAxis 
            stroke="#64748b" 
            fontSize={12} 
            domain={[0, maxValue + 1]}
            allowDecimals={false}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                    <p className="font-medium text-slate-800">{`${label}`}</p>
                    {data.fullDate && (
                      <p className="text-xs text-slate-500 mb-1">{data.fullDate}</p>
                    )}
                    <p className="text-blue-600">
                      {`Problems Solved: ${payload[0].value}`}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="solved"
            stroke="#3b82f6"
            fill="url(#colorGradient)"
            strokeWidth={2}
          />
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};