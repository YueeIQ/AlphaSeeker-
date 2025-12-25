
import React, { useState } from 'react';
import { AssetType, Asset } from '../types';
import { Plus, Upload, X, Loader2, Coins, TrendingDown, FileText, LayoutGrid } from 'lucide-react';
import { lookupAssetDetails } from '../services/market';

interface AssetEntryProps {
  onAddAssets: (assets: Omit<Asset, 'id' | 'lastUpdated'>[]) => void;
  onUpdateCash: (amount: number) => void;
  onAddLoss: (amount: number) => void;
  currentCash: number;
  onClose: () => void;
}

type EntryMode = 'single' | 'batch' | 'cash' | 'loss';

const AssetEntry: React.FC<AssetEntryProps> = ({ onAddAssets, onUpdateCash, onAddLoss, currentCash, onClose }) => {
  const [mode, setMode] = useState<EntryMode>('single');
  const [isProcessing, setIsProcessing] = useState(false);

  // Single Entry State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: AssetType.QUANT_FUND,
    quantity: '',
    costBasis: '',
  });

  // Batch Entry State
  const [batchData, setBatchData] = useState('');

  // Cash State
  const [cashInput, setCashInput] = useState(currentCash.toString());

  // Loss State
  const [lossInput, setLossInput] = useState('');

  const resolveAsset = async (baseAsset: any) => {
    let fetchedPrice = 0;
    if (baseAsset.code) {
      try {
        const details = await lookupAssetDetails(baseAsset.code);
        if (details) {
          baseAsset.name = details.name;
          fetchedPrice = details.price;
        }
      } catch (e) {
        console.warn("Look up failed", e);
      }
    }
    return {
      ...baseAsset,
      currentPrice: fetchedPrice > 0 ? fetchedPrice : baseAsset.costBasis
    };
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const cleanCode = formData.code.replace(/^(sh|sz|of)/i, '').trim();
    const rawAsset = {
      name: formData.name || cleanCode,
      code: cleanCode,
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      costBasis: parseFloat(formData.costBasis),
    };
    const finalAsset = await resolveAsset(rawAsset);
    onAddAssets([finalAsset]);
    setIsProcessing(false);
    onClose();
  };

  const handleBatchProcess = async () => {
    setIsProcessing(true);
    const lines = batchData.split('\n');
    const assetsToAdd: any[] = [];
    const getTypeFromStr = (str: string): AssetType => {
        const s = str.toLowerCase().trim();
        if (s.includes('金') || s.includes('gold')) return AssetType.GOLD;
        if (s.includes('债') || s.includes('bond')) return AssetType.BOND;
        if (s.includes('纳') || s.includes('tech') || s.includes('nasdaq')) return AssetType.NASDAQ;
        if (s.includes('币') || s.includes('btc')) return AssetType.BITCOIN;
        return AssetType.QUANT_FUND;
    };
    for (const line of lines) {
      const parts = line.split(/,|，/);
      if (parts.length >= 5) {
        const inputName = parts[0].trim();
        const inputTypeStr = parts[1].trim();
        const inputCode = parts[2].replace(/^(sh|sz|of)/i, '').trim();
        const inputCost = parseFloat(parts[3]);
        const inputQty = parseFloat(parts[4]);
        if (!inputName || isNaN(inputCost) || isNaN(inputQty)) continue;
        const type = getTypeFromStr(inputTypeStr);
        const rawAsset = {
          name: inputName,
          code: inputCode,
          type: type,
          quantity: inputQty,
          costBasis: inputCost,
        };
        const finalAsset = await resolveAsset(rawAsset);
        assetsToAdd.push(finalAsset);
      }
    }
    if (assetsToAdd.length > 0) {
      onAddAssets(assetsToAdd);
      onClose();
    } else {
      alert("未能识别有效数据，请检查格式。");
    }
    setIsProcessing(false);
  };

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashInput);
    if (!isNaN(val)) {
      onUpdateCash(val);
      onClose();
    }
  };

  const handleLossSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(lossInput);
    if (!isNaN(val) && val > 0) {
      onAddLoss(val);
      onClose();
    } else {
      alert("请输入有效的亏损金额");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">记一笔</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {[
            { id: 'single', label: '单个资产', icon: <Plus size={14}/> },
            { id: 'batch', label: '批量导入', icon: <LayoutGrid size={14}/> },
            { id: 'cash', label: '现金调整', icon: <Coins size={14}/> },
            { id: 'loss', label: '亏损录入', icon: <TrendingDown size={14}/> },
          ].map((tab) => (
            <button 
              key={tab.id}
              className={`flex-1 py-3 text-xs font-bold flex flex-col items-center gap-1 transition-all ${mode === tab.id ? 'text-indigo-600 bg-white border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setMode(tab.id as EntryMode)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {mode === 'single' && (
            <form onSubmit={handleSubmitSingle} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="518880"/>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注名</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="基金名称"/>
                </div>
               </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">资产类别</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as AssetType})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  {Object.values(AssetType).filter(t => t !== AssetType.CASH).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">持有数量</label>
                  <input required type="number" step="any" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">买入成本</label>
                  <input required type="number" step="any" value={formData.costBasis} onChange={e => setFormData({...formData, costBasis: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00"/>
                </div>
              </div>
              <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18} />} 
                {isProcessing ? '正在查询最新净值...' : '确认入库'}
              </button>
            </form>
          )}

          {mode === 'batch' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                <p className="font-bold text-gray-700 mb-1">CSV格式:</p>
                <code className="bg-white px-1 border rounded text-indigo-600">备注, 类型, 代码, 成本, 数量</code>
                <p className="mt-2 italic">类型支持：黄金、债券、纳斯达克、量化、比特币</p>
              </div>
              <textarea className="w-full h-32 p-3 border border-gray-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="华安黄金, 黄金, 518880, 4.2, 1000&#10;纳指QQQ, 纳斯达克100, QQQ, 400, 50" value={batchData} onChange={e => setBatchData(e.target.value)}/>
              <button onClick={handleBatchProcess} disabled={isProcessing} className="w-full bg-gray-800 text-white py-3 rounded-xl hover:bg-black transition font-bold flex items-center justify-center gap-2 shadow-lg">
                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />} 
                开始批量导入
              </button>
            </div>
          )}

          {mode === 'cash' && (
            <form onSubmit={handleCashSubmit} className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
                <p className="text-xs text-indigo-500 font-bold mb-1 uppercase tracking-wider">当前现金持有量</p>
                <p className="text-2xl font-black text-indigo-900">¥{parseFloat(cashInput).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重置现金金额 (CNY)</label>
                <input autoFocus type="number" step="any" value={cashInput} onChange={e => setCashInput(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold" placeholder="0.00"/>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100">
                更新现金余额
              </button>
            </form>
          )}

          {mode === 'loss' && (
            <form onSubmit={handleLossSubmit} className="space-y-4">
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                <p className="text-xs text-red-500 font-bold mb-1 uppercase tracking-wider">功能说明</p>
                <p className="text-sm text-red-700 leading-relaxed">直接录入已实现的亏损（如割肉离场）。该金额将从总盈利中扣除，但不影响当前持仓市值。</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新增亏损金额 (CNY)</label>
                <input autoFocus type="number" step="any" value={lossInput} onChange={e => setLossInput(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-lg font-bold text-red-600" placeholder="0.00"/>
              </div>
              <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition font-bold shadow-lg shadow-red-100">
                确认录入亏损
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetEntry;
