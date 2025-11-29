import React, { useState } from 'react';
import { AssetType, Asset } from '../types';
import { Plus, Upload, X, Loader2 } from 'lucide-react';
import { lookupAssetDetails } from '../services/market';

interface AssetEntryProps {
  onAddAssets: (assets: Omit<Asset, 'id' | 'lastUpdated'>[]) => void;
  onClose: () => void;
}

const AssetEntry: React.FC<AssetEntryProps> = ({ onAddAssets, onClose }) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
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

  // Helper to resolve asset details
  const resolveAsset = async (baseAsset: any) => {
    // If code is provided, try to fetch real name and price
    let fetchedPrice = 0;
    
    if (baseAsset.code) {
      try {
        const details = await lookupAssetDetails(baseAsset.code);
        if (details) {
          baseAsset.name = details.name; // Use official name
          fetchedPrice = details.price;
        }
      } catch (e) {
        console.warn("Look up failed", e);
      }
    }
    
    return {
      ...baseAsset,
      currentPrice: fetchedPrice > 0 ? fetchedPrice : baseAsset.costBasis // Fallback to cost if fetch fails
    };
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Clean and normalize code input
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
    // Format: Name, Type, Code, Cost, Quantity
    const lines = batchData.split('\n');
    const assetsToAdd: any[] = [];

    // Map string input to Enum
    const getTypeFromStr = (str: string): AssetType => {
        const s = str.toLowerCase().trim();
        if (s.includes('金') || s.includes('gold')) return AssetType.GOLD;
        if (s.includes('债') || s.includes('bond')) return AssetType.BOND;
        if (s.includes('纳') || s.includes('tech') || s.includes('nasdaq')) return AssetType.NASDAQ;
        if (s.includes('币') || s.includes('btc')) return AssetType.BITCOIN;
        return AssetType.QUANT_FUND; // Default
    };

    for (const line of lines) {
      const parts = line.split(/,|，/); // Support both English and Chinese commas
      if (parts.length >= 5) {
        // user input: Name, Type, Code, Cost, Quantity
        const inputName = parts[0].trim();
        const inputTypeStr = parts[1].trim();
        const inputCode = parts[2].replace(/^(sh|sz|of)/i, '').trim(); // Clean batch codes too
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">添加投资资产</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex border-b border-gray-100">
          <button 
            className={`flex-1 py-3 text-sm font-medium ${mode === 'single' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
            onClick={() => setMode('single')}
          >
            单个录入
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium ${mode === 'batch' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
            onClick={() => setMode('batch')}
          >
            批量录入
          </button>
        </div>

        <div className="p-6">
          {mode === 'single' ? (
            <form onSubmit={handleSubmitSingle} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">代码 (股票/基金)</label>
                  <input 
                    required
                    type="text" 
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="如 518880"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注名称</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="将优先使用查到的名称"
                  />
                </div>
               </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">归属类别</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as AssetType})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.values(AssetType).filter(t => t !== AssetType.CASH).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                  <input 
                    required
                    type="number" 
                    step="any"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">持仓成本单价</label>
                  <input 
                    required
                    type="number" 
                    step="any"
                    value={formData.costBasis}
                    onChange={e => setFormData({...formData, costBasis: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18} />} 
                {isProcessing ? '正在查询净值...' : '确认添加'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="font-semibold mb-1">格式要求:</p>
                <code>备注名, 类型, 代码, 成本单价, 数量</code>
                <p className="mt-2 text-xs text-gray-500">
                  若代码重复将自动合并成本与数量。
                  <br/>类型支持: 黄金, 债券, 科技(或纳指), 量化, 比特币
                </p>
              </div>
              <textarea 
                className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="华安黄金, 黄金, 518880, 4.2, 1000&#10;纳指QQQ, 科技, QQQ, 400, 50"
                value={batchData}
                onChange={e => setBatchData(e.target.value)}
              />
              <button 
                onClick={handleBatchProcess} 
                disabled={isProcessing}
                className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition font-medium flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />} 
                {isProcessing ? '正在处理...' : '开始识别并导入'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetEntry;