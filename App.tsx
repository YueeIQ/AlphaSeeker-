import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCcw, TrendingUp, DollarSign, PieChart as PieIcon, Wallet, Coins, Settings, UserCircle, LogOut, Cloud } from 'lucide-react';
import { Asset, PortfolioSummary, AssetType, TargetStrategy, User, UserCloudData } from './types';
import { INITIAL_ASSETS, DEFAULT_STRATEGY } from './constants';
import { fetchLatestPrices } from './services/market';
import { AuthService } from './services/auth';
import AssetEntry from './components/AssetEntry';
import StrategyPanel from './components/StrategyPanel';
import StrategyConfig from './components/StrategyConfig';
import PortfolioChart from './components/PortfolioChart';
import AuthModal from './components/AuthModal';

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Data State ---
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('alphaSeekerAssets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });
  
  const [cashBalance, setCashBalance] = useState<number>(() => {
    const saved = localStorage.getItem('alphaSeekerCash');
    return saved ? parseFloat(saved) : 0;
  });

  const [strategy, setStrategy] = useState<TargetStrategy>(() => {
    const saved = localStorage.getItem('alphaSeekerStrategy');
    return saved ? JSON.parse(saved) : DEFAULT_STRATEGY;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  
  const [newCashInput, setNewCashInput] = useState('');
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  // --- Effects ---

  // 1. Initialize User Session
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // 2. Local Persistence (Always Save to LocalStorage for offline capability)
  useEffect(() => {
    localStorage.setItem('alphaSeekerAssets', JSON.stringify(assets));
    localStorage.setItem('alphaSeekerCash', cashBalance.toString());
    localStorage.setItem('alphaSeekerStrategy', JSON.stringify(strategy));
  }, [assets, cashBalance, strategy]);

  // 3. Cloud Sync (Auto-save when data changes if logged in)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (user) {
      setIsSyncing(true);
      // Debounce the save to avoid hammering the API
      timeoutId = setTimeout(() => {
        const cloudData: UserCloudData = {
          assets,
          cashBalance,
          strategy,
          lastSynced: Date.now()
        };
        AuthService.saveData(user.email, cloudData)
          .then(() => setIsSyncing(false))
          .catch(err => {
             console.error("Sync failed", err);
             setIsSyncing(false); 
          });
      }, 3000);
    }
    return () => clearTimeout(timeoutId);
  }, [assets, cashBalance, strategy, user]);


  // --- Auth & Data Handlers ---
  
  const handleLoginSuccess = (loggedInUser: User, cloudData: UserCloudData | null) => {
    setUser(loggedInUser);
    if (cloudData) {
      // Logic: If logging in, usually we want to see our remote data.
      // We can prompt to confirm overwriting local data.
      if (confirm('登录成功！检测到云端存档，是否加载并覆盖当前页面数据？')) {
        if (cloudData.assets) setAssets(cloudData.assets);
        if (typeof cloudData.cashBalance === 'number') setCashBalance(cloudData.cashBalance);
        if (cloudData.strategy) setStrategy(cloudData.strategy);
      }
    }
  };

  const handleLogout = () => {
    if(confirm('确定要退出登录吗？退出后将停止云端同步。')) {
      AuthService.logout();
      setUser(null);
    }
  };


  // --- Derived Portfolio Summary ---
  const summary: PortfolioSummary = useMemo(() => {
    let investValue = 0;
    let investCost = 0;
    const typeValue: Record<string, number> = {};

    assets.forEach(asset => {
      const value = asset.quantity * asset.currentPrice;
      const cost = asset.quantity * asset.costBasis;
      investValue += value;
      investCost += cost;
      
      typeValue[asset.type] = (typeValue[asset.type] || 0) + value;
    });

    // Add Cash to Total Value and Allocation
    const totalValue = investValue + cashBalance;
    const totalCost = investCost + cashBalance; // Cash cost is itself
    typeValue[AssetType.CASH] = cashBalance;

    const allocation: any = {};
    Object.values(AssetType).forEach(type => {
      allocation[type] = totalValue > 0 ? ((typeValue[type] || 0) / totalValue) * 100 : 0;
    });

    return {
      totalValue,
      totalCost,
      totalReturn: investValue - investCost, // Return only on investments
      totalReturnPercent: investCost > 0 ? ((investValue - investCost) / investCost) * 100 : 0,
      allocation,
      cashBalance
    };
  }, [assets, cashBalance]);

  const handleAddAssets = (newAssets: Omit<Asset, 'id' | 'lastUpdated'>[]) => {
    setAssets(prevAssets => {
      const nextAssets = [...prevAssets];

      newAssets.forEach(newItem => {
        // If code exists, find index
        const existingIndex = nextAssets.findIndex(
          a => a.code && newItem.code && a.code.toUpperCase() === newItem.code.toUpperCase()
        );

        if (existingIndex > -1) {
          // Merge Logic
          const existing = nextAssets[existingIndex];
          const totalQty = existing.quantity + newItem.quantity;
          
          // Weighted Average Cost
          // (OldQty * OldCost + NewQty * NewCost) / TotalQty
          const totalCostVal = (existing.quantity * existing.costBasis) + (newItem.quantity * newItem.costBasis);
          const weightedCost = totalQty > 0 ? totalCostVal / totalQty : 0;

          // Update existing asset
          nextAssets[existingIndex] = {
            ...existing,
            quantity: totalQty,
            costBasis: weightedCost,
            // Optionally update name if the new one is better, but usually keep existing or update from API
            lastUpdated: new Date().toISOString()
          };
        } else {
          // Add new asset
          nextAssets.push({
            ...newItem,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            lastUpdated: new Date().toISOString()
          });
        }
      });

      return nextAssets;
    });
  };

  const handleUpdateCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newCashInput);
    if (!isNaN(val)) {
      setCashBalance(val);
      setShowCashModal(false);
      setNewCashInput('');
    }
  };

  const handleRefreshPrices = async () => {
    setIsUpdatingPrices(true);
    try {
      const newPrices = await fetchLatestPrices(assets);
      setAssets(assets.map(a => ({
        ...a,
        currentPrice: newPrices[a.id] || a.currentPrice,
        lastUpdated: new Date().toISOString()
      })));
    } catch (e) {
      console.error("Failed to update prices", e);
      alert("更新净值时部分数据获取失败，请稍后重试或检查网络。");
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const handleDeleteAsset = (id: string) => {
    if(confirm('确定要删除这项资产吗?')) {
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  // Format currency helpers - Integer for Amounts
  const fmtMoney = (n: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(n);
  // 2 Decimals for Prices/Percentages
  const fmtPrice = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

  // Calculate Investable Cash: Current Cash - (Total Assets * Target Cash %)
  const targetCashAmount = summary.totalValue * ((strategy.allocations[AssetType.CASH] || 0) / 100);
  const investableCash = Math.max(0, summary.cashBalance - targetCashAmount);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-100 shadow-md">
              <TrendingUp className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">AlphaSeeker <span className="text-indigo-600">投资看板</span></h1>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:hidden">AlphaSeeker</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
             {/* Auth Section */}
             {user ? (
               <div className="flex items-center gap-3 mr-2 pl-2 border-l border-gray-100">
                  <div className="flex flex-col items-end hidden md:flex">
                     <span className="text-sm font-bold text-gray-800">{user.name}</span>
                     <span className="text-xs text-indigo-500 flex items-center gap-1">
                       {isSyncing ? '云同步中...' : '云端已同步'}
                       {isSyncing ? <Cloud size={10} className="animate-pulse"/> : <Cloud size={10} />}
                     </span>
                  </div>
                  <div className="bg-indigo-50 p-1.5 rounded-full text-indigo-600">
                    <UserCircle size={24} />
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 transition hover:bg-red-50 rounded-lg"
                    title="退出登录"
                  >
                    <LogOut size={18} />
                  </button>
               </div>
             ) : (
               <button
                  onClick={() => setShowAuthModal(true)}
                  className="mr-2 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition"
               >
                  <UserCircle size={18} />
                  <span className="hidden sm:inline">登录 / 注册</span>
               </button>
             )}

             <button 
              onClick={handleRefreshPrices} 
              disabled={isUpdatingPrices}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition flex items-center gap-1"
              title="联网更新最新净值"
            >
              <RefreshCcw size={20} className={isUpdatingPrices ? 'animate-spin' : ''} />
              <span className="text-xs font-medium hidden sm:inline">刷新</span>
            </button>
            
            <button 
              onClick={() => { setNewCashInput(cashBalance.toString()); setShowCashModal(true); }}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition"
            >
              <Coins size={16} /> <span className="hidden sm:inline">现金</span>
            </button>

            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition"
            >
              <Plus size={16} /> <span className="hidden sm:inline">记一笔</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Total Net Value & Profit */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign size={100} />
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500">总资产净值 (CNY)</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{fmtMoney(summary.totalValue)}</h2>
            </div>
            <div className="pt-4 border-t border-gray-50">
               <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">累计盈利</span>
                  {/* Chinese Market Color: Red for Profit, Green for Loss */}
                  <span className={`text-lg font-bold ${summary.totalReturn >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {summary.totalReturn >= 0 ? '+' : ''}{fmtMoney(summary.totalReturn)}
                  </span>
               </div>
               
               <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">其中可投入现金</span>
                  <span className="text-sm font-medium text-gray-600">
                    {fmtMoney(investableCash)}
                  </span>
               </div>
            </div>
          </div>

          {/* Annualized Return (YTD / Total Return) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div>
              <p className="text-sm font-medium text-gray-500">总收益率 (今年)</p>
              <div className="flex items-end gap-2 mt-2">
                {/* Chinese Market Color: Red for Profit, Green for Loss */}
                <h2 className={`text-3xl font-bold ${summary.totalReturnPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmtPct(summary.totalReturnPercent)}
                </h2>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-4 overflow-hidden relative">
              {/* Target Line */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10" style={{ left: '50%' }} title="Target"></div>
              <div className={`h-2.5 rounded-full ${summary.totalReturnPercent >= 0 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(Math.abs(summary.totalReturnPercent) / 0.3, 100)}%` }}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
               <span>当前</span>
               <span>目标: 15.0%</span>
            </div>
          </div>

           {/* Allocation Chart */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition">
             <div className="flex justify-between items-start mb-2">
               <div>
                  <p className="text-sm font-medium text-gray-500">当前资产配置</p>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">分布比例</h2>
               </div>
               <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                 <PieIcon size={20} />
               </div>
             </div>
             <div className="flex-1 -ml-4">
               {summary.totalValue > 0 ? (
                 <PortfolioChart summary={summary} />
               ) : (
                 <div className="flex items-center justify-center h-full text-gray-300 text-sm">暂无数据</div>
               )}
             </div>
          </div>
        </div>

        {/* Strategy & Advice */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">策略看板</h2>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-600">Smart Money 模式</span>
            </div>
            <button 
              onClick={() => setShowStrategyModal(true)}
              className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              <Settings size={14} /> 调整策略权重
            </button>
          </div>
          <StrategyPanel portfolio={summary} assets={assets} strategy={strategy} />
        </section>

        {/* Assets Table */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
               <Wallet size={18} className="text-gray-400" /> 持仓明细
             </h3>
             <span className="text-xs text-gray-400">净值数据来源: 天天基金网 (优先展示实时估值 GSZ)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">代码/名称</th>
                  <th className="px-6 py-3 font-semibold">类别</th>
                  <th className="px-6 py-3 text-right font-semibold">仓位占比</th>
                  {/* Removed Quantity and Unit Cost */}
                  <th className="px-6 py-3 text-right font-semibold">持仓成本</th>
                  <th className="px-6 py-3 text-right font-semibold">最新净值</th>
                  <th className="px-6 py-3 text-right font-semibold">市值</th>
                  <th className="px-6 py-3 text-right font-semibold">浮动盈亏</th>
                  <th className="px-6 py-3 text-center font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Cash Row */}
                {cashBalance > 0 && (
                   <tr className="bg-green-50/10 hover:bg-green-50/20 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">人民币现金</td>
                      <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">{AssetType.CASH}</span></td>
                      <td className="px-6 py-4 text-right font-medium">
                        {summary.totalValue > 0 ? ((cashBalance / summary.totalValue) * 100).toFixed(2) : 0}%
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">{fmtMoney(cashBalance)}</td>
                      <td className="px-6 py-4 text-right text-gray-500">1.00</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{fmtMoney(cashBalance)}</td>
                      <td className="px-6 py-4 text-right text-gray-400">-</td>
                      <td className="px-6 py-4 text-center">
                         <button onClick={() => { setNewCashInput(cashBalance.toString()); setShowCashModal(true); }} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium bg-indigo-50 px-3 py-1 rounded hover:bg-indigo-100 transition">修改</button>
                      </td>
                   </tr>
                )}
                {assets.map(asset => {
                  const marketVal = asset.quantity * asset.currentPrice;
                  const totalCost = asset.quantity * asset.costBasis;
                  const gain = marketVal - totalCost;
                  const gainPct = totalCost !== 0 
                    ? (gain / totalCost) * 100 
                    : 0;
                  const portfolioPct = summary.totalValue > 0 ? (marketVal / summary.totalValue) * 100 : 0;

                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 transition group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{asset.name}</div>
                        {asset.code && <div className="text-xs text-gray-400 font-mono mt-0.5">{asset.code}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-white text-gray-600 px-2.5 py-1 rounded-full text-xs border border-gray-200 font-medium">
                          {asset.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className="text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">{portfolioPct.toFixed(2)}%</span>
                      </td>
                      {/* Display Total Cost instead of Unit Cost/Qty */}
                      <td className="px-6 py-4 text-right font-mono text-gray-600">{fmtMoney(totalCost)}</td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-indigo-600">{fmtPrice(asset.currentPrice)}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{fmtMoney(marketVal)}</td>
                      {/* Chinese Market Color: Red for Profit, Green for Loss */}
                      <td className={`px-6 py-4 text-right font-medium ${gain >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {gain >= 0 ? '+' : ''}{fmtMoney(gain)} <br/>
                        <span className={`text-xs ${gain >=0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} px-1.5 py-0.5 rounded mt-1 inline-block`}>
                          {gainPct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <button 
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition text-xs font-medium px-2 py-1"
                         >
                           删除
                         </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {assets.length === 0 && cashBalance === 0 && (
             <div className="text-center py-12 bg-gray-50">
                <div className="bg-white p-4 rounded-full inline-block mb-3 shadow-sm">
                   <Wallet size={32} className="text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-medium">暂无资产数据</h3>
                <p className="text-gray-500 text-sm mt-1 mb-4">开始记录您的第一笔投资吧</p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
                >
                  添加资产
                </button>
             </div>
          )}
        </section>
      </main>

      {/* Modals */}
      {showAddModal && (
        <AssetEntry 
          onAddAssets={handleAddAssets} 
          onClose={() => setShowAddModal(false)} 
        />
      )}

      {showStrategyModal && (
        <StrategyConfig 
          currentStrategy={strategy}
          onSave={setStrategy}
          onClose={() => setShowStrategyModal(false)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
        currentData={{ assets, cashBalance, strategy, lastSynced: Date.now() }}
      />

      {/* Cash Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Coins className="text-indigo-600" /> 设置现金余额
              </h3>
              <form onSubmit={handleUpdateCash}>
                <label className="block text-sm text-gray-600 mb-2 font-medium">当前可用资金 (CNY)</label>
                <input 
                  type="number" 
                  step="any"
                  autoFocus
                  value={newCashInput}
                  onChange={e => setNewCashInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-6 text-lg"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCashModal(false)} className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">取消</button>
                  <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition shadow-lg shadow-indigo-200">确认保存</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;