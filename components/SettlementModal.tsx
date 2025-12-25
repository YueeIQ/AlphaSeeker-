
import React, { useState, useMemo } from 'react';
import { PortfolioSummary, SettlementConfig } from '../types';
import { X, Calculator, Settings, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { DEFAULT_SETTLEMENT_CONFIG } from '../constants';

interface SettlementModalProps {
  summary: PortfolioSummary;
  onClose: () => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ summary, onClose }) => {
  const [config, setConfig] = useState<SettlementConfig>(DEFAULT_SETTLEMENT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);

  const calculations = useMemo(() => {
    const { totalCost, totalReturn, totalReturnPercent, totalValue } = summary;
    const isProfit = totalReturn > 0;
    
    // --- 分成结算 ---
    let sharingAmount = 0;
    const returnRate = totalReturnPercent / 100;
    const t1 = config.profitThreshold1 / 100;
    const t2 = config.profitThreshold2 / 100;
    const r1 = config.sharingRate1 / 100;
    const r2 = config.sharingRate2 / 100;

    if (returnRate > t1) {
      // 3% - 5% 部分
      const bracket1Max = totalCost * (t2 - t1);
      const actualBracket1 = Math.min(totalReturn - (totalCost * t1), bracket1Max);
      sharingAmount += actualBracket1 * r1;

      // > 5% 部分
      if (returnRate > t2) {
        const actualBracket2 = totalReturn - (totalCost * t2);
        sharingAmount += actualBracket2 * r2;
      }
    }

    // --- 兜底结算 ---
    const gT = config.guaranteeThreshold / 100;
    const targetValue = totalCost * (1 + gT);
    let guaranteeAmount = 0;
    if (totalValue < targetValue) {
      guaranteeAmount = targetValue - totalValue;
    }

    return {
      sharingAmount,
      guaranteeAmount,
      totalCost,
      totalReturn,
      returnRate: totalReturnPercent
    };
  }, [summary, config]);

  const fmt = (n: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Calculator className="text-indigo-600" /> 
              智能结算中心
            </h2>
            <p className="text-xs text-gray-500 mt-1">基于当前资产总值与收益率的实时核算</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowConfig(!showConfig)} 
              className={`p-2 rounded-full transition-colors ${showConfig ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="结算参数设置"
            >
              <Settings size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {showConfig && (
            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <Settings size={14} /> 结算逻辑参数配置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-black text-indigo-400 uppercase">分成阶梯设置</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24">起征点 (%)</span>
                    <input type="number" value={config.profitThreshold1} onChange={e => setConfig({...config, profitThreshold1: parseFloat(e.target.value)})} className="flex-1 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24">高阶点 (%)</span>
                    <input type="number" value={config.profitThreshold2} onChange={e => setConfig({...config, profitThreshold2: parseFloat(e.target.value)})} className="flex-1 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24">分成比例1 (%)</span>
                    <input type="number" value={config.sharingRate1} onChange={e => setConfig({...config, sharingRate1: parseFloat(e.target.value)})} className="flex-1 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24">分成比例2 (%)</span>
                    <input type="number" value={config.sharingRate2} onChange={e => setConfig({...config, sharingRate2: parseFloat(e.target.value)})} className="flex-1 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black text-indigo-400 uppercase">兜底设置</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24">兜底收益 (%)</span>
                    <input type="number" value={config.guaranteeThreshold} onChange={e => setConfig({...config, guaranteeThreshold: parseFloat(e.target.value)})} className="flex-1 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase">当前收益率</p>
              <p className={`text-lg font-black ${calculations.returnRate >= 0 ? 'text-red-600' : 'text-green-600'}`}>{calculations.returnRate.toFixed(2)}%</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase">持仓总成本</p>
              <p className="text-lg font-black text-gray-900">{fmt(calculations.totalCost)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase">总盈利额</p>
              <p className={`text-lg font-black ${calculations.totalReturn >= 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(calculations.totalReturn)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase">净值总额</p>
              <p className="text-lg font-black text-indigo-900">{fmt(summary.totalValue)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 分成结算模块 */}
            <div className="bg-white rounded-2xl border-2 border-indigo-50 p-6 flex flex-col relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={100} className="text-indigo-600" />
               </div>
               <h3 className="text-lg font-black text-gray-800 mb-2 flex items-center gap-2">
                 <CheckCircle2 size={20} className="text-indigo-500" /> 分成结算
               </h3>
               <p className="text-sm text-gray-500 mb-6 flex-1">
                 超出 {config.profitThreshold1}% 部分收益按阶梯进行分成。
               </p>
               <div className="mt-auto">
                 <p className="text-xs font-bold text-indigo-400 uppercase mb-1">应计分成金额</p>
                 <p className="text-3xl font-black text-indigo-600">{fmt(calculations.sharingAmount)}</p>
               </div>
               <div className="mt-4 pt-4 border-t border-indigo-50">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{config.profitThreshold1}%~{config.profitThreshold2}% 提成:</span>
                    <span className="font-bold text-gray-600">{config.sharingRate1}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>&gt;{config.profitThreshold2}% 提成:</span>
                    <span className="font-bold text-gray-600">{config.sharingRate2}%</span>
                  </div>
               </div>
            </div>

            {/* 兜底结算模块 */}
            <div className="bg-white rounded-2xl border-2 border-red-50 p-6 flex flex-col relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <AlertCircle size={100} className="text-red-600" />
               </div>
               <h3 className="text-lg font-black text-gray-800 mb-2 flex items-center gap-2">
                 <AlertCircle size={20} className="text-red-500" /> 兜底结算
               </h3>
               <p className="text-sm text-gray-500 mb-6 flex-1">
                 当收益率低于 {config.guaranteeThreshold}% 时，补偿差额。
               </p>
               <div className="mt-auto">
                 <p className="text-xs font-bold text-red-400 uppercase mb-1">应计兜底金额</p>
                 <p className={`text-3xl font-black ${calculations.guaranteeAmount > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                   {fmt(calculations.guaranteeAmount)}
                 </p>
               </div>
               <div className="mt-4 pt-4 border-t border-red-50">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>兜底目标收益率:</span>
                    <span className="font-bold text-gray-600">{config.guaranteeThreshold}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>结算状态:</span>
                    <span className={`font-bold ${calculations.guaranteeAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {calculations.guaranteeAmount > 0 ? '已触发兜底' : '无需兜底'}
                    </span>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-xl flex gap-3 items-start border border-yellow-100">
             <Info className="text-yellow-600 mt-0.5 shrink-0" size={16} />
             <p className="text-xs text-yellow-800 leading-relaxed">
               <b>结算提示：</b>本计算仅供参考。分成结算建议在平仓后或定期（如季度/年度）进行。兜底计算以“总持仓成本 * (1 + {config.guaranteeThreshold}%) - 当前总资产净值”为逻辑。
             </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl">
            确 认
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;
