// useGameInitialization.js - Custom hook for initializing game with proper asset loading

import { useState, useCallback } from 'react';
import { loadAssetTimeline, filterAssetsByTimeline, loadAssetData, loadFDRates } from './assetLoader';
import { 
  INDIAN_STOCKS, 
  INDEX_FUNDS, 
  MUTUAL_FUNDS, 
  COMMODITIES, 
  CRYPTO_ASSETS, 
  REIT_ASSETS, 
  GOLD_ASSETS, 
  FOREX_ASSETS,
  CATEGORY_DISPLAY_NAMES 
} from './assetDefinitions';

export const useGameInitialization = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const selectRandomAssets = useCallback((timeline, gameStartYear) => {
    const availableCategories = [];
    
    // Check which categories have sufficient data for the game duration (20 years)
    const checkCategory = (assets, category) => {
      const filtered = filterAssetsByTimeline(assets, category, gameStartYear, timeline, 20);
      return filtered.length > 0;
    };

    // Check each optional category
    if (checkCategory(MUTUAL_FUNDS, 'Mutual_Funds')) {
      availableCategories.push({ key: 'mutualFunds', name: 'Mutual Funds', category: 'Mutual_Funds' });
    }
    if (checkCategory(INDEX_FUNDS, 'Index_Funds')) {
      availableCategories.push({ key: 'indexFunds', name: 'Index Funds', category: 'Index_Funds' });
    }
    if (checkCategory(COMMODITIES, 'Commodities')) {
      availableCategories.push({ key: 'commodities', name: 'Commodities', category: 'Commodities' });
    }
    if (checkCategory(REIT_ASSETS, 'REIT')) {
      availableCategories.push({ key: 'reit', name: 'REITs', category: 'REIT' });
    }
    if (checkCategory(CRYPTO_ASSETS, 'Crypto_Assets')) {
      availableCategories.push({ key: 'crypto', name: 'Cryptocurrency', category: 'Crypto_Assets' });
    }
    if (checkCategory(FOREX_ASSETS, 'Forex')) {
      availableCategories.push({ key: 'forex', name: 'Foreign Exchange', category: 'Forex' });
    }

    // Shuffle and select 3
    const shuffled = availableCategories.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(3, shuffled.length));
    
    console.log('🎲 Random assets selected:', selected.map(s => s.name).join(', '));
    return selected;
  }, []);

  const initializeGameAssets = useCallback(async (gameStartYear) => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log(`🎮 Initializing game for year ${gameStartYear}...`);
      
      // Load asset timeline first
      const timeline = await loadAssetTimeline();
      if (Object.keys(timeline).length === 0) {
        throw new Error('Failed to load asset timeline');
      }

      // Load FD rates
      const fdRates = await loadFDRates();

      // Select random assets for years 5-7
      const randomAssets = selectRandomAssets(timeline, gameStartYear);

      // Filter all asset types based on timeline
      const filteredStocks = filterAssetsByTimeline(INDIAN_STOCKS, 'Indian_Stocks', gameStartYear, timeline);
      const filteredGold = filterAssetsByTimeline(GOLD_ASSETS, 'Gold_Investments', gameStartYear, timeline);
      
      // Load core assets
      const [stocks, gold] = await Promise.all([
        loadAssetData(filteredStocks, 'Indian_Stocks'),
        loadAssetData(filteredGold, 'Gold_Investments')
      ]);

      // Load random assets
      const randomAssetsData = {};
      for (const asset of randomAssets) {
        let assetList, folder;
        
        switch (asset.category) {
          case 'Mutual_Funds':
            assetList = MUTUAL_FUNDS;
            folder = 'Mutual_Funds';
            break;
          case 'Index_Funds':
            assetList = INDEX_FUNDS;
            folder = 'Index_Funds';
            break;
          case 'Commodities':
            assetList = COMMODITIES;
            folder = 'Commodities';
            break;
          case 'REIT':
            assetList = REIT_ASSETS;
            folder = 'REIT';
            break;
          case 'Crypto_Assets':
            assetList = CRYPTO_ASSETS;
            folder = 'Crypto_Assets';
            break;
          case 'Forex':
            assetList = FOREX_ASSETS;
            folder = 'Forex';
            break;
          default:
            continue;
        }

        const filtered = filterAssetsByTimeline(assetList, asset.category, gameStartYear, timeline);
        const loaded = await loadAssetData(filtered, folder);
        randomAssetsData[asset.key] = loaded;
      }

      console.log('✅ Game initialization complete');
      console.log(`   Stocks: ${stocks.length}`);
      console.log(`   Gold: ${gold.length}`);
      randomAssets.forEach(asset => {
        console.log(`   ${asset.name}: ${randomAssetsData[asset.key]?.length || 0}`);
      });

      setIsLoading(false);
      
      return {
        stocks,
        gold: gold[0] || null,
        fdRates,
        randomAssets: randomAssets.map(a => a.key),
        randomAssetsDisplay: randomAssets.map(a => ({ key: a.key, name: a.name })),
        ...randomAssetsData
      };

    } catch (error) {
      console.error('Failed to initialize game:', error);
      setLoadError(error.message);
      setIsLoading(false);
      return null;
    }
  }, [selectRandomAssets]);

  return { initializeGameAssets, isLoading, loadError };
};