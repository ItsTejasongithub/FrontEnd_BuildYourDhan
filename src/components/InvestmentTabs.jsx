import React from 'react';
import { LayoutDashboard, TrendingUp, Target, Landmark, Coins, BarChart3 } from 'lucide-react';

/**
 * Tabbed navigation for organizing investment categories
 * Reduces scrolling and improves focus
 */
const InvestmentTabs = ({ activeTab, onTabChange, availableInvestments }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'orange' },
    {
      id: 'stocks',
      label: 'Stocks & Funds',
      icon: TrendingUp,
      color: 'blue',
      includes: ['stocks', 'mutualFunds', 'indexFunds']
    },
    {
      id: 'fixed',
      label: 'Fixed Income',
      icon: Landmark,
      color: 'indigo',
      includes: ['savings', 'fixedDeposits']
    },
    {
      id: 'alternative',
      label: 'Alternative Assets',
      icon: Coins,
      color: 'yellow',
      includes: ['gold', 'commodities', 'reits', 'crypto', 'forex']
    },
  ];

  // Filter tabs based on available investments
  const visibleTabs = tabs.filter(tab => {
    if (tab.id === 'overview') return true;
    if (!tab.includes) return false;
    return tab.includes.some(inv => availableInvestments.includes(inv));
  });

  const getColorClasses = (color, isActive) => {
    if (isActive) {
      return {
        bg: {
          orange: 'bg-orange-600 text-white',
          blue: 'bg-blue-600 text-white',
          indigo: 'bg-indigo-600 text-white',
          yellow: 'bg-yellow-600 text-white',
          green: 'bg-green-600 text-white'
        }[color],
        border: {
          orange: 'border-orange-600',
          blue: 'border-blue-600',
          indigo: 'border-indigo-600',
          yellow: 'border-yellow-600',
          green: 'border-green-600'
        }[color]
      };
    } else {
      return {
        bg: 'bg-white text-gray-700 hover:bg-gray-50',
        border: 'border-gray-300'
      };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-2 mb-4">
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.id;
          const colors = getColorClasses(tab.color, isActive);
          const Icon = tab.icon;

          // Check if tab has new unlocks
          const hasNew = tab.includes?.some(inv => {
            // Add logic to detect newly unlocked items if needed
            return false;
          });

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg font-semibold
                transition-all duration-200 border-2
                ${colors.bg} ${colors.border}
                ${isActive ? 'shadow-lg transform scale-105' : 'hover:shadow'}
                relative
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {hasNew && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  NEW
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InvestmentTabs;
