
import React, { useState } from 'react';
import { Asset } from '../types';
import { X, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

interface SellModalProps {
  asset: Asset;
  onClose: () => void;
  onConfirm: (amount: number, price: number) => void;
}

const SellModal: React.FC<SellModalProps> = ({ asset, onClose, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState(asset.currentPrice.toString());
  
  const sellAmount = parseFloat(amount) || 0;
  const sellPrice = parseFloat(price) || asset.currentPrice;
  
  // Calculate derived values
  const sellQty = sellPrice > 0 ? sellAmount / sellPrice : 0;
  const costOfSold = sellQty * (asset.costBasis || 0);
  const pnl = sellAmount - costOfSold;
  
  const isProfit = pnl >= 0;
  const remainingQty = (asset.quantity || 0) - sellQty;
  const safeCostBasis = asset.costBasis || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sellAmount > 0 && sellPrice > 0) {
      onConfirm(sellAmount, sellPrice);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">卖出资产</h2>
            <p className="text-xs text-gray-500 mt-1">{asset.name} ({asset.code})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
           <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">卖出单价 (净值)</label>
                <input 
                  type="number" 
                  step="any"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">当前持仓成本</label>
                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 font-mono">
                  {safeCostBasis.toFixed(4)}
                </div>
             </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">卖出金额 (CNY)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold">¥</span>
                <input 
                  autoFocus
                  type="number" 
                  step="any"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <span>当前持仓市值: ¥{((asset.quantity || 0) * (asset.currentPrice || 0)).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</span>
                <button 
                  type="button" 
                  onClick={() => setAmount(((asset.quantity || 0) * (asset.currentPrice || 0)).toFixed(2))}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  全部卖出
                </button>
              </div>
           </div>

           <div className={`p-4 rounded-xl border ${isProfit ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className="flex justify-between items-center mb-1">
                 <span className={`text-xs font-bold uppercase ${isProfit ? 'text-red-500' : 'text-green-500'}`}>
                    {isProfit ? '预计实现盈利' : '预计实现亏损'}
                 </span>
                 {isProfit ? <TrendingUp size={16} className="text-red-500"/> : <TrendingDown size={16} className="text-green-500"/>}
              </div>
              <div className={`text-2xl font-black ${isProfit ? 'text-red-600' : 'text-green-600'}`}>
                 {isProfit ? '+' : ''}{pnl.toFixed(2)}
              </div>
              <div className="mt-2 pt-2 border-t border-black/5 text-xs text-gray-500 flex justify-between">
                <span>扣除份额: {sellQty.toFixed(4)}</span>
                <span>剩余份额: {remainingQty.toFixed(4)}</span>
              </div>
           </div>
           
           {remainingQty < -0.01 && (
             <div className="text-xs text-red-600 font-bold bg-red-100 p-3 rounded-lg flex items-center gap-2">
               <AlertCircle size={14} className="shrink-0"/> 
               <span>警告：卖出金额超过当前持仓价值 (超额 {(remainingQty * -1 * sellPrice).toFixed(2)} 元)</span>
             </div>
           )}

           <button 
             type="submit" 
             disabled={remainingQty < -0.01}
             className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-black transition font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
           >
             确认卖出
           </button>
        </form>
      </div>
    </div>
  );
};

export default SellModal;
