
import React from 'react';
import { PortfolioSummary } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, CartesianGrid } from 'recharts';

interface PortfolioChartProps {
  summary: PortfolioSummary;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isProfit = data.profit >= 0;
    
    return (
      <div className="bg-gray-900 text-white p-4 rounded-xl shadow-2xl border border-gray-800 text-sm animate-in fade-in zoom-in-95 duration-200">
        <p className="font-bold text-base mb-3 border-b border-gray-700 pb-2">{data.name}</p>
        <div className="space-y-3">
          <div className="flex justify-between gap-8 items-center">
             <span className="text-gray-400 text-xs uppercase font-semibold">总盈利</span>
             <span className={`font-mono font-bold text-base ${isProfit ? 'text-red-400' : 'text-green-400'}`}>
               {data.profit > 0 ? '+' : ''}{data.profit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })}
             </span>
          </div>
           <div className="flex justify-between gap-8 items-center">
             <span className="text-gray-400 text-xs uppercase font-semibold">持仓市值</span>
             <span className="font-mono text-gray-300">
               {data.value.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 })}
             </span>
          </div>
           <div className="flex justify-between gap-8 items-center">
             <span className="text-gray-400 text-xs uppercase font-semibold">收益率</span>
             <span className={`font-mono ${isProfit ? 'text-red-300' : 'text-green-300'}`}>
               {data.returnPercent > 0 ? '+' : ''}{data.returnPercent.toFixed(2)}%
             </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const PortfolioChart: React.FC<PortfolioChartProps> = ({ summary }) => {
  if (!summary || !summary.typeDetails) {
    return <div className="h-full flex items-center justify-center text-gray-400 text-xs">加载中...</div>;
  }

  // Transform data: Filter out assets with no value/activity, Sort by Profit Descending
  const data = Object.entries(summary.typeDetails)
    .filter(([_, detail]) => detail.value > 0 || Math.abs(detail.return) > 1) 
    .map(([type, detail]) => ({
      name: type,
      profit: detail.return,
      value: detail.value,
      cost: detail.cost,
      returnPercent: detail.returnPercent
    }))
    .sort((a, b) => b.profit - a.profit);

  if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">暂无资产数据</div>;

  return (
    <div className="h-[300px] w-full bg-white rounded-xl overflow-hidden pt-4 pr-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          barSize={32}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }}
            dy={10}
            interval={0} // Force show all labels
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickFormatter={(value) => {
                if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}w`;
                return value;
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb', opacity: 0.8 }} />
          <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={2} />
          <Bar dataKey="profit" radius={[4, 4, 4, 4]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                // China Market Convention: Red for Profit, Green for Loss
                fill={entry.profit >= 0 ? '#dc2626' : '#16a34a'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioChart;
