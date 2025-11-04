import React from 'react';
import { PieChart, TrendingUp, Wallet, Target, BarChart3 } from 'lucide-react';

/**
 * Portfolio overview dashboard showing allocation and summary
 */
const PortfolioOverview = ({
  investments,
  pocketCash,
  networth,
  formatCurrency,
  getCurrentPrice,
  getCurrentGoldPrice,
  currentMonth,
  goldData,
  availableStocks,
  availableMutualFunds,
  availableIndexFunds,
  availableCommodities,
  availableREITs,
  availableCrypto,
  availableForex
}) => {

  const calculateCategoryValue = (category, data) => {
    if (category === 'savings') {
      return investments?.savings?.amount || 0;
    }
    if (category === 'fixedDeposits') {
      return (investments?.fixedDeposits || []).reduce((sum, fd) => sum + fd.amount, 0);
    }
    if (category === 'gold') {
      if (!getCurrentGoldPrice) return 0;
      const goldPricePer10g = getCurrentGoldPrice(currentMonth);
      const goldPricePerGram = goldPricePer10g / 10;
      return (investments?.gold?.grams || 0) * goldPricePerGram;
    }

    // For other categories
    if (!investments?.[category] || !Array.isArray(investments[category])) {
      return 0;
    }

    return investments[category].reduce((sum, item) => {
      const currentPrice = getCurrentPrice(item.id, currentMonth);
      const units = item.units || item.shares || 0;
      return sum + (currentPrice * units);
    }, 0);
  };

  const portfolioData = [
    { name: 'Cash', value: pocketCash, color: 'bg-blue-500', icon: Wallet },
    { name: 'Savings', value: calculateCategoryValue('savings'), color: 'bg-cyan-500', icon: Wallet },
    { name: 'Fixed Deposits', value: calculateCategoryValue('fixedDeposits'), color: 'bg-indigo-500', icon: BarChart3 },
    { name: 'Stocks', value: calculateCategoryValue('stocks'), color: 'bg-blue-600', icon: TrendingUp },
    { name: 'Mutual Funds', value: calculateCategoryValue('mutualFunds'), color: 'bg-purple-600', icon: Target },
    { name: 'Index Funds', value: calculateCategoryValue('indexFunds'), color: 'bg-violet-500', icon: BarChart3 },
    { name: 'Gold', value: calculateCategoryValue('gold'), color: 'bg-yellow-500', icon: TrendingUp },
    { name: 'Commodities', value: calculateCategoryValue('commodities'), color: 'bg-amber-600', icon: BarChart3 },
    { name: 'REITs', value: calculateCategoryValue('reit'), color: 'bg-orange-500', icon: TrendingUp },
    { name: 'Crypto', value: calculateCategoryValue('crypto'), color: 'bg-green-500', icon: TrendingUp },
    { name: 'Forex', value: calculateCategoryValue('forex'), color: 'bg-teal-500', icon: TrendingUp },
  ].filter(item => item.value > 0);

  const totalInvested = portfolioData.reduce((sum, item) => sum + item.value, 0);
  const growth = ((networth / 50000 - 1) * 100).toFixed(1);

  return (
    <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-orange-200 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <PieChart className="w-4 h-4 text-orange-600" />
        <h2 className="text-lg font-bold text-gray-800">Portfolio</h2>
      </div>

      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 rounded border border-blue-200">
          <div className="text-xs text-blue-600 font-semibold">Net Worth</div>
          <div className="text-sm font-bold text-blue-800">{formatCurrency(networth)}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 rounded border border-green-200">
          <div className="text-xs text-green-600 font-semibold">Growth</div>
          <div className={`text-sm font-bold ${parseFloat(growth) >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            {parseFloat(growth) >= 0 ? '+' : ''}{growth}%
          </div>
        </div>
      </div>

      {/* Allocation Breakdown - Compact */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-700 mb-2">Asset Allocation</h3>
        {portfolioData.map((item, index) => {
          const percentage = ((item.value / totalInvested) * 100).toFixed(1);
          const Icon = item.icon;

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Icon className="w-3 h-3 text-gray-600" />
                  <span className="font-semibold text-gray-700">{item.name}</span>
                </div>
                <span className="font-bold text-gray-800">{percentage}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats - Compact */}
      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-gray-600">Types</div>
          <div className="text-lg font-bold text-gray-800">{portfolioData.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Stocks</div>
          <div className="text-lg font-bold text-blue-600">{investments?.stocks?.length || 0}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">FDs</div>
          <div className="text-lg font-bold text-indigo-600">{investments?.fixedDeposits?.length || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioOverview;
