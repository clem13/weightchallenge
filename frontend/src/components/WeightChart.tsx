import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { WeightEntry, Member } from '../lib/api';

interface WeightChartProps {
  entries: WeightEntry[];
  members: Member[];
  currentUserId: string;
}

export function WeightChart({ entries, members, currentUserId }: WeightChartProps) {
  const { chartData, memberMap } = useMemo(() => {
    // Group entries by date
    const dateMap = new Map<string, Record<string, number>>();
    const memberMap = new Map<string, { name: string; color: string }>();

    for (const member of members) {
      memberMap.set(member.id, { name: member.name, color: member.avatarColor });
    }

    for (const entry of entries) {
      if (!dateMap.has(entry.date)) {
        dateMap.set(entry.date, {});
      }
      dateMap.get(entry.date)![entry.userId] = entry.weight;
    }

    // Sort by date and create chart data
    const sortedDates = [...dateMap.keys()].sort();
    const chartData = sortedDates.map((date) => {
      const point: Record<string, string | number> = {
        date,
        label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };
      const values = dateMap.get(date)!;
      for (const [userId, weight] of Object.entries(values)) {
        point[userId] = weight;
      }
      return point;
    });

    return { chartData, memberMap };
  }, [entries, members]);

  if (chartData.length === 0) {
    return <p className="chart-empty">No data yet. Log your first weight!</p>;
  }

  // Sort members: current user first, then alphabetically
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#8E8E93' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E5EA' }}
          />
          <YAxis
            domain={['dataMin - 2', 'dataMax + 2']}
            tick={{ fontSize: 11, fill: '#8E8E93' }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
              padding: '12px 16px',
              fontSize: '13px',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number, _name: string, props: { dataKey?: string | number }) => {
              const member = memberMap.get(String(props.dataKey ?? ''));
              return [`${value} kg`, member?.name || 'Unknown'];
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            formatter={(value: string) => memberMap.get(value)?.name || value}
          />
          {sortedMembers.map((member) => (
            <Line
              key={member.id}
              type="monotone"
              dataKey={member.id}
              stroke={member.avatarColor}
              strokeWidth={member.id === currentUserId ? 3 : 2}
              dot={{
                r: member.id === currentUserId ? 4 : 3,
                fill: member.avatarColor,
                strokeWidth: 0,
              }}
              activeDot={{
                r: 6,
                fill: member.avatarColor,
                strokeWidth: 2,
                stroke: 'white',
              }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
