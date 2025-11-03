/* 
 * FIXED VERSION - CSV Loading & Asset Timeline Integration
 * 
 * Key Changes:
 * 1. Fixed CSV paths: /data/Indian_Stocks/, /data/Mutual_Funds/, etc.
 * 2. Added loadAssetTimeline() - Reads Asset_Timeline.csv
 * 3. Added filterAssetsByTimeline() - Filters assets by year availability  
 * 4. Added initializeGameAssets() - Comprehensive asset loading with timeline filtering
 * 5. Updated selectRandomAssets() - Uses Asset Timeline for smart selection
 * 6. Added handleCreateMultiplayerRoom() - Multiplayer with all assets
 * 7. Updated loadGameData() - Uses new initialization system
 * 8. Fixed FD rates path: /data/Fixed_Deposits/fd_rates.csv
 * 9. Gold data loads from Physical_Gold.csv correctly
 * 10. All assets filtered to ensure 20 years of data availability
 * 
 * Required folder structure:
 * public/data/
 *   ├── Indian_Stocks/
 *   ├── Mutual_Funds/
 *   ├── Index_Funds/
 *   ├── Commodities/
 *   ├── Crypto_Assets/
 *   ├── REIT/
 *   ├── Gold_Investments/
 *   ├── Forex/
 *   ├── Fixed_Deposits/
 *   └── Asset_Timeline.csv
 */

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Calendar, Trophy, IndianRupee, Play, TrendingUp, TrendingDown, X, ArrowLeft, Users, Copy, Check, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { useMultiplayer } from './hooks/useMultiplayer';
import { loadFDRates } from './utils/assetLoader';

const MONTH_DURATION = parseInt(import.meta.env.VITE_SOLO_MONTH_DURATION || '5000');
console.log('SOLO_MONTH_DURATION (raw):', import.meta.env.VITE_SOLO_MONTH_DURATION);
console.log('SOLO_MONTH_DURATION (parsed):', MONTH_DURATION);
console.log('URL:', import.meta.env.VITE_SOCKET_URL);

// Inject a small shake animation for insufficient cash feedback
let __shakeStylesInjected = false;
const ensureShakeStylesInjected = () => {
  if (__shakeStylesInjected) return;
  const style = document.createElement('style');
  style.innerHTML = `@keyframes gv3-shake { 0%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} 100%{transform:translateX(0)} } .gv3-shake { animation: gv3-shake 0.35s ease; }`;
  document.head.appendChild(style);
  __shakeStylesInjected = true;
};

// Lazy-load filename mapping so renamed CSVs can be resolved transparently
let __assetFilenameMapCache = null;
const loadAssetFilenameMap = async () => {
  if (__assetFilenameMapCache) return __assetFilenameMapCache;
  try {
    const resp = await fetch('/data/asset_filename_mapping.json');
    if (resp.ok) {
      __assetFilenameMapCache = await resp.json();
      console.log('🔗 asset_filename_mapping.json loaded');
      return __assetFilenameMapCache;
    }
  } catch (_) {}
  __assetFilenameMapCache = {};
  return __assetFilenameMapCache;
};

const resolveMappedFilename = async (folder, filename) => {
  const map = await loadAssetFilenameMap();
  if (!map || typeof map !== 'object') return filename;
  // Support both flat and per-category mappings
  if (map[filename]) return map[filename];
  if (map[folder] && map[folder][filename]) return map[folder][filename];
  // Also try id without .csv
  const base = filename.endsWith('.csv') ? filename.slice(0, -4) : filename;
  if (map[base]) return map[base];
  if (map[folder] && map[folder][base]) return map[folder][base];
  return filename;
};

const loadStockDataFromCSV = async (filename, folder = 'Indian_Stocks') => {
  try {
    const mapped = await resolveMappedFilename(folder, filename);
    if (mapped !== filename) {
      console.log(`↪️ Mapping ${filename} -> ${mapped}`);
    }
    const response = await fetch(`/data/${folder}/${mapped}`);
    if (!response.ok) {
      console.error(`Failed to fetch ${folder}/${mapped}: HTTP ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    if (lines.length < 4) {
      console.error(`${filename}: Not enough data lines`);
      return null;
    }
    
    // FIXED: Close is always column 1
    const CLOSE_COLUMN = 1;
    const DATE_COLUMN = 0;
    
    const yearlyData = {};
    let validRows = 0;
    
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length <= Math.max(DATE_COLUMN, CLOSE_COLUMN)) continue;
      
      const dateStr = parts[DATE_COLUMN];
      const closeStr = parts[CLOSE_COLUMN];
      
      if (!dateStr || !closeStr || dateStr === '' || closeStr === '') continue;
      
      try {
        const dateObj = new Date(dateStr);
        const year = dateObj.getFullYear();
        const price = parseFloat(closeStr);
        
        if (isNaN(year) || isNaN(price) || price <= 0 || year < 1990 || year > 2030) {
          continue;
        }
        
        if (!yearlyData[year]) yearlyData[year] = [];
        yearlyData[year].push(price);
        validRows++;
      } catch (e) {
        continue;
      }
    }
    
    if (validRows === 0) {
      console.error(`${filename}: No valid data rows found`);
      return null;
    }
    
    const sortedYears = Object.keys(yearlyData).map(y => parseInt(y)).sort((a, b) => a - b);
    
    if (sortedYears.length < 2) {
      console.error(`${filename}: Need at least 2 years`);
      return null;
    }
    
    const startYear = sortedYears[0];
    const endYear = sortedYears[sortedYears.length - 1];
    
    // FIXED: Create DENSE array
    const prices = [];
    for (let year = startYear; year <= endYear; year++) {
      if (yearlyData[year]) {
        const avgPrice = yearlyData[year].reduce((sum, p) => sum + p, 0) / yearlyData[year].length;
        prices.push(Math.round(avgPrice * 100) / 100);
      } else {
        prices.push(prices[prices.length - 1] || 0);
      }
    }
    
    console.log(`✅ Loaded ${mapped}: ${prices.length} years (${startYear}-${endYear}), ${validRows} rows`);
    
    return {
      prices,      // Dense array [price_0, price_1, ...]
      startYear,
      endYear,
      totalYears: prices.length
    };
    
  } catch (error) {
    console.error(`Failed to load ${folder}/${filename}:`, error.message);
    return null;
  }
};

// Load Asset Timeline for filtering
const loadAssetTimeline = async () => {
  try {
    const response = await fetch('/data/Asset_Timeline.csv');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('Asset_Timeline.csv is empty or invalid');
    }
    
    const timeline = {};
    
    // Skip header row, process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length >= 5) {
        const [category, asset, firstYear, lastYear, totalRecords] = parts;
        
        if (!timeline[category]) {
          timeline[category] = {};
        }
        
        timeline[category][asset] = {
          firstYear: parseInt(firstYear),
          lastYear: parseInt(lastYear),
          totalRecords: parseInt(totalRecords),
          yearsAvailable: parseInt(lastYear) - parseInt(firstYear) + 1
        };
      }
    }
    
    console.log('✅ Asset Timeline loaded:', {
      categories: Object.keys(timeline).length,
      totalAssets: Object.values(timeline).reduce((sum, cat) => sum + Object.keys(cat).length, 0)
    });
    
    return timeline;
    
  } catch (error) {
    console.error('❌ Failed to load Asset Timeline:', error);
    return null;
  }
};

// Load all available stocks from Asset Timeline
const loadAllStocksFromTimeline = async (timeline, gameStartYear) => {
  if (!timeline || !timeline.Indian_Stocks) {
    console.error('❌ No Indian_Stocks in timeline');
    return [];
  }
  
  // Stock name and sector mapping
  const STOCK_INFO = {
    'TATAMOTORS': { name: 'Tata Motors', sector: 'Auto' },
    'Tata Motors': { name: 'Tata Motors', sector: 'Auto' },
    'INFY': { name: 'Infosys', sector: 'IT' },
    'WIPRO': { name: 'Wipro', sector: 'IT' },
    'HDFCBANK': { name: 'HDFC Bank', sector: 'Banking' },
    'SBIN': { name: 'State Bank of India', sector: 'Banking' },
    'RELIANCE': { name: 'Reliance Industries', sector: 'Energy' },
    'ONGC': { name: 'ONGC', sector: 'Energy' },
    'M&M': { name: 'Mahindra & Mahindra', sector: 'Auto' },
    'HINDUNILVR': { name: 'Hindustan Unilever', sector: 'FMCG' },
    'ITC': { name: 'ITC Limited', sector: 'FMCG' },
    'TATACONSUM': { name: 'Tata Consumer Products', sector: 'FMCG' },
    'TITAN': { name: 'Titan Company', sector: 'Consumer' },
    'TATASTEEL': { name: 'Tata Steel', sector: 'Metals' },
    'HINDALCO': { name: 'Hindalco Industries', sector: 'Metals' },
    'SUNPHARMA': { name: 'Sun Pharmaceutical', sector: 'Pharma' },
    'Hindustan Construction': { name: 'Hindustan Construction', sector: 'Infrastructure' },
    'GAIL': { name: 'GAIL India', sector: 'Energy' },
    'AXISBANK': { name: 'Axis Bank', sector: 'Banking' },
    'KOTAKBANK': { name: 'Kotak Mahindra Bank', sector: 'Banking' },
    'TCS': { name: 'Tata Consultancy Services', sector: 'IT' },
    'HCLTECH': { name: 'HCL Technologies', sector: 'IT' },
    'ICICIBANK': { name: 'ICICI Bank', sector: 'Banking' },
    'INDUSINDBK': { name: 'IndusInd Bank', sector: 'Banking' },
    'BAJFINANCE': { name: 'Bajaj Finance', sector: 'Finance' },
    'BAJAJFINSV': { name: 'Bajaj Finserv', sector: 'Finance' },
    'SHRIRAMFIN': { name: 'Shriram Finance', sector: 'Finance' },
    'BAJAJ-AUTO': { name: 'Bajaj Auto', sector: 'Auto' },
    'HEROMOTOCO': { name: 'Hero MotoCorp', sector: 'Auto' },
    'NESTLEIND': { name: 'Nestle India', sector: 'FMCG' },
    'ASIANPAINT': { name: 'Asian Paints', sector: 'Consumer' },
    'APOLLOHOSP': { name: 'Apollo Hospitals', sector: 'Healthcare' },
    'LT': { name: 'Larsen & Toubro', sector: 'Infrastructure' },
    'ULTRACEMCO': { name: 'UltraTech Cement', sector: 'Cement' },
    'GRASIM': { name: 'Grasim Industries', sector: 'Diversified' },
    'BHARTIARTL': { name: 'Bharti Airtel', sector: 'Telecom' },
    'ADANIENT': { name: 'Adani Enterprises', sector: 'Diversified' },
    'BEL': { name: 'Bharat Electronics', sector: 'Defence' },
    'TRENT': { name: 'Trent', sector: 'Retail' },
    'Weizmann': { name: 'Weizmann Forex', sector: 'Finance' },
    'Indo National': { name: 'Indo National Limited', sector: 'Diversified' },
    'HFCL': { name: 'HFCL Limited', sector: 'Telecom' },
    'Zee Entertainment': { name: 'Zee Entertainment', sector: 'Media' },
    'Ashok Leyland': { name: 'Ashok Leyland', sector: 'Auto' },
    'ITI Limited': { name: 'ITI Limited', sector: 'Telecom' },
    'CESC Limited': { name: 'CESC Limited', sector: 'Power' },
    'Trident': { name: 'Trident Limited', sector: 'Textiles' },
    'MARUTI': { name: 'Maruti Suzuki', sector: 'Auto' },
    'JSWSTEEL': { name: 'JSW Steel', sector: 'Metals' },
    'Subex': { name: 'Subex Limited', sector: 'IT' },
    'Jindal Stainless': { name: 'Jindal Stainless', sector: 'Metals' },
    'UCO Bank': { name: 'UCO Bank', sector: 'Banking' },
    'NTPC': { name: 'NTPC Limited', sector: 'Power' },
    'Indiabulls Real Estate': { name: 'Indiabulls Real Estate', sector: 'Realty' },
    'Suzlon Energy': { name: 'Suzlon Energy', sector: 'Power' },
    'JP Power Ventures': { name: 'JP Power Ventures', sector: 'Power' },
    'Yes Bank': { name: 'Yes Bank', sector: 'Banking' },
    'Saksoft': { name: 'Saksoft Limited', sector: 'IT' },
    'TECHM': { name: 'Tech Mahindra', sector: 'IT' },
    'GVK Power & Infra': { name: 'GVK Power & Infrastructure', sector: 'Infrastructure' },
    'Vakrangee': { name: 'Vakrangee Limited', sector: 'Retail' },
    'POWERGRID': { name: 'Power Grid Corporation', sector: 'Power' },
    'ADANIPORTS': { name: 'Adani Ports', sector: 'Infrastructure' },
    'Vodafone Idea': { name: 'Vodafone Idea', sector: 'Telecom' },
    'Websol Energy Systems': { name: 'Websol Energy Systems', sector: 'Power' },
    'Dish TV India': { name: 'Dish TV India', sector: 'Media' },
    'Reliance Power': { name: 'Reliance Power', sector: 'Power' },
    'IRB Infrastructure': { name: 'IRB Infrastructure', sector: 'Infrastructure' },
    'RattanIndia Power': { name: 'RattanIndia Power', sector: 'Power' },
    'Adani Power': { name: 'Adani Power', sector: 'Power' },
    'Hindustan Copper': { name: 'Hindustan Copper', sector: 'Metals' },
    'Manappuram Finance': { name: 'Manappuram Finance', sector: 'Finance' },
    'RattanIndia Enterprises': { name: 'RattanIndia Enterprises', sector: 'Diversified' },
    'Spacenet Enterprises': { name: 'Spacenet Enterprises', sector: 'IT' },
    'INDIGO': { name: 'IndiGo Airlines', sector: 'Aviation' },
    'Brightcom Group': { name: 'Brightcom Group', sector: 'Media' },
    'Quick Heal Technologies': { name: 'Quick Heal Technologies', sector: 'IT' },
    'PNB Housing Finance': { name: 'PNB Housing Finance', sector: 'Finance' },
    'SBILIFE': { name: 'SBI Life Insurance', sector: 'Insurance' },
    'Sanginita Chemicals': { name: 'Sanginita Chemicals', sector: 'Chemicals' },
    'Vertoz': { name: 'Vertoz Advertising', sector: 'Media' },
    '5Paisa Capital': { name: '5Paisa Capital', sector: 'Finance' },
    'NACL Industries': { name: 'NACL Industries', sector: 'Chemicals' },
    'Indostar Capital Finance': { name: 'Indostar Capital Finance', sector: 'Finance' },
    'Vinny Overseas': { name: 'Vinny Overseas', sector: 'Trading' },
    'Ujjivan Small Finance Bank': { name: 'Ujjivan Small Finance Bank', sector: 'Banking' },
    'Ksolves India': { name: 'Ksolves India', sector: 'IT' },
    'MTAR Technologies': { name: 'MTAR Technologies', sector: 'Engineering' },
    'One97 Communications (Paytm)': { name: 'Paytm', sector: 'Fintech' },
    'Easy Trip Planners': { name: 'EaseMyTrip', sector: 'Travel' },
    'Railtel Corporation': { name: 'RailTel Corporation', sector: 'Telecom' },
    'Honasa Consumer': { name: 'Honasa Consumer (Mamaearth)', sector: 'Consumer' }
  };

  const stockList = [];

  // NEW APPROACH: Load ALL stocks that have ANY data overlap with game period
  // We'll filter by year during unlock, not during loading
  const gameEndYear = 2025; // Always end at 2025

  for (const [stockId, info] of Object.entries(timeline.Indian_Stocks)) {
    // Check if stock has ANY data overlap with our game period
    const hasDataDuringGame = info.lastYear >= gameStartYear && info.firstYear <= gameEndYear;

    if (hasDataDuringGame) {
      // Extract stock name from ID (remove .csv if present)
      const cleanId = stockId.replace('.csv', '');
      const stockInfo = STOCK_INFO[cleanId] || { name: cleanId, sector: 'Other' };

      stockList.push({
        id: cleanId,
        name: stockInfo.name,
        csvFile: `${cleanId}.csv`,
        sector: stockInfo.sector,
        availableFrom: info.firstYear,
        availableUntil: info.lastYear
      });
    }
  }

  console.log(`  📊 Found ${stockList.length} stocks with data overlap (${gameStartYear}-${gameEndYear})`);
  return stockList;
};

// Filter assets based on timeline
const filterAssetsByTimeline = (assets, category, gameStartYear, timeline, yearsNeeded = 20) => {
  if (!timeline[category]) {
    console.warn(`Category ${category} not found in timeline`);
    return [];
  }
  
  return assets.filter(asset => {
    const assetInfo = timeline[category][asset.id];
    if (!assetInfo) {
      console.warn(`Asset ${asset.id} not in timeline for ${category}`);
      return false;
    }
    const available = assetInfo.firstYear <= gameStartYear && 
                     assetInfo.lastYear >= gameStartYear + yearsNeeded;
    if (!available) {
      console.log(`⏭️ Skipping ${asset.id}: needs ${gameStartYear}-${gameStartYear + yearsNeeded}, has ${assetInfo.firstYear}-${assetInfo.lastYear}`);
    }
    return available;
  });
};

// FD Rates loader moved to assetLoader.js - import { loadFDRates } from './utils/assetLoader'

// Asset Categories Configuration
const ASSET_CATEGORIES = {
  Indian_Stocks: { folder: 'Indian_Stocks', displayName: 'Stocks' },
  Index_Funds: { folder: 'Index_Funds', displayName: 'Index Funds' },
  Mutual_Funds: { folder: 'Mutual_Funds', displayName: 'Mutual Funds' },
  Commodities: { folder: 'Commodities', displayName: 'Commodities' },
  Crypto_Assets: { folder: 'Crypto_Assets', displayName: 'Crypto' },
  REIT: { folder: 'REIT', displayName: 'REITs' },
  Gold_Investments: { folder: 'Gold_Investments', displayName: 'Gold' },
  Forex: { folder: 'Forex', displayName: 'Forex' }
};

// Indian Stocks List (from your CSV data)
const INDIAN_STOCKS = [
  { id: 'TCS', name: 'Tata Consultancy Services', csvFile: 'TCS.csv', sector: 'IT' },
  { id: 'INFY', name: 'Infosys', csvFile: 'INFY.csv', sector: 'IT' },
  { id: 'WIPRO', name: 'Wipro', csvFile: 'WIPRO.csv', sector: 'IT' },
  { id: 'HDFCBANK', name: 'HDFC Bank', csvFile: 'HDFCBANK.csv', sector: 'Banking' },
  { id: 'ICICIBANK', name: 'ICICI Bank', csvFile: 'ICICIBANK.csv', sector: 'Banking' },
  { id: 'SBIN', name: 'State Bank of India', csvFile: 'SBIN.csv', sector: 'Banking' },
  { id: 'RELIANCE', name: 'Reliance Industries', csvFile: 'RELIANCE.csv', sector: 'Energy' },
  { id: 'TATAMOTORS', name: 'Tata Motors', csvFile: 'TATAMOTORS.csv', sector: 'Auto' },
  { id: 'BAJFINANCE', name: 'Bajaj Finance', csvFile: 'BAJFINANCE.csv', sector: 'Finance' },
  { id: 'MARUTI', name: 'Maruti Suzuki', csvFile: 'MARUTI.csv', sector: 'Auto' },
  // Add more as needed
];

const INDEX_FUNDS = [
  { id: 'UTINIFTETF', name: 'UTI Nifty ETF', csvFile: 'UTINIFTETF.csv' },
  { id: 'HDFCNIFETF', name: 'HDFC Nifty ETF', csvFile: 'HDFCNIFETF.csv' },
  { id: 'NIFTYBEES', name: 'Nifty BeES', csvFile: 'NIFTYBEES.csv' },
];

const MUTUAL_FUNDS = [
  { id: 'SBI_Bluechip', name: 'SBI Bluechip Fund', csvFile: 'SBI_Bluechip.csv' },
  { id: 'ICICI_Bluechip', name: 'ICICI Bluechip Fund', csvFile: 'ICICI_Bluechip.csv' },
];

const COMMODITIES = [
  { id: 'SILVER', name: 'Silver', csvFile: 'SILVER.csv' },
  { id: 'CRUDEOIL_WTI', name: 'Crude Oil WTI', csvFile: 'CRUDEOIL_WTI.csv' },
  { id: 'COPPER', name: 'Copper', csvFile: 'COPPER.csv' },
];

const CRYPTO_ASSETS = [
  { id: 'BTC', name: 'Bitcoin', csvFile: 'BTC.csv' },
  { id: 'ETH', name: 'Ethereum', csvFile: 'ETH.csv' },
];

const REIT_ASSETS = [
  { id: 'EMBASSY', name: 'Embassy REIT', csvFile: 'EMBASSY.csv' },
  { id: 'MINDSPACE', name: 'Mindspace REIT', csvFile: 'MINDSPACE.csv' },
];

const GOLD_ASSETS = [
  { id: 'Physical_Gold', name: 'Physical Gold', csvFile: 'Physical_Gold.csv' },
];

const FOREX_ASSETS = [
  { id: 'USDINR', name: 'USD/INR', csvFile: 'USDINR.csv' },
  { id: 'EURINR', name: 'EUR/INR', csvFile: 'EURINR.csv' },
  { id: 'GBPINR', name: 'GBP/INR', csvFile: 'GBPINR.csv' },
];
// Fallback hardcoded data if CSV fails
const FALLBACK_STOCK_DATA = {
  stocks: [
    { id: 'reliance', name: 'Reliance Industries', symbol: 'RELIANCE', sector: 'Energy', prices: [500, 520, 510, 530, 480, 550, 590, 560, 620, 680, 720, 760, 810, 1100, 920, 980, 1250, 1550, 1880, 2120, 2500], startYear: 1996 },
    { id: 'tcs', name: 'Tata Consultancy Services', symbol: 'TCS', sector: 'IT', prices: [600, 620, 650, 680, 620, 720, 780, 750, 850, 950, 1020, 1180, 1350, 1800, 1650, 1750, 2100, 2550, 2950, 3350, 3800], startYear: 2004 },
    { id: 'hdfc', name: 'HDFC Bank', symbol: 'HDFCBANK', sector: 'Banking', prices: [300, 320, 340, 360, 330, 380, 420, 400, 450, 510, 580, 650, 720, 950, 880, 920, 1100, 1350, 1550, 1650, 1700], startYear: 1995 },
    { id: 'infosys', name: 'Infosys', symbol: 'INFY', sector: 'IT', prices: [250, 270, 280, 300, 260, 320, 350, 320, 380, 440, 490, 560, 650, 870, 780, 820, 1000, 1250, 1450, 1550, 1600], startYear: 1993 },
    { id: 'icici', name: 'ICICI Bank', symbol: 'ICICIBANK', sector: 'Banking', prices: [150, 160, 170, 180, 155, 190, 210, 185, 230, 280, 330, 390, 450, 620, 550, 580, 720, 850, 950, 1000, 1050], startYear: 1998 },
    { id: 'wipro', name: 'Wipro', symbol: 'WIPRO', sector: 'IT', prices: [200, 210, 220, 230, 200, 240, 260, 240, 280, 320, 350, 390, 430, 580, 520, 540, 650, 750, 820, 880, 920], startYear: 1996 }
  ],
  gold: { prices: [350, 385, 412, 445, 478, 510, 548, 585, 625, 680, 750, 830, 920, 1100, 1250, 1420, 1650, 1880, 2150, 2450, 2800], startYear: 1990 }
};

// Event pool for random selection
const EVENT_POOL = {
  losses: [
    { message: 'House robbery during Diwali', amount: -15000 },
    { message: 'Family medical emergency', amount: -30000 },
    { message: 'Vehicle repair after monsoon', amount: -20000 },
    { message: 'Wedding shopping expenses', amount: -15000 },
    { message: 'Health insurance deductible', amount: -25000 },
    { message: 'Home repairs after flooding', amount: -45000 },
    { message: 'Laptop suddenly stopped working', amount: -50000 },
    { message: 'Legal fees for property dispute', amount: -35000 },
    { message: 'AC breakdown in peak summer', amount: -18000 },
    { message: 'Parent hospitalization costs', amount: -40000 },
    { message: 'Car accident - insurance excess', amount: -22000 },
    { message: 'Stolen mobile phone', amount: -12000 },
    { message: 'Urgent home appliance replacement', amount: -28000 },
    { message: 'Child school fees increase', amount: -15000 },
    { message: 'Unexpected tax liability', amount: -35000 },
    { message: 'Emergency dental treatment', amount: -18000 },
    { message: 'Bike accident repair', amount: -14000 },
    { message: 'Flooding damaged furniture', amount: -25000 },
    { message: 'Friend wedding gift expected', amount: -10000 },
    { message: 'Pet medical emergency', amount: -20000 }
  ],
  gains: [
    { message: 'Diwali bonus from company', amount: 50000 },
    { message: 'Freelance project bonus', amount: 40000 },
    { message: 'Side business profit', amount: 35000 },
    { message: 'Performance bonus at work', amount: 45000 },
    { message: 'Tax refund received', amount: 20000 },
    { message: 'Sold old items online', amount: 15000 },
    { message: 'Investment dividend received', amount: 30000 }
  ]
  // NOTE: Unlocks are now timeline-based in generateTimelineBasedEvents()
  // Old fixed-year unlocks removed - assets unlock when data becomes available
};

/**
 * NEW TIMELINE-BASED EVENT GENERATION
 * Assets unlock when game year reaches their availability in Asset_Timeline.csv
 *
 * Fixed unlocks:
 * - Year 0: Savings Account
 * - Year 1: Fixed Deposits
 *
 * Timeline-based unlocks (when data becomes available):
 * - Stocks, Gold, MF/Index, Commodities, Crypto, REIT
 *
 * Special cases:
 * - REIT: Embassy unlocks at 2019, Mindspace at 2020
 * - Crypto: BTC + ETH unlock together when both available
 */
const generateTimelineBasedEvents = (gameAssets, gameStartYear, gameEndYear = 2025) => {
  const events = {};
  const usedLossEvents = new Set();
  const usedGainEvents = new Set();

  console.log('\n🗓️ Generating Timeline-Based Events...');
  console.log(`   Game Period: ${gameStartYear} to ${gameEndYear} (${gameEndYear - gameStartYear} years)`);

  // Year 0: Savings (always)
  events[0] = { type: 'unlock', message: 'Savings Account ready', unlock: 'savings' };

  // Year 1: Fixed Deposits (always)
  events[1] = { type: 'unlock', message: 'Fixed Deposits now available', unlock: 'fixedDeposits' };

  // NEW APPROACH: Collect all categories with their earliest unlock years
  const categoryUnlocks = [];

  if (gameAssets.stocks && gameAssets.stocks.length > 0) {
    const overlapStocks = gameAssets.stocks.filter(s => s.endYear >= gameStartYear && s.startYear <= gameEndYear);
    if (overlapStocks.length > 0) {
      const earliestYear = Math.min(...overlapStocks.map(s => s.startYear));
      categoryUnlocks.push({ category: 'stocks', name: 'Stock Market', unlockYear: earliestYear, message: 'Stock market access unlocked' });
    }
  }

  if (gameAssets.gold && gameAssets.gold.startYear) {
    if (gameAssets.gold.endYear >= gameStartYear && gameAssets.gold.startYear <= gameEndYear) {
      categoryUnlocks.push({ category: 'gold', name: 'Gold', unlockYear: gameAssets.gold.startYear, message: 'Gold investment unlocked' });
    }
  }

  if (gameAssets.mutualFunds && gameAssets.mutualFunds.length > 0) {
    const overlapMF = gameAssets.mutualFunds.filter(m => m.endYear >= gameStartYear && m.startYear <= gameEndYear);
    if (overlapMF.length > 0) {
      const earliestYear = Math.min(...overlapMF.map(m => m.startYear));
      categoryUnlocks.push({ category: 'mutualFunds', name: 'Mutual Funds', unlockYear: earliestYear, message: 'Mutual Funds now available' });
    }
  }

  if (gameAssets.indexFunds && gameAssets.indexFunds.length > 0) {
    const overlapIndex = gameAssets.indexFunds.filter(i => i.endYear >= gameStartYear && i.startYear <= gameEndYear);
    if (overlapIndex.length > 0) {
      const earliestYear = Math.min(...overlapIndex.map(i => i.startYear));
      categoryUnlocks.push({ category: 'indexFunds', name: 'Index Funds', unlockYear: earliestYear, message: 'Index Funds now available' });
    }
  }

  if (gameAssets.commodities && gameAssets.commodities.length > 0) {
    const overlapCom = gameAssets.commodities.filter(c => c.endYear >= gameStartYear && c.startYear <= gameEndYear);
    if (overlapCom.length > 0) {
      const earliestYear = Math.min(...overlapCom.map(c => c.startYear));
      categoryUnlocks.push({ category: 'commodities', name: 'Commodities', unlockYear: earliestYear, message: 'Commodity trading unlocked' });
    }
  }

  if (gameAssets.crypto && gameAssets.crypto.length > 0) {
    const btcAsset = gameAssets.crypto.find(c => c.id === 'BTC');
    if (btcAsset && btcAsset.startYear && btcAsset.endYear >= gameStartYear && btcAsset.startYear <= gameEndYear) {
      categoryUnlocks.push({ category: 'crypto', name: 'Cryptocurrency', unlockYear: btcAsset.startYear, message: 'Cryptocurrency trading unlocked (Bitcoin)', subkey: 'BTC' });
    }
    const ethAsset = gameAssets.crypto.find(c => c.id === 'ETH');
    if (ethAsset && ethAsset.startYear && ethAsset.endYear >= gameStartYear && ethAsset.startYear <= gameEndYear) {
      categoryUnlocks.push({ category: 'crypto', name: 'Cryptocurrency', unlockYear: ethAsset.startYear, message: 'New cryptocurrency available (Ethereum)', subkey: 'ETH' });
    }
  }

  if (gameAssets.reit && gameAssets.reit.length > 0) {
    const embassyAsset = gameAssets.reit.find(r => r.id === 'EMBASSY');
    if (embassyAsset && embassyAsset.startYear && embassyAsset.endYear >= gameStartYear && embassyAsset.startYear <= gameEndYear) {
      categoryUnlocks.push({ category: 'reit', name: 'REIT', unlockYear: embassyAsset.startYear, message: 'REIT investment unlocked (Embassy)', subkey: 'EMBASSY' });
    }
    const mindspaceAsset = gameAssets.reit.find(r => r.id === 'MINDSPACE');
    if (mindspaceAsset && mindspaceAsset.startYear && mindspaceAsset.endYear >= gameStartYear && mindspaceAsset.startYear <= gameEndYear) {
      categoryUnlocks.push({ category: 'reit', name: 'REIT', unlockYear: mindspaceAsset.startYear, message: 'New REIT available (Mindspace)', subkey: 'MINDSPACE' });
    }
  }

  if (gameAssets.forex && gameAssets.forex.length > 0) {
    const overlapFX = gameAssets.forex.filter(f => f.endYear >= gameStartYear && f.startYear <= gameEndYear);
    if (overlapFX.length > 0) {
      const earliestYear = Math.min(...overlapFX.map(f => f.startYear));
      categoryUnlocks.push({ category: 'forex', name: 'Forex', unlockYear: earliestYear, message: 'Forex trading unlocked' });
    }
  }

  // Sort categories by their earliest unlock year
  categoryUnlocks.sort((a, b) => a.unlockYear - b.unlockYear);

  console.log('\n📅 Categories by unlock year:');
  categoryUnlocks.forEach(cat => console.log(`   ${cat.name}: ${cat.unlockYear}`));

  // NEW STRATEGY: Unlock assets based on ACTUAL DATA AVAILABILITY
  // Calculate year offset from game start for each category
  const unlockSchedule = [];

  for (const categoryInfo of categoryUnlocks) {
    // Calculate which game year this category should unlock
    let yearOffset = categoryInfo.unlockYear - gameStartYear;
    if (yearOffset < 0) yearOffset = 0; // unlock immediately if already available

    // Only unlock if within game duration
    if (gameStartYear + yearOffset <= gameEndYear) {
      unlockSchedule.push({
        year: yearOffset,
        key: categoryInfo.category,
        name: categoryInfo.name,
        message: categoryInfo.message,
        subkey: categoryInfo.subkey,
        dataStartYear: categoryInfo.unlockYear
      });
      console.log(`   ${categoryInfo.name}: data from ${categoryInfo.unlockYear}, unlock at Year ${yearOffset} (${gameStartYear + yearOffset})`);
    } else {
      console.log(`   ⏭️ Skipping ${categoryInfo.name}: data starts ${categoryInfo.unlockYear}, outside game period`);
    }
  }

  console.log('\n📅 Unlock Schedule:');
  unlockSchedule.forEach(u => {
    const absoluteYear = gameStartYear + u.year;
    console.log(`   Year ${u.year} (${absoluteYear}): ${u.name}`);

    // Add to events (skip if year is 0 or 1, already used for savings/FD)
    if (u.year >= 0 && u.year < 20) {
      if (!events[u.year]) {
        events[u.year] = { type: 'unlock', message: u.message, unlock: u.key, subkey: u.subkey };
      } else {
        // If year already has an unlock, add to next available year
        let nextYear = u.year + 1;
        while (events[nextYear] && nextYear < 20) nextYear++;
        if (nextYear < 20) {
          events[nextYear] = { type: 'unlock', message: u.message, unlock: u.key, subkey: u.subkey };
        }
      }
    }
  });

  // Generate random loss/gain events in remaining years
  let nextEventMonth = Math.floor(Math.random() * 12) + 24; // First event between month 24-36

  while (nextEventMonth < 240) {
    const eventYear = Math.floor(nextEventMonth / 12);

    // Skip if year already has an unlock event
    if (!events[eventYear]) {
      // 60% chance of loss, 40% chance of gain
      const isLoss = Math.random() < 0.6;

      if (isLoss) {
        let eventIndex;
        let attempts = 0;
        do {
          eventIndex = Math.floor(Math.random() * EVENT_POOL.losses.length);
          attempts++;
        } while (usedLossEvents.has(eventIndex) && attempts < 20);

        usedLossEvents.add(eventIndex);
        const lossEvent = EVENT_POOL.losses[eventIndex];
        events[eventYear] = { type: 'loss', message: lossEvent.message, amount: lossEvent.amount };
      } else {
        let eventIndex;
        let attempts = 0;
        do {
          eventIndex = Math.floor(Math.random() * EVENT_POOL.gains.length);
          attempts++;
        } while (usedGainEvents.has(eventIndex) && attempts < 20);

        usedGainEvents.add(eventIndex);
        const gainEvent = EVENT_POOL.gains[eventIndex];
        events[eventYear] = { type: 'gain', message: gainEvent.message, amount: gainEvent.amount };
      }
    }

    // Next event in 24-36 months
    nextEventMonth += Math.floor(Math.random() * 13) + 24;
  }

  console.log(`✅ Generated ${Object.keys(events).length} total events\n`);

  return events;
};


/**
 * NEW DYNAMIC ASSET SELECTION SYSTEM (V2)
 * Total 9 categories: Savings (always Year 0), FD (always Year 1), + 7 others
 * Optional categories: Stocks, MF/Index (exclusive), Gold, Commodities, Crypto, REIT, Forex
 * Randomly select 5 from 7 remaining categories (total 7 unlockable per game)
 *
 * This function now works WITHOUT a game year - we select categories first!
 */
const selectRandomAssets = async (gameStartYear, timeline) => {
  console.log('\n🎲 ============================================');
  console.log('   DYNAMIC ASSET SELECTION (No Year Yet)');
  console.log('============================================');

  // Step 1: Decide MF OR Index Fund (exclusive choice)
  const useMutualFunds = Math.random() < 0.5;
  console.log(`\n📊 MF/Index Decision: ${useMutualFunds ? 'Mutual Funds (3)' : 'Index Funds (2)'}`);

  // Step 2: Define all 7 optional categories (Savings & FD always included)
  const allCategories = [
    { key: 'stocks', name: 'Stocks', include: true },
    { key: 'mutualFunds', name: 'Mutual Funds', include: useMutualFunds },
    { key: 'indexFunds', name: 'Index Funds', include: !useMutualFunds },
    { key: 'gold', name: 'Gold', include: true },
    { key: 'commodities', name: 'Commodities', include: true },
    { key: 'crypto', name: 'Crypto', include: true },
    { key: 'reit', name: 'REIT', include: true },
    { key: 'forex', name: 'Forex', include: true }
  ];

  // Filter to only included categories
  const includedCategories = allCategories.filter(cat => cat.include);

  // Step 3: Randomly exclude 2 categories (to get 5 out of 7)
  const shuffled = includedCategories.sort(() => Math.random() - 0.5);
  const selectedCategories = shuffled.slice(0, 5);

  console.log('\n✅ Selected Categories (Total 7 with Savings + FD):');
  console.log('   - Savings Account (Always Year 0)');
  console.log('   - Fixed Deposits (Always Year 1)');
  selectedCategories.forEach(cat => console.log(`   - ${cat.name}`));

  const excluded = shuffled.slice(5);
  if (excluded.length > 0) {
    console.log(`\n❌ Excluded this session: ${excluded.map(c => c.name).join(', ')}`);
  }

  console.log('============================================\n');

  return selectedCategories;
};

/**
 * Find the latest introduction year among selected asset categories
 */
const findLatestIntroductionYear = async (selectedCategories, timeline) => {
  console.log('\n📅 Finding latest introduction year...');

  let latestYear = 1990; // Default minimum

  for (const category of selectedCategories) {
    let categoryEarliestYear = 1990; // Find when this category FIRST becomes available

    switch (category.key) {
      case 'stocks':
        if (timeline.Indian_Stocks) {
          const stockYears = Object.values(timeline.Indian_Stocks).map(s => s.firstYear);
          const validYears = stockYears.filter(y => y >= 1990 && y <= 2025);
          if (validYears.length > 0) {
            categoryEarliestYear = Math.min(...validYears); // Find EARLIEST available
          }
        }
        break;

      case 'mutualFunds':
        if (timeline.Mutual_Funds) {
          const mfYears = Object.values(timeline.Mutual_Funds).map(m => m.firstYear);
          const validYears = mfYears.filter(y => y >= 1990 && y <= 2025);
          if (validYears.length > 0) {
            categoryEarliestYear = Math.min(...validYears);
          }
        }
        break;

      case 'indexFunds':
        if (timeline.Index_Funds) {
          const indexYears = Object.values(timeline.Index_Funds).map(i => i.firstYear);
          const validYears = indexYears.filter(y => y >= 1990 && y <= 2025);
          if (validYears.length > 0) {
            categoryEarliestYear = Math.min(...validYears);
          }
        }
        break;

      case 'commodities':
        if (timeline.Commodities) {
          const commodityYears = Object.values(timeline.Commodities).map(c => c.firstYear);
          const validYears = commodityYears.filter(y => y >= 1990 && y <= 2025);
          if (validYears.length > 0) {
            categoryEarliestYear = Math.min(...validYears);
          }
        }
        break;

      case 'crypto':
        if (timeline.Crypto_Assets) {
          const cryptoYears = Object.values(timeline.Crypto_Assets).map(c => c.firstYear);
          const validYears = cryptoYears.filter(y => y >= 1990 && y <= 2025);
          if (validYears.length > 0) {
            // Progressive within category: use latest of BTC/ETH starts to ensure both fit
            categoryEarliestYear = Math.max(...validYears);
          }
        }
        break;

      case 'reit':
        if (timeline.REIT) {
          const reitYears = Object.values(timeline.REIT).map(r => r.firstYear);
          const validYears = reitYears.filter(y => y >= 1990 && y <= 2025);
          if (validYears.length > 0) {
            // Progressive within category: Embassy then Mindspace -> use latest start
            categoryEarliestYear = Math.max(...validYears);
          }
        }
        break;

      case 'gold':
        if (timeline.Gold_Investments) {
          const goldYears = Object.values(timeline.Gold_Investments).map(g => g.firstYear);
          const validYears = goldYears.filter(y => y >= 1990 && y <= 2025);
          if (validYears.length > 0) {
            categoryEarliestYear = Math.min(...validYears);
          }
        }
        break;
    }

    console.log(`   ${category.name}: earliest available ${categoryEarliestYear}`);

    // Find which category has the LATEST earliest-year (last to become available)
    if (categoryEarliestYear > latestYear) {
      latestYear = categoryEarliestYear;
    }
  }

  console.log(`\n   Latest introduction year: ${latestYear}`);
  return latestYear;
};






/**
 * Find the latest data end year among selected asset categories
 * Uses Asset_Timeline.csv lastYear field
 */
const findLatestAssetEndYear = async (selectedCategories, timeline) => {
  console.log('\n📅 Finding latest data end year...');

  let latestEndYear = 1990; // Default minimum

  for (const category of selectedCategories) {
    let categoryLatestEnd = 1990;

    switch (category.key) {
      case 'stocks':
        if (timeline.Indian_Stocks) {
          const years = Object.values(timeline.Indian_Stocks).map(s => s.lastYear);
          const valid = years.filter(y => y >= 1990 && y <= 2025);
          if (valid.length > 0) categoryLatestEnd = Math.max(...valid);
        }
        break;

      case 'mutualFunds':
        if (timeline.Mutual_Funds) {
          const years = Object.values(timeline.Mutual_Funds).map(m => m.lastYear);
          const valid = years.filter(y => y >= 1990 && y <= 2025);
          if (valid.length > 0) categoryLatestEnd = Math.max(...valid);
        }
        break;

      case 'indexFunds':
        if (timeline.Index_Funds) {
          const years = Object.values(timeline.Index_Funds).map(i => i.lastYear);
          const valid = years.filter(y => y >= 1990 && y <= 2025);
          if (valid.length > 0) categoryLatestEnd = Math.max(...valid);
        }
        break;

      case 'commodities':
        if (timeline.Commodities) {
          const years = Object.values(timeline.Commodities).map(c => c.lastYear);
          const valid = years.filter(y => y >= 1990 && y <= 2025);
          if (valid.length > 0) categoryLatestEnd = Math.max(...valid);
        }
        break;

      case 'crypto':
        if (timeline.Crypto_Assets) {
          const years = Object.values(timeline.Crypto_Assets).map(c => c.lastYear);
          const valid = years.filter(y => y >= 1990 && y <= 2025);
          if (valid.length > 0) categoryLatestEnd = Math.max(...valid);
        }
        break;

      case 'reit':
        if (timeline.REIT) {
          const years = Object.values(timeline.REIT).map(r => r.lastYear);
          const valid = years.filter(y => y >= 1990 && y <= 2025);
          if (valid.length > 0) categoryLatestEnd = Math.max(...valid);
        }
        break;

      case 'gold':
        if (timeline.Gold_Investments) {
          const years = Object.values(timeline.Gold_Investments).map(g => g.lastYear);
          const valid = years.filter(y => y >= 1990 && y <= 2025);
          if (valid.length > 0) categoryLatestEnd = Math.max(...valid);
        }
        break;

      case 'forex':
        if (timeline.Forex) {
          const years = Object.values(timeline.Forex).map(f => f.lastYear);
          const valid = years.filter(y => y >= 1990 && y <= 2025);
          if (valid.length > 0) categoryLatestEnd = Math.max(...valid);
        }
        break;
    }

    if (categoryLatestEnd > latestEndYear) {
      latestEndYear = categoryLatestEnd;
    }
  }

  console.log(`\n   Latest data end year: ${latestEndYear}`);
  return latestEndYear;
};


// NEW V2: Initialize game assets (loads ALL assets from selected categories, no year filtering)
const initializeGameAssetsV2 = async (gameStartYear, gameEndYear, selectedCategories, timeline) => {
  console.log(`\n🎮 ============================================`);
  console.log(`   Initializing Game Assets (V2)`);
  console.log(`============================================`);
  console.log(`   Start Year: ${gameStartYear}`);
  console.log(`   End Year: ${gameEndYear}`);

  try {
    // Step 1: Load FD Rates
    console.log('\n💰 Loading FD Rates...');
    const fdRates = await loadFDRates();

    // Step 2: Load ALL assets from selected categories (NO year filtering yet)
    console.log('\n📦 Loading Selected Asset Categories...');
    const gameAssets = {};

    for (const category of selectedCategories) {
      console.log(`\n  📦 Loading ${category.name}...`);

      switch (category.key) {
        case 'stocks':
          // Load ALL available stocks
          const allStocks = await loadAllStocksFromTimeline(timeline, 1990); // Load from earliest year
          const stockCount = Math.floor(Math.random() * 3) + 2; // 2-4 stocks
          const selectedStocks = allStocks.sort(() => Math.random() - 0.5).slice(0, stockCount);

          const loadedStocks = [];
          for (const stockMeta of selectedStocks) {
            const data = await loadStockDataFromCSV(stockMeta.csvFile, 'Indian_Stocks');
            if (data && data.prices) {
              loadedStocks.push({ ...stockMeta, prices: data.prices, startYear: data.startYear, endYear: data.endYear });
            }
          }
          gameAssets.stocks = loadedStocks;
          console.log(`    ✅ Loaded ${loadedStocks.length} stocks`);
          break;

        case 'gold':
          const goldAssets = GOLD_ASSETS;
          if (goldAssets.length > 0) {
            const goldData = await loadStockDataFromCSV(goldAssets[0].csvFile, 'Gold_Investments');
            if (goldData && goldData.prices) {
              gameAssets.gold = { ...goldAssets[0], prices: goldData.prices, startYear: goldData.startYear, endYear: goldData.endYear };
              console.log(`    ✅ Gold loaded`);
            }
          }
          break;

        case 'mutualFunds':
          const allMFs = MUTUAL_FUNDS;
          const selectedMFs = allMFs.sort(() => Math.random() - 0.5).slice(0, 3);
          const loadedMFs = [];
          for (const mf of selectedMFs) {
            const data = await loadStockDataFromCSV(mf.csvFile, 'Mutual_Funds');
            if (data && data.prices) {
              loadedMFs.push({ ...mf, prices: data.prices, startYear: data.startYear, endYear: data.endYear });
            }
          }
          gameAssets.mutualFunds = loadedMFs;
          console.log(`    ✅ Loaded ${loadedMFs.length} Mutual Funds`);
          break;

        case 'indexFunds':
          const allIndexFunds = INDEX_FUNDS;
          const selectedIndexFunds = allIndexFunds.sort(() => Math.random() - 0.5).slice(0, 2);
          const loadedIndexFunds = [];
          for (const fund of selectedIndexFunds) {
            const data = await loadStockDataFromCSV(fund.csvFile, 'Index_Funds');
            if (data && data.prices) {
              loadedIndexFunds.push({ ...fund, prices: data.prices, startYear: data.startYear, endYear: data.endYear });
            }
          }
          gameAssets.indexFunds = loadedIndexFunds;
          console.log(`    ✅ Loaded ${loadedIndexFunds.length} Index Funds`);
          break;

        case 'commodities':
          const allCommodities = COMMODITIES;
          const commodityCount = Math.min(3, allCommodities.length);
          const selectedCommodities = allCommodities.sort(() => Math.random() - 0.5).slice(0, commodityCount);
          const loadedCommodities = [];
          for (const commodity of selectedCommodities) {
            const data = await loadStockDataFromCSV(commodity.csvFile, 'Commodities');
            if (data && data.prices) {
              loadedCommodities.push({ ...commodity, prices: data.prices, startYear: data.startYear, endYear: data.endYear });
            }
          }
          gameAssets.commodities = loadedCommodities;
          console.log(`    ✅ Loaded ${loadedCommodities.length} Commodities`);
          break;

        case 'crypto':
          const allCrypto = CRYPTO_ASSETS;
          const loadedCrypto = [];
          for (const crypto of allCrypto) {
            const data = await loadStockDataFromCSV(crypto.csvFile, 'Crypto_Assets');
            if (data && data.prices) {
              loadedCrypto.push({ ...crypto, prices: data.prices, startYear: data.startYear, endYear: data.endYear });
            }
          }
          gameAssets.crypto = loadedCrypto;
          console.log(`    ✅ Loaded ${loadedCrypto.length} Crypto assets`);
          break;

        case 'reit':
          const allREITs = REIT_ASSETS;
          const loadedREITs = [];
          for (const reit of allREITs) {
            const data = await loadStockDataFromCSV(reit.csvFile, 'REIT');
            if (data && data.prices) {
              loadedREITs.push({ ...reit, prices: data.prices, startYear: data.startYear, endYear: data.endYear });
            }
          }
          gameAssets.reit = loadedREITs;
          console.log(`    ✅ Loaded ${loadedREITs.length} REITs`);
          break;

        case 'forex':
          const allForex = FOREX_ASSETS;
          const loadedForex = [];
          for (const forex of allForex) {
            const data = await loadStockDataFromCSV(forex.csvFile, 'Forex');
            if (data && data.prices) {
              loadedForex.push({ ...forex, prices: data.prices, startYear: data.startYear, endYear: data.endYear });
            }
          }
          gameAssets.forex = loadedForex;
          console.log(`    ✅ Loaded ${loadedForex.length} Forex pairs`);
          break;
      }
    }

    console.log('\n✅ ============================================');
    console.log('   Asset Loading Complete!');
    console.log('============================================\n');

    return {
      ...gameAssets,
      fdRates,
      randomAssets: selectedCategories.map(c => c.key),
      randomAssetsDisplay: selectedCategories,
      startYear: gameStartYear,
      endYear: gameEndYear
    };

  } catch (error) {
    console.error('❌ Failed to initialize game assets:', error);
    return null;
  }
};

// OLD: Initialize game with Asset Timeline filtering (DEPRECATED)
const initializeGameAssets = async (gameStartYear) => {
  console.log(`\n🎮 ============================================`);
  console.log(`   Initializing Game for Year ${gameStartYear}`);
  console.log(`============================================`);
  
  try {
    // Step 1: Load Asset Timeline
    console.log('\n📋 Step 1: Loading Asset Timeline...');
    const timeline = await loadAssetTimeline();
    
    if (!timeline) {
      throw new Error('Failed to load Asset Timeline');
    }
    
    // Step 2: Load FD Rates
    console.log('\n💰 Step 2: Loading FD Rates...');
    const fdRates = await loadFDRates();
    
    // Step 3: Select Random Assets for years 5-7
    console.log('\n🎲 Step 3: Selecting Random Asset Categories...');
    const randomAssetCategories = await selectRandomAssets(gameStartYear, timeline);
    
    if (randomAssetCategories.length === 0) {
      console.warn('⚠️ No random assets available!');
    }
    
    // Step 4: Filter and Load Core Assets
    console.log('\n📊 Step 4: Loading Core Assets...');
    
    // Step 4: Load Asset Categories Based on Selection
    console.log('\n🎁 Step 5: Loading Random Asset Categories...');
    const randomAssetsData = {};
    
    for (const category of randomAssetCategories) {
      console.log(`\n  📦 Loading ${category.name}...`);

      let assetList, folder, maxSelection;

      switch (category.key) {
        case 'stocks':
          // Load all stocks and select 2-4 random
          const allStocks = await loadAllStocksFromTimeline(timeline, gameStartYear);
          if (allStocks.length === 0) {
            console.warn('  ⚠️ No stocks available from timeline');
            continue;
          }
          const minStocks = 2;
          const maxStocks = 4;
          const numStocks = Math.floor(Math.random() * (maxStocks - minStocks + 1)) + minStocks;
          assetList = allStocks.sort(() => Math.random() - 0.5).slice(0, numStocks);
          folder = 'Indian_Stocks';
          maxSelection = numStocks;
          console.log(`  🎲 Selecting ${numStocks} random stocks from ${allStocks.length} available`);
          break;

        case 'gold':
          // Load gold (Physical_Gold.csv)
          assetList = filterAssetsByTimeline(GOLD_ASSETS, 'Gold_Investments', gameStartYear, timeline, 20);
          folder = 'Gold_Investments';
          maxSelection = 1; // Only one gold asset
          console.log(`  ✅ Loading Gold investment`);
          break;

        case 'mutualFunds':
          // Select 3 random Mutual Funds
          assetList = filterAssetsByTimeline(MUTUAL_FUNDS, 'Mutual_Funds', gameStartYear, timeline, 20);
          folder = 'Mutual_Funds';
          maxSelection = 3;
          console.log(`  🎲 Selecting 3 random Mutual Funds from ${assetList.length} available`);
          break;

        case 'indexFunds':
          // Select 2 random Index Funds
          assetList = filterAssetsByTimeline(INDEX_FUNDS, 'Index_Funds', gameStartYear, timeline, 20);
          folder = 'Index_Funds';
          maxSelection = 2;
          console.log(`  🎲 Selecting 2 random Index Funds from ${assetList.length} available`);
          break;

        case 'commodities':
          // Select max 3 random commodities
          assetList = filterAssetsByTimeline(COMMODITIES, 'Commodities', gameStartYear, timeline, 20);
          folder = 'Commodities';
          maxSelection = Math.min(3, assetList.length);
          console.log(`  🎲 Selecting ${maxSelection} random Commodities from ${assetList.length} available`);
          break;

        case 'reit':
          // Include all REITs but will unlock progressively (Embassy 2019, Mindspace 2020)
          assetList = filterAssetsByTimeline(REIT_ASSETS, 'REIT', gameStartYear, timeline, 20);
          folder = 'REIT';
          maxSelection = assetList.length; // Include all, unlock progressively
          console.log(`  ✅ Including all ${assetList.length} REITs (progressive unlock)`);
          break;

        case 'crypto':
          // Include both BTC + ETH together
          assetList = filterAssetsByTimeline(CRYPTO_ASSETS, 'Crypto_Assets', gameStartYear, timeline, 20);
          folder = 'Crypto_Assets';
          maxSelection = assetList.length; // Include all (should be BTC + ETH)
          console.log(`  ✅ Including both BTC + ETH (unlock together)`);
          break;

        case 'forex':
          assetList = filterAssetsByTimeline(FOREX_ASSETS, 'Forex', gameStartYear, timeline, 20);
          folder = 'Forex';
          maxSelection = assetList.length;
          break;

        default:
          console.warn(`  ⚠️ Unknown category: ${category.key}`);
          continue;
      }

      // Random selection for categories that need it
      if (maxSelection && maxSelection < assetList.length) {
        assetList = assetList.sort(() => Math.random() - 0.5).slice(0, maxSelection);
      }

      const loaded = [];
      for (const assetMeta of assetList) {
        const data = await loadStockDataFromCSV(assetMeta.csvFile, folder);
        if (data && data.prices && data.prices.length >= 20) {
          loaded.push({
            ...assetMeta,
            prices: data.prices,
            startYear: data.startYear,
            endYear: data.endYear
          });
        }
      }

      randomAssetsData[category.key] = loaded;
      console.log(`  ✅ ${category.name}: ${loaded.length} assets loaded`);
    }
    
    // Step 6: Extract stocks and gold from randomAssetsData (they get special treatment)
    let stocks = [];
    let gold = null;

    if (randomAssetsData.stocks && randomAssetsData.stocks.length > 0) {
      stocks = randomAssetsData.stocks;
      delete randomAssetsData.stocks; // Remove from randomAssetsData
    }

    if (randomAssetsData.gold && randomAssetsData.gold.length > 0) {
      gold = randomAssetsData.gold[0]; // Get the single gold asset
      delete randomAssetsData.gold; // Remove from randomAssetsData
    }

    // Step 7: Summary
    console.log(`\n✅ ============================================`);
    console.log(`   Game Initialization Complete!`);
    console.log(`============================================`);
    console.log(`   📈 Stocks: ${stocks.length}`);
    console.log(`   🏆 Gold: ${gold ? '1' : '0'}`);
    randomAssetCategories
      .filter(cat => cat.key !== 'gold' && cat.key !== 'stocks') // Don't list twice
      .forEach(cat => {
        console.log(`   ${cat.name}: ${randomAssetsData[cat.key]?.length || 0}`);
      });
    console.log(`============================================\n`);

    return {
      stocks: stocks,
      gold,
      fdRates,
      randomAssets: randomAssetCategories.map(c => c.key).filter(k => k !== 'gold' && k !== 'stocks'),
      randomAssetsDisplay: randomAssetCategories.filter(c => c.key !== 'gold' && c.key !== 'stocks'),
      ...randomAssetsData
    };
    
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
    return null;
  }
};

function App() {
  const [screen, setScreen] = useState('menu');
  const [fdRates, setFdRates] = useState({ '1Y': [], '2Y': [], '3Y': [], '5Y': [] });
  const [mode, setMode] = useState(null);
  const [gameState, setGameState] = useState('instructions');
  const [currentMonth, setCurrentMonth] = useState(0);
  const [gameStartYear, setGameStartYear] = useState(null);
  const [pocketCash, setPocketCash] = useState(50000);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [availableIndexFunds, setAvailableIndexFunds] = useState([]);
  const [availableCommodities, setAvailableCommodities] = useState([]);
  const [availableREITs, setAvailableREITs] = useState([]);
  const [availableCrypto, setAvailableCrypto] = useState([]);
  const [availableForex, setAvailableForex] = useState([]);
  const [investments, setInvestments] = useState({
  savings: { amount: 0, roi: 4 },
  fixedDeposits: [],
  gold: { grams: 0, avgPrice: 0, totalInvested: 0 },
  ppf: { amount: 0, roi: 7.1 },
  
  // ✅ ALL asset categories need same structure:
  stocks: [],           // Array of { id, units, avgPrice }
  mutualFunds: [],      // Array of { id, units, avgPrice }
  indexFunds: [],       // Array of { id, units, avgPrice }
  commodities: [],      // Array of { id, units, avgPrice }
  reit: [],             // Array of { id, units, avgPrice }
  crypto: [],           // Array of { id, units, avgPrice }
  forex: []             // Array of { id, units, avgPrice }
});
  const [availableInvestments, setAvailableInvestments] = useState(['savings']);
  const [showEvent, setShowEvent] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [majorExpenses, setMajorExpenses] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAmounts, setStockAmounts] = useState({});
  const [mutualFundAmounts, setMutualFundAmounts] = useState({});
  const [assetAmounts, setAssetAmounts] = useState({});
  const [goldQty, setGoldQty] = useState(10);
  const [stockAmount, setStockAmount] = useState(1);
  const [networthHistory, setNetworthHistory] = useState([]);
  const [availableMutualFunds, setAvailableMutualFunds] = useState([]);
  const [goldData, setGoldData] = useState(FALLBACK_STOCK_DATA.gold);
  const timerRef = useRef(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const multiplayer = useMultiplayer();

  const currentYear = Math.floor(currentMonth / 12);
  const monthInYear = currentMonth % 12;


  useEffect(() => {
    loadFDRates().then(setFdRates);
  }, []);

useEffect(() => {
    if (mode === 'multiplayer' && multiplayer.availableMutualFunds?.length > 0) {
        setAvailableMutualFunds(multiplayer.availableMutualFunds);
    }
}, [multiplayer.availableMutualFunds, mode]);

  useEffect(() => {
    if (mode === 'multiplayer') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (multiplayer.gameStatus === 'playing' && gameState !== 'playing') {
        setGameState('playing');
        setScreen('game');
        if (multiplayer.availableInvestments) setAvailableInvestments(multiplayer.availableInvestments);
        if (multiplayer.currentMonth !== undefined) setCurrentMonth(multiplayer.currentMonth);
      } else if (multiplayer.gameStatus === 'waiting' && screen !== 'lobby') {
        setScreen('lobby');
      } else if (multiplayer.gameStatus === 'ended') {
        setGameState('gameOver');
      }
    }
  }, [multiplayer.gameStatus, multiplayer.currentMonth, mode, gameState, screen]);

  useEffect(() => {
    if (mode === 'multiplayer' && multiplayer.currentMonth !== undefined) {
      setCurrentMonth(multiplayer.currentMonth);
    }
  }, [multiplayer.currentMonth, mode]);

  useEffect(() => {
    if (mode === 'multiplayer' && multiplayer.availableInvestments) {
      setAvailableInvestments(multiplayer.availableInvestments);
    }
  }, [multiplayer.availableInvestments, mode]);

  useEffect(() => {
    if (mode === 'multiplayer' && multiplayer.availableStocks?.length > 0) {
      setAvailableStocks(multiplayer.availableStocks);
    }
  }, [multiplayer.availableStocks, mode]);

  // Sync all asset types from multiplayer
  useEffect(() => {
    if (mode === 'multiplayer') {
      if (multiplayer.availableIndexFunds?.length > 0) {
        setAvailableIndexFunds(multiplayer.availableIndexFunds);
        console.log('📈 Synced Index Funds from multiplayer:', multiplayer.availableIndexFunds.length);
      }
      if (multiplayer.availableCommodities?.length > 0) {
        setAvailableCommodities(multiplayer.availableCommodities);
        console.log('🥇 Synced Commodities from multiplayer:', multiplayer.availableCommodities.length);
      }
      if (multiplayer.availableREITs?.length > 0) {
        setAvailableREITs(multiplayer.availableREITs);
        console.log('🏢 Synced REITs from multiplayer:', multiplayer.availableREITs.length);
      }
      if (multiplayer.availableCrypto?.length > 0) {
        setAvailableCrypto(multiplayer.availableCrypto);
        console.log('₿ Synced Crypto from multiplayer:', multiplayer.availableCrypto.length);
      }
      if (multiplayer.availableForex?.length > 0) {
        setAvailableForex(multiplayer.availableForex);
        console.log('💱 Synced Forex from multiplayer:', multiplayer.availableForex.length);
      }
    }
  }, [mode, multiplayer.availableIndexFunds, multiplayer.availableCommodities, multiplayer.availableREITs, multiplayer.availableCrypto, multiplayer.availableForex]);

  useEffect(() => {
    if (mode !== 'multiplayer' || !multiplayer.socket) return;
    const handleTransactionSuccess = (data) => {
  setPocketCash(data.pocketCash);
  if (data.portfolio) {
    const stocksArray = Object.entries(data.portfolio).map(([stockId, stock]) => ({
      id: stockId,
      shares: stock.shares,
      avgPrice: stock.avgPrice
    }));
    setInvestments(prev => ({ ...prev, stocks: stocksArray }));
  }
};
    multiplayer.socket.on('transaction-success', handleTransactionSuccess);
    return () => { multiplayer.socket.off('transaction-success', handleTransactionSuccess); };
  }, [mode, multiplayer.socket]);

// NEW: Update asset state when investments are unlocked
useEffect(() => {
  // Hydrate unlocked asset lists from cached game assets when they first unlock.
  // Works for solo, and as a fallback for multiplayer clients if server didn't push lists yet.
  if (availableInvestments.includes('mutualFunds') && availableMutualFunds.length === 0 && window.gameAssets?.mutualFunds) {
    setAvailableMutualFunds(window.gameAssets.mutualFunds);
    console.log('✅ Mutual Funds unlocked:', window.gameAssets.mutualFunds.length);
  }
  
  if (availableInvestments.includes('indexFunds') && availableIndexFunds.length === 0 && window.gameAssets?.indexFunds) {
    setAvailableIndexFunds(window.gameAssets.indexFunds);
    console.log('✅ Index Funds unlocked:', window.gameAssets.indexFunds.length);
  }
  
  if (availableInvestments.includes('commodities') && availableCommodities.length === 0 && window.gameAssets?.commodities) {
    setAvailableCommodities(window.gameAssets.commodities);
    console.log('✅ Commodities unlocked and loaded:', window.gameAssets.commodities.length);
  }
  
  if (availableInvestments.includes('reit') && availableREITs.length === 0 && window.gameAssets?.reit) {
    setAvailableREITs(window.gameAssets.reit);
    console.log('✅ REITs unlocked:', window.gameAssets.reit.length);
  }
  
  if (availableInvestments.includes('crypto') && availableCrypto.length === 0 && window.gameAssets?.crypto) {
    setAvailableCrypto(window.gameAssets.crypto);
    console.log('✅ Crypto unlocked:', window.gameAssets.crypto.length);
  }
  
  if (availableInvestments.includes('forex') && availableForex.length === 0 && window.gameAssets?.forex) {
    setAvailableForex(window.gameAssets.forex);
    console.log('✅ Forex unlocked and loaded:', window.gameAssets.forex.length);
  }
}, [availableInvestments, availableMutualFunds.length, availableIndexFunds.length, availableCommodities.length, availableREITs.length, availableCrypto.length, availableForex.length]);

// Ensure non-host clients have the correct start year from server
useEffect(() => {
  if (mode === 'multiplayer' && multiplayer.gameStartYear !== null && multiplayer.gameStartYear !== undefined) {
    setGameStartYear(multiplayer.gameStartYear);
    console.log('📅 Synced game start year from server:', multiplayer.gameStartYear);
  }
}, [mode, multiplayer.gameStartYear]);

// Sync availableInvestments from multiplayer server
useEffect(() => {
  if (mode === 'multiplayer' && multiplayer.availableInvestments && multiplayer.availableInvestments.length > 0) {
    const serverInvestments = JSON.stringify(multiplayer.availableInvestments.sort());
    const localInvestments = JSON.stringify(availableInvestments.sort());

    if (serverInvestments !== localInvestments) {
      console.log('🔓 Syncing available investments from server:', multiplayer.availableInvestments);
      setAvailableInvestments([...multiplayer.availableInvestments]);
    }
  }
}, [mode, multiplayer.availableInvestments, availableInvestments]);

// Handle multiplayer year events
useEffect(() => {
  if (mode === 'multiplayer' && multiplayer.currentEvent) {
    setShowEvent(multiplayer.currentEvent);
    handleEvent(multiplayer.currentEvent);
    // Clear the event after handling
    setTimeout(() => {
      multiplayer.setCurrentEvent(null);
    }, 100);
  }
}, [mode, multiplayer.currentEvent]);

// Handle stock transaction updates from multiplayer
useEffect(() => {
  if (mode !== 'multiplayer') return;

  const handleStockTransaction = (event) => {
    const data = event.detail;
    console.log('🔄 Updating local state from transaction:', data);

    // Update pocket cash
    if (data.pocketCash !== undefined) {
      setPocketCash(data.pocketCash);
    }

    // Update stock portfolio
    if (data.portfolio && data.type === 'buy') {
      const stockData = data.portfolio[data.stockId];
      if (stockData) {
        setInvestments(prev => {
          const existingStock = prev.stocks.find(s => s.id === data.stockId);
          if (existingStock) {
            return {
              ...prev,
              stocks: prev.stocks.map(s =>
                s.id === data.stockId
                  ? { id: data.stockId, shares: stockData.shares, avgPrice: stockData.avgPrice }
                  : s
              )
            };
          } else {
            return {
              ...prev,
              stocks: [...prev.stocks, { id: data.stockId, shares: stockData.shares, avgPrice: stockData.avgPrice }]
            };
          }
        });
      }
    } else if (data.portfolio && data.type === 'sell') {
      const stockData = data.portfolio[data.stockId];
      if (stockData && stockData.shares > 0) {
        setInvestments(prev => ({
          ...prev,
          stocks: prev.stocks.map(s =>
            s.id === data.stockId
              ? { id: data.stockId, shares: stockData.shares, avgPrice: stockData.avgPrice }
              : s
          )
        }));
      } else {
        // Stock fully sold
        setInvestments(prev => ({
          ...prev,
          stocks: prev.stocks.filter(s => s.id !== data.stockId)
        }));
      }
    }
  };

  window.addEventListener('stock-transaction', handleStockTransaction);
  return () => window.removeEventListener('stock-transaction', handleStockTransaction);
}, [mode]);

// Handle asset transaction updates from multiplayer (commodities, index funds, crypto, etc.)
useEffect(() => {
  if (mode !== 'multiplayer') return;

  const handleAssetTransaction = (event) => {
    const data = event.detail;
    console.log('🔄 Updating asset from transaction:', data);

    // Update pocket cash
    if (data.pocketCash !== undefined) {
      setPocketCash(data.pocketCash);
    }

    // Update asset portfolio based on category
    const { category, assetId, type } = data;

    if (type === 'buy-asset') {
      // Get the server's calculated portfolio from backend response
      // The backend should send the updated portfolio state
      setInvestments(prev => {
        const categoryAssets = prev[category] || [];
        const existingAsset = categoryAssets.find(a => a.id === assetId);

        if (existingAsset) {
          // Update existing asset
          return {
            ...prev,
            [category]: categoryAssets.map(a =>
              a.id === assetId
                ? { ...a, units: data.units, avgPrice: data.avgPrice }
                : a
            )
          };
        } else {
          // Add new asset
          return {
            ...prev,
            [category]: [...categoryAssets, { id: assetId, units: data.units, avgPrice: data.avgPrice }]
          };
        }
      });
    } else if (type === 'sell-asset') {
      setInvestments(prev => {
        const categoryAssets = prev[category] || [];
        const existingAsset = categoryAssets.find(a => a.id === assetId);

        if (existingAsset) {
          if (data.units > 0) {
            // Update remaining units
            return {
              ...prev,
              [category]: categoryAssets.map(a =>
                a.id === assetId
                  ? { ...a, units: data.units, avgPrice: data.avgPrice }
                  : a
              )
            };
          } else {
            // Asset fully sold - remove it
            return {
              ...prev,
              [category]: categoryAssets.filter(a => a.id !== assetId)
            };
          }
        }
        return prev;
      });
    }
  };

  window.addEventListener('asset-transaction', handleAssetTransaction);
  return () => window.removeEventListener('asset-transaction', handleAssetTransaction);
}, [mode]);



  const getCurrentFDRate = (tenure) => {
    const yearOffset = Math.floor(currentMonth / 12);
    const currentYear = gameStartYear + yearOffset;
    // FD rates are indexed by year (1990-2025)
    return fdRates[tenure][currentYear] || 6.5;
  };



const MutualFundCard = ({ fund }) => {
  ensureShakeStylesInjected();
  const [isShaking, setIsShaking] = React.useState(false);
  const currentNAV = getCurrentPrice(fund.id, currentMonth);
  const myMF = investments.mutualFunds.find(m => m.id === fund.id);
  const currentMFAmount = mutualFundAmounts[fund.id] || 5000;
  const setCurrentMFAmount = (value) => {
    setMutualFundAmounts(prev => ({ ...prev, [fund.id]: value }));
  };

  // Month-over-month change and sparkline (to match AssetCard visuals)
  const prevNAV = currentMonth > 0 ? getCurrentPrice(fund.id, currentMonth - 1) : currentNAV;
  const monthChange = prevNAV > 0 ? ((currentNAV - prevNAV) / prevNAV * 100) : 0;
  const sparklineData = React.useMemo(() => {
    const history = [];
    const startMonth = Math.max(0, currentMonth - 11);
    for (let m = startMonth; m <= currentMonth; m++) {
      history.push(getCurrentPrice(fund.id, m));
    }
    return history;
  }, [fund.id, currentMonth]);
  const minPrice = Math.min(...sparklineData);
  const maxPrice = Math.max(...sparklineData);
  const priceRange = maxPrice - minPrice || 1;

  const myUnits = myMF?.units || 0;
  const avgNAV = myMF?.avgPrice || 0;
  const currentValue = myUnits * currentNAV;
  const profitLoss = myUnits > 0 ? currentValue - (myUnits * avgNAV) : 0;

  const isLoss = myUnits > 0 && profitLoss < 0;
  return (
    <div className={`bg-white p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors ${isShaking ? 'gv3-shake' : ''} ${isLoss ? 'bg-red-50' : ''}`}>
      {/* Header - align to AssetCard */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-bold text-gray-800 text-lg">{fund.id}</div>
            {monthChange >= 0 ? 
              <TrendingUp className="w-4 h-4 text-green-600" /> : 
              <TrendingDown className="w-4 h-4 text-red-600" />
            }
          </div>
          <div className="text-xs text-gray-600">Mutual Fund</div>
          <div className="font-bold text-gray-800 text-sm mb-1">{fund.name}</div>
        </div>

        {/* Sparkline */}
        {sparklineData.length > 1 && (
          <svg width="80" height="30" className="ml-2">
            <polyline
              fill="none"
              stroke={monthChange >= 0 ? "#16a34a" : "#dc2626"}
              strokeWidth="2"
              points={sparklineData.map((price, i) => {
                const x = (i / (sparklineData.length - 1)) * 80;
                const y = 30 - ((price - minPrice) / priceRange) * 30;
                return `${x},${y}`;
              }).join(' ')}
            />
          </svg>
        )}
      </div>

      {/* Current NAV and change */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-purple-600">{formatCurrency(currentNAV)}</div>
        <div className={`text-sm font-semibold ${monthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {monthChange >= 0 ? '▲' : '▼'} {Math.abs(monthChange).toFixed(2)}% this month
        </div>
      </div>

      {/* Holdings summary */}
      {myUnits > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-xs text-gray-600">Units:</span>
              <span className="font-bold text-gray-800 ml-1">{myUnits.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-xs text-gray-600">Avg:</span>
              <span className="font-bold text-gray-800 ml-1">{formatCurrency(avgNAV)}</span>
            </div>
          </div>
          <div className="border-t border-purple-200 pt-2">
            <div className="text-xs text-gray-600 mb-1">Current Value</div>
            <div className="text-lg font-bold text-gray-800">{formatCurrency(currentValue)}</div>
            <div className={`text-sm font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profitLoss)}
            </div>
          </div>
        </div>
      )}

      {/* Investment amount selector */}
      <div className="mb-3">
        <label className="text-xs text-gray-600 mb-2 block">Select Amount</label>
        <div className="grid grid-cols-2 gap-1">
          <button onClick={() => setCurrentMFAmount(5000)} className={`py-2 rounded text-xs font-semibold transition-colors ${currentMFAmount === 5000 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>₹5K</button>
          <button onClick={() => setCurrentMFAmount(10000)} className={`py-2 rounded text-xs font-semibold transition-colors ${currentMFAmount === 10000 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>₹10K</button>
          <button onClick={() => setCurrentMFAmount(25000)} className={`py-2 rounded text-xs font-semibold transition-colors ${currentMFAmount === 25000 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>₹25K</button>
          <button onClick={() => setCurrentMFAmount(pocketCash)} className={`py-2 rounded text-xs font-semibold transition-colors ${currentMFAmount === pocketCash ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} title="Max affordable">MAX</button>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => {
          if (currentMFAmount > pocketCash) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 400);
            return;
          }
          if (mode === 'multiplayer' && multiplayer.socket) {
            multiplayer.buyMutualFund(fund.id, currentMFAmount);
          } else {
            buyMutualFund(fund.id, currentMFAmount);
          }
        }} disabled={currentMFAmount > pocketCash} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 rounded text-sm font-semibold transition-colors">Invest</button>
        <button onClick={() => {
          if (mode === 'multiplayer' && multiplayer.socket) {
            multiplayer.sellMutualFund(fund.id, myUnits);
          } else {
            sellMutualFund(fund.id, myUnits);
          }
        }} disabled={myUnits === 0} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 rounded text-sm font-semibold transition-colors">Redeem All</button>
      </div>
    </div>
  );
};

const AssetCard = ({ asset, category, categoryDisplayName, amount, setAmount }) => {
  ensureShakeStylesInjected();
  const [isShaking, setIsShaking] = React.useState(false);
  const currentPrice = getCurrentPrice(asset.id, currentMonth);
  const myAsset = investments[category]?.find(a => a.id === asset.id);
  
  // Previous month price for change calculation
  const prevPrice = currentMonth > 0 ? getCurrentPrice(asset.id, currentMonth - 1) : currentPrice;
  const monthChange = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice * 100) : 0;
  
  // User's holdings
  const myUnits = myAsset?.units || 0;
  const avgPrice = myAsset?.avgPrice || 0;
  const currentValue = myUnits * currentPrice;
  const profitLoss = myUnits > 0 ? currentValue - (myUnits * avgPrice) : 0;
  const profitLossPercent = myUnits > 0 ? ((currentPrice - avgPrice) / avgPrice * 100) : 0;
  
  // Cost calculation
  const totalCost = currentPrice * amount;
  
  // Sparkline data (last 12 months)
  const sparklineData = React.useMemo(() => {
    const history = [];
    const startMonth = Math.max(0, currentMonth - 11);
    for (let m = startMonth; m <= currentMonth; m++) {
      history.push(getCurrentPrice(asset.id, m));
    }
    return history;
  }, [asset.id, currentMonth]);

  const minPrice = Math.min(...sparklineData);
  const maxPrice = Math.max(...sparklineData);
  const priceRange = maxPrice - minPrice || 1;

  // Buy handler
  const handleBuy = () => {
    if (totalCost > pocketCash) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    
    if (mode === 'multiplayer' && multiplayer.socket) {
      // For multiplayer, emit socket event
      multiplayer.socket.emit('buy-asset', { 
        assetId: asset.id, 
        units: amount, 
        category 
      });
    } else {
      // For solo mode, use local function
      buyAsset(asset.id, amount, category);
    }
  };

  // Sell handler
  const handleSell = () => {
    if (myUnits === 0) return;
    
    const sellUnits = Math.min(amount, myUnits);
    
    if (mode === 'multiplayer' && multiplayer.socket) {
      multiplayer.socket.emit('sell-asset', { 
        assetId: asset.id, 
        units: sellUnits, 
        category 
      });
    } else {
      sellAsset(asset.id, sellUnits, category);
    }
  };

  const isLoss = myUnits > 0 && profitLoss < 0;
  return (
    <div className={`bg-white p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors ${isShaking ? 'gv3-shake' : ''} ${isLoss ? 'bg-red-50' : ''}`}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-bold text-gray-800 text-lg">{asset.id}</div>
            {monthChange >= 0 ? 
              <TrendingUp className="w-4 h-4 text-green-600" /> : 
              <TrendingDown className="w-4 h-4 text-red-600" />
            }
          </div>
          <div className="text-xs text-gray-600">{categoryDisplayName}</div>
          <div className="font-bold text-gray-800 text-sm mb-1">{asset.name}</div>
        </div>
        
        {/* Sparkline */}
        {sparklineData.length > 1 && (
          <svg width="80" height="30" className="ml-2">
            <polyline
              fill="none"
              stroke={monthChange >= 0 ? "#16a34a" : "#dc2626"}
              strokeWidth="2"
              points={sparklineData.map((price, i) => {
                const x = (i / (sparklineData.length - 1)) * 80;
                const y = 30 - ((price - minPrice) / priceRange) * 30;
                return `${x},${y}`;
              }).join(' ')}
            />
          </svg>
        )}
      </div>

      {/* Current Price */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-purple-600">
          {formatCurrency(currentPrice)}
        </div>
        <div className={`text-sm font-semibold ${monthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {monthChange >= 0 ? '▲' : '▼'} {Math.abs(monthChange).toFixed(2)}% this month
        </div>
      </div>

      {/* Holdings Section (if user owns any) */}
      {myUnits > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-xs text-gray-600">Units:</span>
              <span className="font-bold text-gray-800 ml-1">{myUnits.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-xs text-gray-600">Avg:</span>
              <span className="font-bold text-gray-800 ml-1">{formatCurrency(avgPrice)}</span>
            </div>
          </div>
          <div className="border-t border-purple-200 pt-2">
            <div className="text-xs text-gray-600 mb-1">Current Value</div>
            <div className="text-lg font-bold text-gray-800">
              {formatCurrency(currentValue)}
            </div>
            <div className={`text-sm font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profitLoss)}
              <span className="text-xs ml-2">
                ({profitLossPercent > 0 ? '+' : ''}{profitLossPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="mb-3">
        <label className="text-xs text-gray-600 mb-2 block">Select Quantity</label>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setAmount(1)}
            className={`py-1.5 rounded text-xs font-semibold transition-colors ${
              amount === 1
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            1
          </button>
          <button
            onClick={() => setAmount(10)}
            className={`py-1.5 rounded text-xs font-semibold transition-colors ${
              amount === 10
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            10
          </button>
          <button
            onClick={() => setAmount(100)}
            className={`py-1.5 rounded text-xs font-semibold transition-colors ${
              amount === 100
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            100
          </button>
          <button
            onClick={() => {
              const maxAmount = Math.floor(pocketCash / currentPrice);
              setAmount(maxAmount);
            }}
            className={`py-1.5 rounded text-xs font-semibold transition-colors ${
              amount !== 1 && amount !== 10 && amount !== 100 && amount > 0
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Max affordable"
          >
            MAX
          </button>
        </div>
        <div className="text-xs text-gray-600 mt-2 text-center">
          Total: {formatCurrency(totalCost)}
        </div>
      </div>

      {/* Buy/Sell Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={handleBuy}
          disabled={totalCost > pocketCash}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 rounded text-sm font-semibold transition-colors"
        >
          Buy
        </button>
        <button 
          onClick={handleSell}
          disabled={myUnits === 0}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 rounded text-sm font-semibold transition-colors"
        >
          Sell
        </button>
      </div>
    </div>
  );
};

const GoldCard = () => {
  ensureShakeStylesInjected();
  const [isShaking, setIsShaking] = React.useState(false);
  const currentPricePer10g = getCurrentGoldPrice(currentMonth);
  const gramsToBuy = goldQty; // Use parent state instead of local state

  const prevPrice = currentMonth > 0 ? getCurrentGoldPrice(currentMonth - 1) : currentPricePer10g;
  const monthChange = prevPrice > 0 ? ((currentPricePer10g - prevPrice) / prevPrice * 100) : 0;

  const myGrams = investments.gold.grams;
  const avgPrice = investments.gold.avgPrice || 0;
  const pricePerGram = currentPricePer10g / 10;
  const currentValue = myGrams * pricePerGram;
  const profitLoss = myGrams > 0 ? currentValue - investments.gold.totalInvested : 0;
  const profitLossPercent = investments.gold.totalInvested > 0 ? (profitLoss / investments.gold.totalInvested * 100) : 0;
  
  return (
    <div className={`bg-white p-4 rounded-lg border-2 border-yellow-400 hover:border-yellow-500 transition-colors ${isShaking ? 'gv3-shake' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-bold text-gray-800 text-lg">🏆 Gold</div>
            {monthChange >= 0 ? 
              <TrendingUp className="w-4 h-4 text-green-600" /> : 
              <TrendingDown className="w-4 h-4 text-red-600" />
            }
          </div>
          <div className="text-xs text-gray-600">Physical Gold</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-2xl font-bold text-yellow-600">
          Rate per 10g: {formatCurrency(currentPricePer10g)}
        </div>
        <div className="text-sm text-gray-600">Rate per gram: {formatCurrency(pricePerGram)}</div>
        <div className={`text-sm font-semibold ${monthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {monthChange >= 0 ? '▲' : '▼'} {Math.abs(monthChange).toFixed(2)}% this month
        </div>
      </div>

      {myGrams > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">Holdings:</span>
            <span className="font-bold text-gray-800">{myGrams.toFixed(2)}g</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">Avg:</span>
            <span className="font-bold text-gray-800">{formatCurrency(avgPrice)}/g</span>
          </div>
          <div className="border-t border-yellow-300 pt-2 mb-2">
            <div className="text-xs text-gray-600 mb-1">Current Value</div>
            <div className="text-lg font-bold text-gray-800">
              {formatCurrency(currentValue)}
            </div>
          </div>
          <div className="border-t border-yellow-300 pt-2">
            <div className="text-xs text-gray-600 mb-1">Profit & Loss</div>
            <div className={`text-xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profitLoss)}
              <span className="text-sm ml-2">({profitLossPercent > 0 ? '+' : ''}{profitLossPercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Selector - 1g or 10g */}
      <div className="mb-3">
        <label className="text-xs text-gray-600 mb-2 block">Select Quantity</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setGoldQty(1)}
            className={`py-2 rounded text-sm font-semibold transition-colors ${
              goldQty === 1
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            1g
          </button>
          <button
            onClick={() => setGoldQty(10)}
            className={`py-2 rounded text-sm font-semibold transition-colors ${
              goldQty === 10
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            10g
          </button>
        </div>
        <div className="text-xs text-gray-600 mt-2 text-center">
          Cost: {formatCurrency(pricePerGram * gramsToBuy)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            const cost = pricePerGram * gramsToBuy;
            if (cost > pocketCash) {
              setIsShaking(true);
              setTimeout(() => setIsShaking(false), 400);
              return;
            }
            if (cost <= pocketCash) {
              setPocketCash(prev => prev - cost);
              setInvestments(prev => {
                const newGrams = prev.gold.grams + gramsToBuy;
                const newTotalInvested = prev.gold.totalInvested + cost;
                const newAvgPrice = newGrams > 0 ? newTotalInvested / newGrams : 0;
                return {
                  ...prev,
                  gold: {
                    grams: newGrams,
                    avgPrice: newAvgPrice,
                    totalInvested: newTotalInvested
                  }
                };
              });
            }
          }}
          disabled={pricePerGram * gramsToBuy > pocketCash}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded text-sm font-semibold"
        >
          Buy
        </button>
        <button
          onClick={() => {
            if (myGrams >= gramsToBuy) {
              const revenue = pricePerGram * gramsToBuy;
              setPocketCash(prev => prev + revenue);
              setInvestments(prev => {
                const newGrams = prev.gold.grams - gramsToBuy;
                const proportionSold = gramsToBuy / prev.gold.grams;
                const newTotalInvested = prev.gold.totalInvested * (1 - proportionSold);
                return {
                  ...prev,
                  gold: {
                    grams: newGrams,
                    avgPrice: prev.gold.avgPrice, // Keep same avg price
                    totalInvested: newTotalInvested
                  }
                };
              });
            }
          }}
          disabled={myGrams < gramsToBuy}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded text-sm font-semibold"
        >
          Sell
        </button>
      </div>
    </div>
  );
};



  const selectRandomStartYear = (stocks) => {
    const minDataLength = Math.min(...stocks.map(s => s.prices.length));
    const maxStartIndex = minDataLength - 20;
    if (maxStartIndex <= 0) return 0;
    return Math.floor(Math.random() * maxStartIndex);
  };


  const handleCreateMultiplayerRoom = async (ignoredStartYear, playerName) => {
    console.log(`🏠 Creating multiplayer room (dynamic years)`);

    // Mirror solo flow: select categories, compute dynamic start/end by latest end + 5
    const selectedCategories = await selectRandomAssets(null, null);
    const timeline = await loadAssetTimeline();
    const latestIntroYear = await findLatestIntroductionYear(selectedCategories, timeline);
    const BUFFER_YEARS = 5;
    const GAME_DURATION = 20;
    let endYear = Math.min(latestIntroYear + BUFFER_YEARS, 2025);
    let startYear = Math.max(1990, endYear - GAME_DURATION);
    if (endYear - startYear < GAME_DURATION) {
      endYear = Math.min(2025, startYear + GAME_DURATION);
    }

    const gameAssets = await initializeGameAssetsV2(startYear, endYear, selectedCategories, timeline);
    if (!gameAssets) {
      console.error('Failed to load game assets');
      return;
    }

    // Send full dataset to server so it can manage unlocks in sync
    multiplayer.createRoom(playerName, {
      stocks: gameAssets.stocks || [],
      gold: gameAssets.gold,
      mutualFunds: gameAssets.mutualFunds || [],
      indexFunds: gameAssets.indexFunds || [],
      commodities: gameAssets.commodities || [],
      crypto: gameAssets.crypto || [],
      reit: gameAssets.reit || [],
      forex: gameAssets.forex || [],
      randomAssets: gameAssets.randomAssets || [],
      gameStartYear: startYear,
      gameEndYear: endYear
    });

    setGameStartYear(startYear);
  };

const getCurrentPrice = (assetId, monthOffset) => {
  let asset = availableStocks.find(s => s.id === assetId) ||
              availableMutualFunds.find(m => m.id === assetId) ||
              availableIndexFunds.find(i => i.id === assetId) ||
              availableCommodities.find(c => c.id === assetId) ||
              availableREITs.find(r => r.id === assetId) ||
              availableCrypto.find(c => c.id === assetId) ||
              availableForex.find(f => f.id === assetId);
  
  if (!asset || !asset.prices || !asset.startYear) {
    console.warn(`⚠️ Asset ${assetId} not found`);
    return 0;
  }
  
  // FIXED: Calculate relative index
  if (typeof gameStartYear !== 'number' || isNaN(gameStartYear)) {
    return asset.prices[0] || 0;
  }
  const gameYear = Math.floor(monthOffset / 12);
  const monthInYear = monthOffset % 12;
  const absoluteYear = gameStartYear + gameYear;
  
  // Index in asset's price array
  let priceIndex = absoluteYear - asset.startYear;
  // Clamp to available range to avoid out-of-bounds when game runs beyond data
  if (priceIndex < 0) priceIndex = 0;
  if (priceIndex >= asset.prices.length) priceIndex = asset.prices.length - 1;
  const nextPriceIndex = priceIndex + 1;

  const currentYearPrice = asset.prices[priceIndex];

  if (nextPriceIndex < asset.prices.length) {
    const nextYearPrice = asset.prices[nextPriceIndex];
    const interpolated = currentYearPrice + (nextYearPrice - currentYearPrice) * (monthInYear / 12);
    return Math.round(interpolated * 100) / 100;
  }
  
  return currentYearPrice;
};

const getCurrentGoldPrice = (monthOffset) => {
  // In multiplayer mode, use price from server
  if (mode === 'multiplayer') {
    // Always use the latest price from server, regardless of monthOffset
    const serverGoldPrice = multiplayer.currentPrices?.gold || 0;
    // console.log('💰 Gold price from server:', serverGoldPrice);
    return serverGoldPrice;
  }

  // In solo mode, calculate locally
  if (!goldData || !goldData.prices || !goldData.startYear) {
    console.warn('⚠️ Gold data not loaded');
    return 0;
  }

  const gameYear = Math.floor(monthOffset / 12);
  const monthInYear = monthOffset % 12;
  const absoluteYear = gameStartYear + gameYear;
  const priceIndex = absoluteYear - goldData.startYear;
  const nextPriceIndex = priceIndex + 1;

  if (priceIndex < 0 || priceIndex >= goldData.prices.length) {
    return goldData.prices[goldData.prices.length - 1] || 0;
  }

  const currentYearPrice = goldData.prices[priceIndex];

  if (nextPriceIndex < goldData.prices.length) {
    const nextYearPrice = goldData.prices[nextPriceIndex];
    const interpolated = currentYearPrice + (nextYearPrice - currentYearPrice) * (monthInYear / 12);
    return Math.round(interpolated * 100) / 100;
  }

  return currentYearPrice;
};

  const getStockHistory = (stockId) => {
    const stock = availableStocks.find(s => s.id === stockId);
    if (!stock) return [];
    const history = [];
    for (let m = 0; m <= currentMonth; m++) {
      const price = getCurrentPrice(stockId, m);
      history.push({ month: m, price, label: `Y${Math.floor(m/12)}M${m%12}` });
    }
    return history;
  };

const calculateNetWorth = () => {
    let total = pocketCash + investments.savings.amount + investments.ppf.amount;
    
    // Fixed Deposits
    investments.fixedDeposits.forEach(fd => { total += fd.amount + fd.profit; });
    
    // Stocks
    investments.stocks.forEach(stock => { 
      total += stock.shares * getCurrentPrice(stock.id, currentMonth); 
    });
    
    // Mutual Funds (using correct property name)
    investments.mutualFunds.forEach(mf => { 
      total += mf.units * getCurrentPrice(mf.id, currentMonth); 
    });
    
    // Index Funds
    investments.indexFunds.forEach(fund => { 
      total += fund.units * getCurrentPrice(fund.id, currentMonth); 
    });
    
    // Commodities
    investments.commodities.forEach(commodity => { 
      total += commodity.units * getCurrentPrice(commodity.id, currentMonth); 
    });
    
    // REITs
    investments.reit.forEach(reit => { 
      total += reit.units * getCurrentPrice(reit.id, currentMonth); 
    });
    
    // Crypto
    investments.crypto.forEach(crypto => { 
      total += crypto.units * getCurrentPrice(crypto.id, currentMonth); 
    });
    
    // Forex
    investments.forex.forEach(fx => { 
      total += fx.units * getCurrentPrice(fx.id, currentMonth); 
    });
    
    // Gold
    if (investments.gold.grams > 0) {
      total += investments.gold.grams * getCurrentGoldPrice(currentMonth);
    }
    
    return Math.round(total);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const handleEvent = (event) => {
  if (event.type === 'loss') {
    if (pocketCash >= Math.abs(event.amount)) {
      setPocketCash(prev => prev + event.amount);
      setMajorExpenses(prev => [...prev, { 
        month: currentMonth, 
        description: event.message, 
        amount: event.amount 
      }]);
    } else {
      setShowEvent({ ...event, needFunds: true });
      setIsPaused(true);
      return;
    }
  } else if (event.type === 'gain') {
    setPocketCash(prev => prev + event.amount);
  }
  
  // For solo mode, handle unlock locally
  if (event.unlock && mode === 'solo') {
    console.log(`🔓 UNLOCKING: ${event.unlock}${event.subkey ? ` (${event.subkey})` : ''}`);

    // Special handling for REIT progressive unlock
    if (event.unlock === 'reit' && event.subkey) {
      // Progressive REIT unlock: Add specific REIT to available list
      setAvailableREITs(prev => {
        if (!window.gameAssets?.reit) return prev;

        const reitToUnlock = window.gameAssets.reit.find(r => r.id === event.subkey);
        if (reitToUnlock && !prev.find(r => r.id === event.subkey)) {
          const newREITs = [...prev, reitToUnlock];
          console.log(`✅ REIT unlocked: ${reitToUnlock.name}`);
          return newREITs;
        }
        return prev;
      });

      // Also add 'reit' to available investments if not already there
      setAvailableInvestments(prev => {
        if (!prev.includes('reit')) {
          return [...prev, 'reit'];
        }
        return prev;
      });
    } else {
      // Standard unlock for other asset categories
      setAvailableInvestments(prev => {
        if (!prev.includes(event.unlock)) {
          const newInvestments = [...prev, event.unlock];
          console.log(`✅ Available investments now:`, newInvestments);
          return newInvestments;
        }
        return prev;
      });
    }
  }

  // For multiplayer, availableInvestments comes from server
  // Always show unlock notification
  if (event.unlock) {
    console.log(`🔓 Unlock event detected: ${event.unlock}`);
    setIsPaused(true);
  }
};

  const updateInvestments = () => {
  if (investments.savings.amount > 0) {
      setInvestments(prev => ({ 
        ...prev, 
        savings: { 
          ...prev.savings, 
          amount: Math.round(prev.savings.amount * (1 + prev.savings.roi / 100 / 12)) 
        } 
      }));
    }


    setInvestments(prev => ({
      ...prev,
      fixedDeposits: prev.fixedDeposits.map(fd => ({
        ...fd,
        monthsElapsed: fd.monthsElapsed + 1,
        profit: fd.amount * (fd.roi / 100) * (fd.monthsElapsed + 1) / fd.duration
      }))
    }));
  };

useEffect(() => {
    if (mode === 'solo') {
      if (gameState === 'playing' && !isPaused && currentMonth < 240) {
        timerRef.current = setTimeout(() => {
          const nextMonth = currentMonth + 1;
          setCurrentMonth(nextMonth);
          updateInvestments();
          const networth = calculateNetWorth();
          setNetworthHistory(prev => [...prev, { month: nextMonth, networth }]);
          const year = Math.floor(nextMonth / 12);
          const month = nextMonth % 12;
          
          // Check for year events (use window.gameYearEvents set in startGame)
          if (month === 0 && window.gameYearEvents && window.gameYearEvents[year]) {
            const yearEvent = window.gameYearEvents[year];
            setShowEvent(yearEvent);
            handleEvent(yearEvent);
          }
          
          if (nextMonth >= 240) setGameState('gameOver');
        }, MONTH_DURATION);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
      }
    } else if (mode === 'multiplayer' && gameState === 'playing') {
      updateInvestments();
      const networth = calculateNetWorth();
      setNetworthHistory(prev => {
        const exists = prev.find(h => h.month === currentMonth);
        if (exists) return prev;
        return [...prev, { month: currentMonth, networth }];
      });
    
    }
  }, [gameState, currentMonth, isPaused, mode]);

  useEffect(() => {
    if (mode === 'multiplayer' && multiplayer.socket && gameState === 'playing') {
      const networth = calculateNetWorth();
      multiplayer.socket.emit('update-networth', { netWorth: networth, cash: pocketCash });
    }
  }, [currentMonth, pocketCash, investments.savings.amount, investments.mutualFunds.amount, investments.fixedDeposits.length, investments.gold.grams, investments.ppf.amount, investments.stocks.length, mode, gameState]);

  // Add this NEW useEffect to handle year-event from server
useEffect(() => {
  if (mode !== 'multiplayer' || !multiplayer.socket) return;
  
  const handleYearEvent = (data) => {
    console.log('📅 Year event received:', data);
    const { event, availableInvestments } = data;
    
    // Update available investments from server
    if (availableInvestments) {
      setAvailableInvestments(availableInvestments);
    }
    
    // Show the event popup
    if (event) {
      setShowEvent(event);
      setIsPaused(true); // Pause to show event
      
      // Handle gain/loss events
      if (event.type === 'gain') {
        setPocketCash(prev => prev + event.amount);
      } else if (event.type === 'loss') {
        if (pocketCash >= Math.abs(event.amount)) {
          setPocketCash(prev => prev + event.amount);
          setMajorExpenses(prev => [...prev, { 
            month: currentMonth, 
            description: event.message, 
            amount: event.amount 
          }]);
        } else {
          setShowEvent({ ...event, needFunds: true });
        }
      }
    }
  };
  
  multiplayer.socket.on('year-event', handleYearEvent);
  
  return () => {
    multiplayer.socket.off('year-event', handleYearEvent);
  };
}, [mode, multiplayer.socket, pocketCash, currentMonth]);


const startGame = async () => {
  console.log('\n🎮 Starting Game...\n');
  
  let stocks, startYear, randomAssets, gameAssets;
  
  if (mode === 'multiplayer') {
    // Multiplayer: Use data from server
    stocks = multiplayer.availableStocks || [];
    randomAssets = multiplayer.randomAssets || [];
    startYear = multiplayer.gameStartYear || 2000;
    
    setAvailableStocks(stocks);
    setAvailableMutualFunds(multiplayer.availableMutualFunds || []);
    setAvailableIndexFunds(multiplayer.availableIndexFunds || []);
    setAvailableCommodities(multiplayer.availableCommodities || []);
    setAvailableREITs(multiplayer.availableREITs || []);
    setAvailableCrypto(multiplayer.availableCrypto || []);
    setAvailableForex(multiplayer.availableForex || []);

    if (gameAssets) {
    // Store globally for unlock access
    window.gameAssets = gameAssets;
    }


    if (multiplayer.gold) {
      setGoldData(multiplayer.gold);
    }
    
  } else {
    // Solo Mode: NEW APPROACH - Select assets first, then determine year range

    console.log('📅 Step 1: Selecting asset categories first...');

    // Step 1: Select 6 random categories (+ SAC and FD always)
    const selectedCategories = await selectRandomAssets(null, null); // No year needed yet

    // Step 2: Determine the latest INTRODUCTION year with progressive categories (crypto/reit use latest sub-asset start)
    const timeline = await loadAssetTimeline();
    const latestIntroYear = await findLatestIntroductionYear(selectedCategories, timeline);

    console.log(`📅 Latest asset introduction year (progressive-aware): ${latestIntroYear}`);

    // Step 3: Calculate game end year = latestIntro + 5 (cap 2025), start = end - 20
    const BUFFER_YEARS = 5;
    const GAME_DURATION = 20; // 20 years
    let endYear = Math.min(latestIntroYear + BUFFER_YEARS, 2025);
    startYear = Math.max(1990, endYear - GAME_DURATION);

    // If clamped by 1990, maintain 20-year duration by shifting endYear forward if needed
    if (endYear - startYear < GAME_DURATION) {
      endYear = Math.min(2025, startYear + GAME_DURATION);
    }

    console.log(`📅 Calculated game period: ${startYear} to ${endYear} (${endYear - startYear} years, buffer: ${BUFFER_YEARS} years)`);

    // Step 4: Load game assets with the calculated years
    gameAssets = await initializeGameAssetsV2(startYear, endYear, selectedCategories, timeline);
    
    if (!gameAssets) {
      console.error('❌ Failed to initialize game assets');
      alert('Failed to load game data. Please refresh and try again.');
      return;
    }
    // ADD THIS LINE HERE:
    window.gameAssets = gameAssets;  // ✅ Store for unlock access

    // Validate we have at least one tradable asset category
    const totalTradables =
      (gameAssets.stocks?.length || 0) +
      (gameAssets.mutualFunds?.length || 0) +
      (gameAssets.indexFunds?.length || 0) +
      (gameAssets.commodities?.length || 0) +
      (gameAssets.crypto?.length || 0) +
      (gameAssets.reit?.length || 0) +
      (gameAssets.forex?.length || 0) +
      (gameAssets.gold ? 1 : 0);

    if (totalTradables === 0) {
      console.error('❌ No tradable assets available for this configuration');
      alert('No tradable assets available for this configuration. Please try again.');
      return;
    }

    if (!gameAssets.gold) {
      console.warn('⚠️ Gold data not available');
    }
    
    // Step 5: Set all available assets (but don't unlock them yet!)
    stocks = gameAssets.stocks || [];
    setAvailableStocks(stocks);

    setAvailableMutualFunds(gameAssets.mutualFunds || []);
    setAvailableIndexFunds(gameAssets.indexFunds || []);
    setAvailableCommodities(gameAssets.commodities || []);
    setAvailableREITs(gameAssets.reit || []);
    setAvailableCrypto(gameAssets.crypto || []);
    setAvailableForex(gameAssets.forex || []);

    if (gameAssets.gold) {
      setGoldData(gameAssets.gold);
    }

    // Store assets globally for unlock access
    window.gameAssets = gameAssets;

    // Step 4: Generate timeline-based events
    // Use the calculated end year from gameAssets (not hardcoded 2025)
    const yearEvents = generateTimelineBasedEvents(gameAssets, gameAssets.startYear, gameAssets.endYear);

    // Store events globally for solo mode
    window.gameYearEvents = yearEvents;

    console.log('📅 Timeline-based events generated:', Object.keys(yearEvents).length);
  }
  
  // Common setup for both modes
  setGameStartYear(startYear);
  setGameState('playing');
  setCurrentMonth(0);
  setPocketCash(50000);
  
  // Reset investments
  setInvestments({
    savings: { amount: 0, roi: 4 },
    fixedDeposits: [],
    gold: { grams: 0, avgPrice: 0, totalInvested: 0 },
    ppf: { amount: 0, roi: 7.1 },
    stocks: [],
    mutualFunds: [],
    indexFunds: [],
    commodities: [],
    reit: [],
    crypto: [],
    forex: []
  });
  
  // Solo mode: Start with only savings available
  if (mode === 'solo') {
    setAvailableInvestments(['savings']);
    setScreen('game');
  }
  
  setMajorExpenses([]);
  setNetworthHistory([{ month: 0, networth: 50000 }]);
  
  console.log('✅ Game started successfully!\n');
};

const buyMutualFund = (mfId, amount) => {
  const currentNAV = getCurrentPrice(mfId, currentMonth);
  const units = amount / currentNAV;
  
  if (amount > pocketCash) return;
  
  setPocketCash(prev => prev - amount);
  
  const existing = investments.mutualFunds.find(m => m.id === mfId);
  if (existing) {
    const totalUnits = existing.units + units;
    const totalCost = existing.avgNAV * existing.units + amount;
    setInvestments(prev => ({
      ...prev,
      mutualFunds: prev.mutualFunds.map(m =>
        m.id === mfId ? { ...m, units: totalUnits, avgNAV: totalCost / totalUnits } : m
      )
    }));
  } else {
    setInvestments(prev => ({
      ...prev,
      mutualFunds: [...prev.mutualFunds, { id: mfId, units, avgPrice: currentNAV }]
    }));
  }
};

const sellMutualFund = (mfId, units) => {
  const existing = investments.mutualFunds.find(m => m.id === mfId);
  if (!existing || existing.units < units) return;
  
  const currentNAV = getCurrentPrice(mfId, currentMonth);
  const revenue = units * currentNAV;
  
  setPocketCash(prev => prev + revenue);
  
  if (existing.units === units) {
    setInvestments(prev => ({
      ...prev,
      mutualFunds: prev.mutualFunds.filter(m => m.id !== mfId)
    }));
  } else {
    setInvestments(prev => ({
      ...prev,
      mutualFunds: prev.mutualFunds.map(m =>
        m.id === mfId ? { ...m, units: m.units - units } : m
      )
    }));
  }
};

const buyAsset = (assetId, units, category) => {
  const currentPrice = getCurrentPrice(assetId, currentMonth);
  const cost = currentPrice * units;
  
  if (cost > pocketCash) return;
  
  setPocketCash(prev => prev - cost);
  
  const existing = investments[category].find(a => a.id === assetId);
  if (existing) {
    const totalUnits = existing.units + units;
    const totalCost = existing.avgPrice * existing.units + cost;
    setInvestments(prev => ({
      ...prev,
      [category]: prev[category].map(a =>
        a.id === assetId ? { ...a, units: totalUnits, avgPrice: totalCost / totalUnits } : a
      )
    }));
  } else {
    setInvestments(prev => ({
      ...prev,
      [category]: [...prev[category], { id: assetId, units, avgPrice: currentPrice }]
    }));
  }
};

const sellAsset = (assetId, units, category) => {
  const existing = investments[category].find(a => a.id === assetId);
  if (!existing || existing.units < units) return;
  
  const currentPrice = getCurrentPrice(assetId, currentMonth);
  const revenue = units * currentPrice;
  
  setPocketCash(prev => prev + revenue);
  
  if (existing.units === units) {
    setInvestments(prev => ({
      ...prev,
      [category]: prev[category].filter(a => a.id !== assetId)
    }));
  } else {
    setInvestments(prev => ({
      ...prev,
      [category]: prev[category].map(a =>
        a.id === assetId ? { ...a, units: a.units - units } : a
      )
    }));
  }
};



  const buyStock = (stockId, shares) => {
    const currentPrice = getCurrentPrice(stockId, currentMonth);
    const cost = currentPrice * shares;
    if (cost > pocketCash) return;
    if (mode === 'multiplayer' && multiplayer.socket) {
      multiplayer.buyStock(stockId, shares);
      setShowStockModal(false);
      setStockAmounts(prev => ({ ...prev, [stockId]: 1 }));
      return;
    }
    setPocketCash(prev => prev - cost);
    const existingStock = investments.stocks.find(s => s.id === stockId);
    if (existingStock) {
      setInvestments(prev => ({ ...prev, stocks: prev.stocks.map(s => s.id === stockId ? { ...s, shares: s.shares + shares, avgPrice: (s.avgPrice * s.shares + cost) / (s.shares + shares) } : s) }));
    } else {
      setInvestments(prev => ({ ...prev, stocks: [...prev.stocks, { id: stockId, shares, avgPrice: currentPrice }] }));
    }
    setShowStockModal(false);
    setStockAmounts(prev => ({ ...prev, [stockId]: 1 }));
  };

  const sellStock = (stockId, shares) => {
    const existingStock = investments.stocks.find(s => s.id === stockId);
    if (!existingStock || existingStock.shares < shares) return;
    if (mode === 'multiplayer' && multiplayer.socket) {
      multiplayer.sellStock(stockId, shares);
      setShowStockModal(false);
      setStockAmounts(prev => ({ ...prev, [stockId]: 1 }));
      return;
    }
    const currentPrice = getCurrentPrice(stockId, currentMonth);
    const revenue = currentPrice * shares;
    setPocketCash(prev => prev + revenue);
    if (existingStock.shares === shares) {
      setInvestments(prev => ({ ...prev, stocks: prev.stocks.filter(s => s.id !== stockId) }));
    } else {
      setInvestments(prev => ({ ...prev, stocks: prev.stocks.map(s => s.id === stockId ? { ...s, shares: s.shares - shares } : s) }));
    }
    setShowStockModal(false);
    setStockAmounts(prev => ({ ...prev, [stockId]: 1 }));
  };

  const sellMutualFunds = (amount) => {
    if (amount <= investments.mutualFunds.amount && amount > 0) {
      setPocketCash(prev => prev + amount);
      setInvestments(prev => ({ ...prev, mutualFunds: { ...prev.mutualFunds, amount: prev.mutualFunds.amount - amount, initialAmount: Math.max(0, prev.mutualFunds.initialAmount - amount) } }));
    }
  };

  const withdrawFD = (index) => {
    const fd = investments.fixedDeposits[index];
    if (!fd) return;
    
    // Check if FD is matured
    const isMatured = fd.monthsElapsed >= fd.duration;
    
    if (!isMatured) {
      // Early withdrawal - apply penalty
      const penaltyRate = 0.5; // 0.5% penalty per remaining month
      const remainingMonths = fd.duration - fd.monthsElapsed;
      const penalty = fd.amount * (penaltyRate / 100) * remainingMonths;
      const totalAmount = fd.amount + fd.profit - penalty;
      
      // Show confirmation for penalty
      const confirmed = window.confirm(
        `⚠️ Early Withdrawal Penalty\n` +
        `FD Duration: ${fd.duration} months\n` +
        `Elapsed: ${fd.monthsElapsed} months\n` +
        `Remaining: ${remainingMonths} months\n` +
        `Penalty: ${formatCurrency(penalty)}\n` +
        `You will receive: ${formatCurrency(totalAmount)}\n\n` +
        `Continue with early withdrawal?`
      );
      
      if (!confirmed) return;
      
      setPocketCash(prev => prev + totalAmount);
      setInvestments(prev => ({ ...prev, fixedDeposits: prev.fixedDeposits.filter((_, i) => i !== index) }));
    } else {
      // Matured FD - no penalty
      const totalAmount = fd.amount + fd.profit;
      setPocketCash(prev => prev + totalAmount);
      setInvestments(prev => ({ ...prev, fixedDeposits: prev.fixedDeposits.filter((_, i) => i !== index) }));
    }
  };

  const sellGold = (grams) => {
    if (grams <= investments.gold.grams && grams > 0) {
      const currentGoldPrice = getCurrentGoldPrice(currentMonth);
      const revenue = grams * currentGoldPrice;
      setPocketCash(prev => prev + revenue);
      setInvestments(prev => ({ ...prev, gold: { ...prev.gold, grams: prev.gold.grams - grams } }));
    }
  };

  const copyRoomCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(multiplayer.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = multiplayer.roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      document.body.removeChild(textArea);
    }
  };

const StockCard = ({ stock }) => {
    const currentPrice = getCurrentPrice(stock.id, currentMonth);
    const myStock = investments.stocks.find(s => s.id === stock.id);
    const prevPrice = currentMonth > 0 ? getCurrentPrice(stock.id, currentMonth - 1) : currentPrice;
    const monthChange = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice * 100) : 0;
    const myShares = myStock?.shares || 0;
    const avgPrice = myStock?.avgPrice || 0;
    const profitLoss = myShares > 0 ? (currentPrice - avgPrice) * myShares : 0;
    const profitLossPercent = myShares > 0 ? ((currentPrice - avgPrice) / avgPrice * 100) : 0;
    const currentStockAmount = stockAmounts[stock.id] || 1;
    const setCurrentStockAmount = (value) => {
      setStockAmounts(prev => ({ ...prev, [stock.id]: value }));
    };
    // Simple sparkline - just get last 12 months of data
    const sparklineData = React.useMemo(() => {
      const history = [];
      const startMonth = Math.max(0, currentMonth - 11);
      for (let m = startMonth; m <= currentMonth; m++) {
        history.push(getCurrentPrice(stock.id, m));
      }
      return history;
    }, [stock.id, currentMonth]);

    const minPrice = Math.min(...sparklineData);
    const maxPrice = Math.max(...sparklineData);
    const priceRange = maxPrice - minPrice || 1;

    return (
      <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-bold text-gray-800 text-lg">{stock.symbol}</div>
              {monthChange >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
            </div>
            <div className="text-xs text-gray-600">{stock.sector}</div>
            <div className="font-bold text-gray-800 text-sm mb-1">{stock.name}</div>
          </div>
          
          {/* Simple SVG Sparkline */}
          <svg width="80" height="30" className="ml-2">
            <polyline
              fill="none"
              stroke={monthChange >= 0 ? "#16a34a" : "#dc2626"}
              strokeWidth="2"
              points={sparklineData.map((price, i) => {
                const x = (i / (sparklineData.length - 1)) * 80;
                const y = 30 - ((price - minPrice) / priceRange) * 30;
                return `${x},${y}`;
              }).join(' ')}
            />
          </svg>
        </div>

        <div className="mb-3">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(currentPrice)}</div>
          <div className={`text-sm font-semibold ${monthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {monthChange >= 0 ? '▲' : '▼'} {Math.abs(monthChange).toFixed(2)}% this month
          </div>
        </div>

        {myShares > 0 && (
          <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-xs text-gray-600">Shares:</span>
                <span className="font-bold text-gray-800 ml-1">{myShares}</span>
              </div>
              <div>
                <span className="text-xs text-gray-600">Avg:</span>
                <span className="font-bold text-gray-800 ml-1">{formatCurrency(avgPrice)}</span>
              </div>
            </div>
            <div className="border-t border-blue-200 pt-2">
              <div className="text-xs text-gray-600 mb-1">Profit & Loss</div>
              <div className={`text-xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profitLoss)}
                <span className="text-sm ml-2">({profitLossPercent > 0 ? '+' : ''}{profitLossPercent.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mb-3">
          <label className="text-xs text-gray-600 mb-2 block">Select Quantity</label>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setCurrentStockAmount(1)}
              className={`py-1.5 rounded text-xs font-semibold transition-colors ${
                currentStockAmount === 1 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentStockAmount(10)}
              className={`py-1.5 rounded text-xs font-semibold transition-colors ${
                currentStockAmount === 10 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              10
            </button>
            <button
              onClick={() => setCurrentStockAmount(100)}
              className={`py-1.5 rounded text-xs font-semibold transition-colors ${
                currentStockAmount === 100 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              100
            </button>
            <button
              onClick={() => setCurrentStockAmount(Math.floor(pocketCash / currentPrice))}
              className={`py-1.5 rounded text-xs font-semibold transition-colors ${
                currentStockAmount === Math.floor(pocketCash / currentPrice)
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Max affordable"
            >
              MAX
            </button>
          </div>
          <div className="text-xs text-gray-600 mt-2 text-center">
            Cost: {formatCurrency(currentPrice * currentStockAmount)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => buyStock(stock.id, currentStockAmount)} disabled={currentPrice * currentStockAmount > pocketCash} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded text-sm font-semibold">
            Buy
          </button>
          <button onClick={() => sellStock(stock.id, currentStockAmount)} disabled={myShares < currentStockAmount} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded text-sm font-semibold">
            Sell
          </button>
        </div>
      </div>
    );
  };

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-white to-green-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-4 border-orange-600">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">₹</div>
            <h1 className="text-4xl font-bold text-orange-600 mb-2">Build Your Dhan</h1>
            <p className="text-gray-600">Stock Trading Challenge</p>
          </div>
          <div className="space-y-4">
            <button onClick={() => { setMode('solo'); setScreen('instructions'); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg text-lg font-semibold">Play Solo</button>
            <button onClick={() => { setMode('multiplayer'); setScreen('multiplayer-menu'); }} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-lg text-lg font-semibold">Multiplayer</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'multiplayer-menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-white to-green-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-4 border-orange-600">
          <button onClick={() => setScreen('menu')} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"><ArrowLeft className="w-5 h-5" /> Back</button>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-orange-600 mb-2">Multiplayer Mode</h1>
          </div>
          <div className="space-y-4">
            <button onClick={() => setScreen('create-room')} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-lg flex items-center justify-center gap-2 text-lg font-semibold"><Users className="w-5 h-5" />Create Room</button>
            <button onClick={() => setScreen('join-room')} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg flex items-center justify-center gap-2 text-lg font-semibold"><Play className="w-5 h-5" />Join Room</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'create-room') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-orange-600 mb-6 text-center">Create Room</h2>
          {multiplayer.error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800"><AlertCircle className="w-5 h-5" />{multiplayer.error}</div>}
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label><input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter name" className="w-full px-4 py-3 border border-gray-300 rounded-lg" maxLength={20} /></div>
            <button onClick={async () => {
  if (playerName.trim()) {
    const MIN_YEAR = 1990;
    const MAX_YEAR = 2005;
    const startYear = MIN_YEAR + Math.floor(Math.random() * (MAX_YEAR - MIN_YEAR + 1));
    
    // Use the same initialization function as solo mode
    await handleCreateMultiplayerRoom(startYear, playerName);
    setScreen('lobby');  } }} disabled={!playerName.trim()} className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-4 rounded-lg text-lg font-semibold">Create</button>
            <button onClick={() => setScreen('multiplayer-menu')} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold">Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'join-room') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-green-600 mb-6 text-center">Join Room</h2>
          {multiplayer.error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800"><AlertCircle className="w-5 h-5" />{multiplayer.error}</div>}
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label><input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter name" className="w-full px-4 py-3 border border-gray-300 rounded-lg" maxLength={20} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label><input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="6-char code" className="w-full px-4 py-3 border border-gray-300 rounded-lg uppercase text-center text-2xl font-bold" maxLength={6} /></div>
            <button onClick={() => { if (playerName.trim() && joinCode.trim().length === 6) { multiplayer.joinRoom(joinCode, playerName); setScreen('lobby'); } }} disabled={!playerName.trim() || joinCode.trim().length !== 6} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 rounded-lg text-lg font-semibold">Join</button>
            <button onClick={() => setScreen('multiplayer-menu')} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold">Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    const myPlayer = multiplayer.players.find(p => p.id === multiplayer.myPlayerId);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-orange-600 mb-2">Waiting Room</h2>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-green-500 p-6 rounded-xl mb-6">
            <div className="text-center">
              <div className="text-sm text-white/80 mb-2">Room Code</div>
              <div className="flex items-center justify-center gap-3">
                <div className="text-5xl font-bold text-white tracking-widest">{multiplayer.roomCode}</div>
                <button onClick={copyRoomCode} className="bg-white/20 hover:bg-white/30 p-3 rounded-lg">{copied ? <Check className="w-6 h-6 text-white" /> : <Copy className="w-6 h-6 text-white" />}</button>
              </div>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Players ({multiplayer.players.length}/8)</h3>
            <div className="space-y-2">
              {multiplayer.players.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-green-400 rounded-full flex items-center justify-center text-white font-bold">{index + 1}</div>
                    <div className="font-bold text-gray-800">{player.name}</div>
                  </div>
                  {player.isHost && <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-semibold">HOST</span>}
                </div>
              ))}
            </div>
          </div>
          {myPlayer?.isHost ? (
            <button onClick={() => multiplayer.startGame()} disabled={multiplayer.players.length < 2} className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-4 rounded-lg text-lg font-semibold flex items-center justify-center gap-2"><Play className="w-5 h-5" />{multiplayer.players.length < 2 ? 'Need 2+ players' : 'Start Game'}</button>
          ) : (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-blue-800 font-semibold">Waiting for host...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <button onClick={() => setScreen('menu')} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"><ArrowLeft className="w-5 h-5" /> Back</button>
          <h2 className="text-3xl font-bold text-orange-600 mb-6 text-center">How to Play</h2>
          <div className="space-y-4 text-gray-700 mb-8">
            <div className="flex gap-3"><div className="text-2xl">💰</div><div><strong>Starting:</strong> ₹50,000 cash</div></div>
            <div className="flex gap-3"><div className="text-2xl">⏱️</div><div><strong>Duration:</strong> 20 years (240 months)</div></div>
            <div className="flex gap-3"><div className="text-2xl">📈</div><div><strong>Real Data:</strong> Historical stock prices</div></div>
            <div className="flex gap-3"><div className="text-2xl">🎯</div><div><strong>Goal:</strong> Maximize net worth</div></div>
          </div>
          <button onClick={startGame} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-lg text-lg font-semibold">Start</button>
        </div>
      </div>
    );
  }

  if (screen === 'game' && gameState === 'playing') {
    const networth = calculateNetWorth();
    const growth = ((networth / 50000 - 1) * 100).toFixed(1);

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-gradient-to-r from-orange-600 to-green-600 text-white p-6 rounded-lg shadow-lg mb-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5" /><span className="text-xl font-bold">Year {currentYear}, Month {monthInYear + 1}</span></div>
              <div className="text-sm opacity-90">{currentMonth}/240</div>
              {gameStartYear && (
                <div className="text-xs opacity-75 mt-1">
                  Playing: {gameStartYear + currentYear} ({gameStartYear}-{gameStartYear + 19})
                </div>
              )}
              {mode === 'multiplayer' && <div className="text-sm opacity-90">Room: {multiplayer.roomCode}</div>}
            </div>
            <div className="flex gap-6">
              <div><div className="text-sm opacity-90">Cash</div><div className="text-2xl font-bold">{formatCurrency(pocketCash)}</div></div>
              <div><div className="text-sm opacity-90">Net Worth</div><div className="text-2xl font-bold">{formatCurrency(networth)}</div><div className="text-sm opacity-90">+{growth}%</div></div>
            </div>
          </div>
        </div>

        {mode === 'multiplayer' && multiplayer.leaderboard.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-600" />Leaderboard</h3>
            <div className="space-y-2">
              {multiplayer.leaderboard.map((player, index) => (
                <div key={player.id} className={`flex items-center justify-between p-3 rounded-lg ${player.id === multiplayer.myPlayerId ? 'bg-orange-100 border-2 border-orange-400' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{index + 1}</div>
                    <div className="font-bold text-gray-800">{player.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatCurrency(player.netWorth)}</div>
                    <div className={`text-sm ${player.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{player.growth >= 0 ? '+' : ''}{player.growth}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
              <div className="text-center mb-6">
                {showEvent.type === 'gain' && <div className="text-6xl mb-4">🎉</div>}
                {showEvent.type === 'loss' && <div className="text-6xl mb-4">😰</div>}
                {showEvent.type === 'unlock' && <div className="text-6xl mb-4">🔓</div>}
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{showEvent.type === 'gain' ? 'Good News!' : showEvent.type === 'loss' ? 'Expense' : 'Unlocked!'}</h3>
                <p className="text-gray-600">{showEvent.message}</p>
                {showEvent.amount && <div className={`text-3xl font-bold mt-4 ${showEvent.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(showEvent.amount))}</div>}
              </div>
              <button onClick={() => { setShowEvent(null); setIsPaused(false); }} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold">Continue</button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {availableInvestments.includes('stocks') && (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Stocks</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {availableStocks.map(stock => (
                  <StockCard key={stock.id} stock={stock} />
                ))}
              </div>
            </div>
          )}

          {availableInvestments.includes('savings') && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Savings Account</h3>
              <p className="text-sm text-gray-600 mb-4">4% p.a. | Max: ₹50,00,000</p>
              <div className="mb-4">
                <div className="text-sm text-gray-600">Balance</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(Math.round(investments.savings.amount))}</div>
              </div>

              {/* Single Amount Input */}
              <div className="mb-3">
                <label className="text-xs text-gray-600 mb-1 block">Amount</label>
                <input
                  type="number"
                  id="savingsAmount"
                  min="1"
                  placeholder="Enter amount"
                  className="w-full border rounded px-3 py-2 text-sm mb-2"
                />

                {/* Deposit and Withdraw Buttons with MAX/ALL */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Deposit Section */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        const input = document.getElementById('savingsAmount');
                        const depositAmount = parseInt(input.value) || 0;
                        const newBalance = investments.savings.amount + depositAmount;
                        if (depositAmount > 0 && pocketCash >= depositAmount && newBalance <= 5000000) {
                          setPocketCash(prev => prev - depositAmount);
                          setInvestments(prev => ({ ...prev, savings: { ...prev.savings, amount: newBalance } }));
                          input.value = '';
                        }
                      }}
                      disabled={investments.savings.amount >= 5000000}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded text-sm font-semibold"
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => {
                        const input = document.getElementById('savingsAmount');
                        const maxDeposit = Math.min(pocketCash, 5000000 - investments.savings.amount);
                        input.value = Math.floor(maxDeposit);
                      }}
                      disabled={pocketCash === 0 || investments.savings.amount >= 5000000}
                      className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-1 rounded text-xs font-semibold"
                    >
                      MAX
                    </button>
                  </div>

                  {/* Withdraw Section */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        const input = document.getElementById('savingsAmount');
                        const withdrawAmount = parseInt(input.value) || 0;
                        if (withdrawAmount > 0 && investments.savings.amount >= withdrawAmount) {
                          setPocketCash(prev => prev + withdrawAmount);
                          setInvestments(prev => ({ ...prev, savings: { ...prev.savings, amount: prev.savings.amount - withdrawAmount } }));
                          input.value = '';
                        }
                      }}
                      disabled={investments.savings.amount === 0}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded text-sm font-semibold"
                    >
                      Withdraw
                    </button>
                    <button
                      onClick={() => {
                        const input = document.getElementById('savingsAmount');
                        input.value = Math.floor(investments.savings.amount);
                      }}
                      disabled={investments.savings.amount === 0}
                      className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-1 rounded text-xs font-semibold"
                    >
                      ALL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {availableInvestments.includes('mutualFunds') && availableMutualFunds.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-3">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Mutual Funds</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableMutualFunds.map(fund => (
                <MutualFundCard key={fund.id} fund={fund} />
              ))}
            </div>
          </div>
        )}

        {availableInvestments.includes('fixedDeposits') && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Fixed Deposits</h3>
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Active: {investments.fixedDeposits.length}/3</div>
                  {investments.fixedDeposits.map((fd, idx) => {
                    const isMatured = fd.monthsElapsed >= fd.duration;
                    const remainingMonths = fd.duration - fd.monthsElapsed;
                    return (
                      <div key={idx} className={`mt-2 p-3 rounded text-sm border-2 ${isMatured ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">₹{fd.amount.toLocaleString()} ({fd.duration}M)</span>
                          <span className="text-green-600 font-bold">+₹{Math.round(fd.profit).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          <div>Elapsed: {fd.monthsElapsed}/{fd.duration} months</div>
                          {!isMatured && (
                            <div className="text-orange-600 font-semibold mt-1">
                              ⏳ Matures in {remainingMonths} months
                            </div>
                          )}
                          {isMatured && (
                            <div className="text-green-600 font-semibold mt-1">
                              ✅ Matured
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => withdrawFD(idx)} 
                          className={`w-full py-1.5 rounded text-xs font-semibold transition-colors ${
                            isMatured 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-orange-600 hover:bg-orange-700 text-white'
                          }`}
                        >
                          {isMatured ? 'Withdraw' : 'Early Withdraw (Penalty)'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <button onClick={() => {
                    if (pocketCash >= 10000 && investments.fixedDeposits.length < 3) {
                      setPocketCash(prev => prev - 10000);
                      setInvestments(prev => ({ ...prev, fixedDeposits: [...prev.fixedDeposits, { amount: 10000, duration: 12, roi: getCurrentFDRate('1Y'), monthsElapsed: 0, profit: 0 }] }));
                    }
                  }} disabled={pocketCash < 10000 || investments.fixedDeposits.length >= 3} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">
                    1Y FD ({getCurrentFDRate('1Y').toFixed(1)}%)
                  </button>
                  <button onClick={() => {
                    if (pocketCash >= 10000 && investments.fixedDeposits.length < 3) {
                      setPocketCash(prev => prev - 10000);
                      setInvestments(prev => ({ ...prev, fixedDeposits: [...prev.fixedDeposits, { amount: 10000, duration: 24, roi: getCurrentFDRate('2Y'), monthsElapsed: 0, profit: 0 }] }));
                    }
                  }} disabled={pocketCash < 10000 || investments.fixedDeposits.length >= 3} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">
                    2Y FD ({getCurrentFDRate('2Y').toFixed(1)}%)
                  </button>
                  <button onClick={() => {
                    if (pocketCash >= 10000 && investments.fixedDeposits.length < 3) {
                      setPocketCash(prev => prev - 10000);
                      setInvestments(prev => ({ ...prev, fixedDeposits: [...prev.fixedDeposits, { amount: 10000, duration: 36, roi: getCurrentFDRate('3Y'), monthsElapsed: 0, profit: 0 }] }));
                    }
                  }} disabled={pocketCash < 10000 || investments.fixedDeposits.length >= 3} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">
                    3Y FD ({getCurrentFDRate('3Y').toFixed(1)}%)
                  </button>
                  <button onClick={() => {
                    if (pocketCash >= 10000 && investments.fixedDeposits.length < 3) {
                      setPocketCash(prev => prev - 10000);
                      setInvestments(prev => ({ ...prev, fixedDeposits: [...prev.fixedDeposits, { amount: 10000, duration: 60, roi: getCurrentFDRate('5Y'), monthsElapsed: 0, profit: 0 }] }));
                    }
                  }} disabled={pocketCash < 10000 || investments.fixedDeposits.length >= 3} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">
                    5Y FD ({getCurrentFDRate('5Y').toFixed(1)}%)
                  </button>
                </div>
              </div>
            )}

            {availableInvestments.includes('gold') && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Gold</h3>
                <GoldCard />
              </div>
            )}

          {/* ----------Index Funds Section ------*/}
          {availableInvestments.includes('indexFunds') && availableIndexFunds.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Index Funds</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableIndexFunds.map(fund => {
                  const currentAmount = assetAmounts[fund.id] || 1;
                  const setCurrentAmount = (value) => {
                    setAssetAmounts(prev => ({ ...prev, [fund.id]: value }));
                  };
                  return (
                    <AssetCard
                      key={fund.id}
                      asset={fund}
                      category="indexFunds"
                      categoryDisplayName="Index Fund"
                      amount={currentAmount}
                      setAmount={setCurrentAmount}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Commodities Section */}
          {availableInvestments.includes('commodities') && availableCommodities.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Commodities</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCommodities.map(commodity => {
                  const currentAmount = assetAmounts[commodity.id] || 1;
                  const setCurrentAmount = (value) => {
                    setAssetAmounts(prev => ({ ...prev, [commodity.id]: value }));
                  };
                  return (
                    <AssetCard
                      key={commodity.id}
                      asset={commodity}
                      category="commodities"
                      categoryDisplayName="Commodity"
                      amount={currentAmount}
                      setAmount={setCurrentAmount}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* REITs Section */}
          {availableInvestments.includes('reit') && availableREITs.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-bold text-gray-800 mb-4">REITs</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableREITs
                  .filter(reit => typeof gameStartYear === 'number' ? reit.startYear <= (gameStartYear + Math.floor(currentMonth / 12)) : true)
                  .map(reit => {
                  const currentAmount = assetAmounts[reit.id] || 1;
                  const setCurrentAmount = (value) => {
                    setAssetAmounts(prev => ({ ...prev, [reit.id]: value }));
                  };
                  return (
                    <AssetCard
                      key={reit.id}
                      asset={reit}
                      category="reit"
                      categoryDisplayName="REIT"
                      amount={currentAmount}
                      setAmount={setCurrentAmount}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Crypto Section */}
          {availableInvestments.includes('crypto') && availableCrypto.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Cryptocurrency</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCrypto
                  .filter(crypto => typeof gameStartYear === 'number' ? crypto.startYear <= (gameStartYear + Math.floor(currentMonth / 12)) : true)
                  .map(crypto => {
                  const currentAmount = assetAmounts[crypto.id] || 1;
                  const setCurrentAmount = (value) => {
                    setAssetAmounts(prev => ({ ...prev, [crypto.id]: value }));
                  };
                  return (
                    <AssetCard
                      key={crypto.id}
                      asset={crypto}
                      category="crypto"
                      categoryDisplayName="Crypto"
                      amount={currentAmount}
                      setAmount={setCurrentAmount}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Forex Section */}
          {availableInvestments.includes('forex') && availableForex.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Foreign Exchange</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableForex.map(fx => {
                  const currentAmount = assetAmounts[fx.id] || 1;
                  const setCurrentAmount = (value) => {
                    setAssetAmounts(prev => ({ ...prev, [fx.id]: value }));
                  };
                  return (
                    <AssetCard
                      key={fx.id}
                      asset={fx}
                      category="forex"
                      categoryDisplayName="Forex"
                      amount={currentAmount}
                      setAmount={setCurrentAmount}
                    />
                  );
                })}
              </div>
            </div>
          )}


        </div>
      </div>
    );
  }

  if (screen === 'game' && gameState === 'gameOver') {
    const finalNetWorth = calculateNetWorth();
    const growth = ((finalNetWorth / 50000 - 1) * 100).toFixed(1);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-gray-800 mb-2">Game Complete!</h2>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-green-500 text-white p-8 rounded-xl mb-6">
            <div className="text-center"><div className="text-lg mb-2">Final Net Worth</div><div className="text-5xl font-bold">{formatCurrency(finalNetWorth)}</div><div className="text-xl mt-2">+{growth}%</div></div>
          </div>
          {mode === 'multiplayer' && multiplayer.leaderboard.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Final Leaderboard</h3>
              <div className="space-y-2">
                {multiplayer.leaderboard.slice(0, 5).map((player, index) => (
                  <div key={player.id} className={`flex items-center justify-between p-4 rounded-lg ${player.id === multiplayer.myPlayerId ? 'bg-orange-100' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{index + 1}</div>
                      <div className="font-bold text-gray-800">{player.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(player.netWorth)}</div>
                      <div className={`text-sm ${player.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{player.growth >= 0 ? '+' : ''}{player.growth}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setScreen('menu')} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-lg text-lg font-semibold">Back to Menu</button>
        </div>
      </div>
    );
  }

  return null;
}

export default App;