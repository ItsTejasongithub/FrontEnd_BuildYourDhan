import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, PieChart } from 'lucide-react';

/**
 * Shows detailed investment breakdown for a player (only visible on game over screen)
 * Players can't see each other's investments during the game
 */
const PlayerInvestmentBreakdown = ({ player, rank, isCurrentPlayer, breakdown, onExpand }) => {
  const [isExpanded, setIsExpanded] = useState(isCurrentPlayer);

  // Prefer real breakdown data if provided (from server or parent); otherwise fallback to empty
  const sanitized = Array.isArray(breakdown)
    ? breakdown
        .filter(item => item && (Number(item.value) || 0) > 0)
        .map(item => ({
          category: item.category || 'Other',
          value: Number(item.value) || 0,
          color: item.color || 'bg-gray-400'
        }))
    : [];
  const totalValueRaw = sanitized.reduce((sum, item) => sum + item.value, 0);
  const totalValue = Number.isFinite(totalValueRaw) && totalValueRaw > 0 ? totalValueRaw : 0;
  const portfolioBreakdown = sanitized.map(item => ({
    ...item,
    percentage: totalValue > 0 && Number.isFinite(item.value) ? Math.round((item.value / totalValue) * 100) : 0
  }));

  const getRankColor = (rank) => {
    if (rank === 0) return 'bg-yellow-500';
    if (rank === 1) return 'bg-gray-400';
    if (rank === 2) return 'bg-orange-400';
    return 'bg-gray-300';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`rounded-lg overflow-hidden transition-all ${
      isCurrentPlayer ? 'bg-orange-50 border-2 border-orange-400' : 'bg-gray-50'
    }`}>
      {/* Player Header - Always Visible */}
      <button
        onClick={() => {
          const next = !isExpanded;
          setIsExpanded(next);
          if (next && typeof onExpand === 'function') onExpand();
        }}
        className="w-full p-4 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getRankColor(rank)}`}>
            {rank + 1}
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-800">{player.name}</div>
            {isCurrentPlayer && <div className="text-xs text-orange-600 font-semibold">You</div>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-bold text-lg">{formatCurrency(player.netWorth)}</div>
            <div className={`text-sm font-semibold ${player.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {player.growth >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
              {player.growth >= 0 ? '+' : ''}{player.growth}%
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>
      </button>

      {/* Investment Breakdown - Expandable */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-t pt-3">
            <PieChart className="w-4 h-4" />
            Investment Breakdown
          </div>
          {portfolioBreakdown.length === 0 && (
            <div className="text-sm text-gray-500 py-2">No breakdown available.</div>
          )}
          {portfolioBreakdown.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{item.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{formatCurrency(item.value)}</span>
                  <span className="font-bold text-gray-800 min-w-12 text-right">{item.percentage}%</span>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t">
            <div className="text-center">
              <div className="text-xs text-gray-600">Initial</div>
              <div className="text-sm font-bold text-gray-800">₹50,000</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">Final</div>
              <div className="text-sm font-bold text-gray-800">{formatCurrency(player.netWorth)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">Profit</div>
              <div className={`text-sm font-bold ${player.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(player.netWorth - 50000)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerInvestmentBreakdown;
