import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Calendar, Trophy, IndianRupee, Play, TrendingUp, TrendingDown, X, ArrowLeft, Users, Copy, Check, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { useMultiplayer } from './hooks/useMultiplayer';

const MONTH_DURATION = parseInt(import.meta.env.VITE_SOLO_MONTH_DURATION || '5000');
console.log('SOLO_MONTH_DURATION (raw):', import.meta.env.VITE_SOLO_MONTH_DURATION);
console.log('SOLO_MONTH_DURATION (parsed):', MONTH_DURATION);
console.log('URL:', import.meta.env.VITE_SOCKET_URL);

const loadStockDataFromCSV = async (filename) => {
  try {
    const response = await fetch(`/data/stocks/${filename}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error(`No data`);
    
    const header = lines[0].split(',');
    const dateIndex = header.findIndex(h => h.toLowerCase().includes('date'));
    const closeIndex = header.findIndex(h => h.toLowerCase().includes('close'));
    if (dateIndex === -1 || closeIndex === -1) throw new Error(`Invalid CSV`);
    
    const yearlyData = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length <= Math.max(dateIndex, closeIndex)) continue;
      
      const dateStr = parts[dateIndex];
      const closeStr = parts[closeIndex];
      if (!dateStr || !closeStr) continue;
      
      try {
        const year = new Date(dateStr).getFullYear();
        const price = parseFloat(closeStr);
        if (!isNaN(price) && price > 0 && year >= 1990 && year <= 2030) {
          if (!yearlyData[year]) yearlyData[year] = [];
          yearlyData[year].push(price);
        }
      } catch (e) {}
    }
    
    const prices = [];
    const sortedYears = Object.keys(yearlyData).sort((a, b) => parseInt(a) - parseInt(b));
    sortedYears.forEach(year => {
      const avgPrice = yearlyData[year].reduce((a, b) => a + b, 0) / yearlyData[year].length;
      prices.push({ year: parseInt(year), price: Math.round(avgPrice) });
    });
    
    return prices;
  } catch (error) {
    return [];
  }
};

// Stock metadata - COMPLETE NIFTY 50 LIST
const STOCK_METADATA = [
  { id: 'tcs', name: 'Tata Consultancy Services', symbol: 'TCS', sector: 'IT', csvFile: 'TCS.csv' },
  { id: 'infosys', name: 'Infosys', symbol: 'INFY', sector: 'IT', csvFile: 'INFY.csv' },
  { id: 'wipro', name: 'Wipro', symbol: 'WIPRO', sector: 'IT', csvFile: 'WIPRO.csv' },
  { id: 'hcltech', name: 'HCL Technologies', symbol: 'HCLTECH', sector: 'IT', csvFile: 'HCLTECH.csv' },
  { id: 'techm', name: 'Tech Mahindra', symbol: 'TECHM', sector: 'IT', csvFile: 'TECHM.csv' },
  { id: 'hdfcbank', name: 'HDFC Bank', symbol: 'HDFCBANK', sector: 'Banking', csvFile: 'HDFCBANK.csv' },
  { id: 'icicibank', name: 'ICICI Bank', symbol: 'ICICIBANK', sector: 'Banking', csvFile: 'ICICIBANK.csv' },
  { id: 'sbin', name: 'State Bank of India', symbol: 'SBIN', sector: 'Banking', csvFile: 'SBIN.csv' },
  { id: 'axisbank', name: 'Axis Bank', symbol: 'AXISBANK', sector: 'Banking', csvFile: 'AXISBANK.csv' },
  { id: 'kotakbank', name: 'Kotak Mahindra Bank', symbol: 'KOTAKBANK', sector: 'Banking', csvFile: 'KOTAKBANK.csv' },
  { id: 'indusindbk', name: 'IndusInd Bank', symbol: 'INDUSINDBK', sector: 'Banking', csvFile: 'INDUSINDBK.csv' },
  { id: 'bajfinance', name: 'Bajaj Finance', symbol: 'BAJFINANCE', sector: 'Finance', csvFile: 'BAJFINANCE.csv' },
  { id: 'bajajfinsv', name: 'Bajaj Finserv', symbol: 'BAJAJFINSV', sector: 'Finance', csvFile: 'BAJAJFINSV.csv' },
  { id: 'sbilife', name: 'SBI Life Insurance', symbol: 'SBILIFE', sector: 'Finance', csvFile: 'SBILIFE.csv' },
  { id: 'shriramfin', name: 'Shriram Finance', symbol: 'SHRIRAMFIN', sector: 'Finance', csvFile: 'SHRIRAMFIN.csv' },
  { id: 'reliance', name: 'Reliance Industries', symbol: 'RELIANCE', sector: 'Energy', csvFile: 'RELIANCE.csv' },
  { id: 'ongc', name: 'ONGC', symbol: 'ONGC', sector: 'Oil & Gas', csvFile: 'ONGC.csv' },
  { id: 'ntpc', name: 'NTPC', symbol: 'NTPC', sector: 'Power', csvFile: 'NTPC.csv' },
  { id: 'powergrid', name: 'Power Grid', symbol: 'POWERGRID', sector: 'Power', csvFile: 'POWERGRID.csv' },
  { id: 'gail', name: 'GAIL', symbol: 'GAIL', sector: 'Oil & Gas', csvFile: 'GAIL.csv' },
  { id: 'maruti', name: 'Maruti Suzuki', symbol: 'MARUTI', sector: 'Auto', csvFile: 'MARUTI.csv' },
  { id: 'tatamotors', name: 'Tata Motors', symbol: 'TATAMOTORS', sector: 'Auto', csvFile: 'TATAMOTORS.csv' },
  { id: 'mahindra', name: 'Mahindra & Mahindra', symbol: 'M&M', sector: 'Auto', csvFile: 'M&M.csv' },
  { id: 'bajaj-auto', name: 'Bajaj Auto', symbol: 'BAJAJ-AUTO', sector: 'Auto', csvFile: 'BAJAJ-AUTO.csv' },
  { id: 'heromotoco', name: 'Hero MotoCorp', symbol: 'HEROMOTOCO', sector: 'Auto', csvFile: 'HEROMOTOCO.csv' },
  { id: 'hindunilvr', name: 'Hindustan Unilever', symbol: 'HINDUNILVR', sector: 'FMCG', csvFile: 'HINDUNILVR.csv' },
  { id: 'itc', name: 'ITC', symbol: 'ITC', sector: 'FMCG', csvFile: 'ITC.csv' },
  { id: 'nestleind', name: 'Nestlé India', symbol: 'NESTLEIND', sector: 'FMCG', csvFile: 'NESTLEIND.csv' },
  { id: 'tataconsum', name: 'Tata Consumer Products', symbol: 'TATACONSUM', sector: 'FMCG', csvFile: 'TATACONSUM.csv' },
  { id: 'titan', name: 'Titan Company', symbol: 'TITAN', sector: 'Consumer', csvFile: 'TITAN.csv' },
  { id: 'asianpaint', name: 'Asian Paints', symbol: 'ASIANPAINT', sector: 'Consumer', csvFile: 'ASIANPAINT.csv' },
  { id: 'tatasteel', name: 'Tata Steel', symbol: 'TATASTEEL', sector: 'Metals', csvFile: 'TATASTEEL.csv' },
  { id: 'jswsteel', name: 'JSW Steel', symbol: 'JSWSTEEL', sector: 'Metals', csvFile: 'JSWSTEEL.csv' },
  { id: 'hindalco', name: 'Hindalco Industries', symbol: 'HINDALCO', sector: 'Metals', csvFile: 'HINDALCO.csv' },
  { id: 'sunpharma', name: 'Sun Pharma', symbol: 'SUNPHARMA', sector: 'Pharma', csvFile: 'SUNPHARMA.csv' },
  { id: 'apollohosp', name: 'Apollo Hospitals', symbol: 'APOLLOHOSP', sector: 'Healthcare', csvFile: 'APOLLOHOSP.csv' },
  { id: 'maxhealth', name: 'Max Healthcare', symbol: 'MAXHEALTH', sector: 'Healthcare', csvFile: 'MAXHEALTH.csv' },
  { id: 'lt', name: 'Larsen & Toubro', symbol: 'LT', sector: 'Infrastructure', csvFile: 'LT.csv' },
  { id: 'ultracemco', name: 'UltraTech Cement', symbol: 'ULTRACEMCO', sector: 'Cement', csvFile: 'ULTRACEMCO.csv' },
  { id: 'grasim', name: 'Grasim Industries', symbol: 'GRASIM', sector: 'Cement', csvFile: 'GRASIM.csv' },
  { id: 'bhartiartl', name: 'Bharti Airtel', symbol: 'BHARTIARTL', sector: 'Telecom', csvFile: 'BHARTIARTL.csv' },
  { id: 'indigo', name: 'IndiGo', symbol: 'INDIGO', sector: 'Aviation', csvFile: 'INDIGO.csv' },
  { id: 'adanient', name: 'Adani Enterprises', symbol: 'ADANIENT', sector: 'Conglomerate', csvFile: 'ADANIENT.csv' },
  { id: 'adaniports', name: 'Adani Ports & SEZ', symbol: 'ADANIPORTS', sector: 'Infrastructure', csvFile: 'ADANIPORTS.csv' },
  { id: 'bel', name: 'Bharat Electronics', symbol: 'BEL', sector: 'Defense', csvFile: 'BEL.csv' },
  { id: 'trent', name: 'Trent', symbol: 'TRENT', sector: 'Retail', csvFile: 'TRENT.csv' },
  { id: 'jiofin', name: 'Jio Financial Services', symbol: 'JIOFIN', sector: 'Finance', csvFile: 'JIOFIN.csv' }
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
    { message: 'Won Kerala lottery!', amount: 25000 },
    { message: 'Diwali bonus from company', amount: 50000 },
    { message: 'Freelance project bonus', amount: 40000 },
    { message: 'Side business profit', amount: 35000 },
    { message: 'Performance bonus at work', amount: 45000 },
    { message: 'Tax refund received', amount: 20000 },
    { message: 'Sold old items online', amount: 15000 },
    { message: 'Investment dividend received', amount: 30000 }
  ],
  unlocks: [
    { message: 'Fixed Deposits now available', unlock: 'fixedDeposits', year: 1 },
    { message: 'Mutual Funds now available', unlock: 'mutualFunds', year: 2 },
    { message: 'Stock market access unlocked', unlock: 'stocks', year: 3 },
    { message: 'Gold investment available', unlock: 'gold', year: 10 },
    { message: 'PPF account opened', unlock: 'ppf', year: 15 }
  ]
};

// Generate random events (called once at game start)
const generateRandomEvents = () => {
  const events = {};
  const usedLossEvents = new Set();
  const usedGainEvents = new Set();
  
  // Add unlock events at fixed years
  EVENT_POOL.unlocks.forEach(unlock => {
    events[unlock.year] = { type: 'unlock', message: unlock.message, unlock: unlock.unlock };
  });
  
  // Generate random loss/gain events
  let nextEventMonth = Math.floor(Math.random() * 12) + 24; // First event between month 24-36
  
  while (nextEventMonth < 240) {
    const eventYear = Math.floor(nextEventMonth / 12);
    
    // Skip if year already has an unlock event
    if (!events[eventYear]) {
      // 60% chance of loss, 40% chance of gain
      const isLoss = Math.random() < 0.6;
      
      if (isLoss) {
        // Pick random loss event that hasn't been used
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
        // Pick random gain event that hasn't been used
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
  
  return events;
};

let yearlyEvents = generateRandomEvents();




function App() {
  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState(null);
  const [gameState, setGameState] = useState('instructions');
  const [currentMonth, setCurrentMonth] = useState(0);
  const [gameStartYear, setGameStartYear] = useState(null);
  const [pocketCash, setPocketCash] = useState(50000);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [investments, setInvestments] = useState({
    savings: { amount: 0, roi: 4 },
    fixedDeposits: [],
    mutualFunds: { amount: 0, initialAmount: 0, roi: 12 },
    stocks: [],
    gold: { grams: 0 },
    ppf: { amount: 0, roi: 7.1 }
  });
  const [availableInvestments, setAvailableInvestments] = useState(['savings']);
  const [showEvent, setShowEvent] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [majorExpenses, setMajorExpenses] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAmounts, setStockAmounts] = useState({});
  const [stockAmount, setStockAmount] = useState(1);
  const [networthHistory, setNetworthHistory] = useState([]);
  const [goldData, setGoldData] = useState(FALLBACK_STOCK_DATA.gold);
  const timerRef = useRef(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const multiplayer = useMultiplayer();

  const currentYear = Math.floor(currentMonth / 12);
  const monthInYear = currentMonth % 12;

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

  const selectRandomStocks = async () => {
    try {
      const loadedStocks = await Promise.all(
        STOCK_METADATA.map(async (meta) => {
          const priceData = await loadStockDataFromCSV(meta.csvFile);
          if (priceData.length >= 20) return { ...meta, prices: priceData.map(p => p.price), startYear: priceData[0].year };
          return null;
        })
      );
      const validStocks = loadedStocks.filter(s => s !== null);
      if (validStocks.length < 2) {
        const shuffled = [...FALLBACK_STOCK_DATA.stocks].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(5, shuffled.length));
      }
      const shuffled = validStocks.sort(() => Math.random() - 0.5);
      const count = Math.floor(Math.random() * 3) + 2;
      return shuffled.slice(0, count);
    } catch (error) {
      const shuffled = [...FALLBACK_STOCK_DATA.stocks].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(5, shuffled.length));
    }
  };

  const selectRandomStartYear = (stocks) => {
    const minDataLength = Math.min(...stocks.map(s => s.prices.length));
    const maxStartIndex = minDataLength - 20;
    if (maxStartIndex <= 0) return 0;
    return Math.floor(Math.random() * maxStartIndex);
  };

  const getCurrentPrice = (stockId, monthOffset) => {
    const stock = availableStocks.find(s => s.id === stockId);
    if (!stock) return 0;
    const yearOffset = Math.floor(monthOffset / 12);
    const monthInYear = monthOffset % 12;
    const priceIndex = gameStartYear + yearOffset;
    const nextPriceIndex = priceIndex + 1;
    if (stock.prices[priceIndex] !== undefined && stock.prices[nextPriceIndex] !== undefined) {
      const startPrice = stock.prices[priceIndex];
      const endPrice = stock.prices[nextPriceIndex];
      return Math.round(startPrice + (endPrice - startPrice) * (monthInYear / 12));
    }
    return stock.prices[priceIndex] || stock.prices[stock.prices.length - 1];
  };

  const getCurrentGoldPrice = (monthOffset) => {
    const yearOffset = Math.floor(monthOffset / 12);
    const monthInYear = monthOffset % 12;
    const priceIndex = gameStartYear + yearOffset;
    const nextPriceIndex = priceIndex + 1;
    if (goldData.prices[priceIndex] !== undefined && goldData.prices[nextPriceIndex] !== undefined) {
      const startPrice = goldData.prices[priceIndex];
      const endPrice = goldData.prices[nextPriceIndex];
      return Math.round(startPrice + (endPrice - startPrice) * (monthInYear / 12));
    }
    return goldData.prices[priceIndex] || goldData.prices[goldData.prices.length - 1];
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
    let total = pocketCash + investments.savings.amount + investments.mutualFunds.amount + investments.ppf.amount;
    investments.fixedDeposits.forEach(fd => { total += fd.amount + fd.profit; });
    investments.stocks.forEach(stock => { total += stock.shares * getCurrentPrice(stock.id, currentMonth); });
    if (investments.gold.grams > 0) total += investments.gold.grams * getCurrentGoldPrice(currentMonth);
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
    setAvailableInvestments(prev => {
      if (!prev.includes(event.unlock)) {
        return [...prev, event.unlock];
      }
      return prev;
    });
  }
  
  // For multiplayer, availableInvestments comes from server
  // Always show unlock notification
  if (event.unlock) {
    setIsPaused(true);
  }
};

  const updateInvestments = () => {
    if (investments.savings.amount > 0) {
      setInvestments(prev => ({ ...prev, savings: { ...prev.savings, amount: prev.savings.amount * (1 + prev.savings.roi / 100 / 12) } }));
    }
    if (investments.mutualFunds.amount > 0) {
      setInvestments(prev => ({ ...prev, mutualFunds: { ...prev.mutualFunds, amount: prev.mutualFunds.amount * (1 + prev.mutualFunds.roi / 100 / 12) } }));
    }
    if (investments.ppf.amount > 0) {
      setInvestments(prev => ({ ...prev, ppf: { ...prev.ppf, amount: prev.ppf.amount * (1 + prev.ppf.roi / 100 / 12) } }));
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
          if (month === 0 && yearlyEvents[year]) {
            setShowEvent(yearlyEvents[year]);
            handleEvent(yearlyEvents[year]);
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
    let stocks, startYear;
    if (mode === 'multiplayer' && multiplayer.availableStocks?.length > 0) {
      stocks = multiplayer.availableStocks;
      startYear = 0;
    } else {
      stocks = await selectRandomStocks();
      startYear = selectRandomStartYear(stocks);
    }
    setGameStartYear(startYear);
    setAvailableStocks(stocks);
    setGameState('playing');
    setCurrentMonth(0);
    setPocketCash(50000);
    setInvestments({ savings: { amount: 0, roi: 4 }, fixedDeposits: [], mutualFunds: { amount: 0, initialAmount: 0, roi: 12 }, stocks: [], gold: { grams: 0 }, ppf: { amount: 0, roi: 7.1 } });
    if (mode === 'solo') {
      setAvailableInvestments(['savings']);
      setScreen('game');
    }
    setMajorExpenses([]);
    setNetworthHistory([{ month: 0, networth: 50000 }]);
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
    if (fd) {
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
    navigator.clipboard.writeText(multiplayer.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-gray-600">Shares</label>
            <input type="number" min="1" value={currentStockAmount} onChange={(e) => setCurrentStockAmount(parseInt(e.target.value) || 1)} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Cost</label>
            <div className="text-sm font-bold text-gray-800 mt-1">{formatCurrency(currentPrice * currentStockAmount)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => buyStock(stock.id, currentStockAmount)} disabled={currentPrice * currentStockAmount > pocketCash} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded text-sm font-semibold">
            Buy
          </button>
          <button onClick={() => sellStock(stock.id, Math.min(stockAmount, myShares))} disabled={myShares < stockAmount} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded text-sm font-semibold">
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
            <button onClick={async () => { if (playerName.trim()) { const stocks = await selectRandomStocks(); const gameData = { stocks, gold: goldData, gameStartYear: selectRandomStartYear(stocks) }; multiplayer.createRoom(playerName, gameData); setScreen('lobby'); } }} disabled={!playerName.trim()} className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-4 rounded-lg text-lg font-semibold">Create</button>
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
              <h3 className="text-xl font-bold text-gray-800 mb-2">Savings</h3>
              <p className="text-sm text-gray-600 mb-4">4% p.a.</p>
              <div className="mb-4"><div className="text-sm text-gray-600">Balance</div><div className="text-2xl font-bold text-green-600">{formatCurrency(investments.savings.amount)}</div></div>
              <div className="flex gap-2">
                <button onClick={() => { if (pocketCash >= 5000) { setPocketCash(prev => prev - 5000); setInvestments(prev => ({ ...prev, savings: { ...prev.savings, amount: prev.savings.amount + 5000 } })); } }} disabled={pocketCash < 5000} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">+5K</button>
                <button onClick={() => { if (investments.savings.amount >= 5000) { setPocketCash(prev => prev + 5000); setInvestments(prev => ({ ...prev, savings: { ...prev.savings, amount: prev.savings.amount - 5000 } })); } }} disabled={investments.savings.amount < 5000} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">-5K</button>
              </div>
            </div>
          )}

          {availableInvestments.includes('mutualFunds') && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Mutual Funds</h3>
              <p className="text-sm text-gray-600 mb-4">upto 12% p.a.</p>
              <div className="mb-4"><div className="text-sm text-gray-600">Value</div><div className="text-2xl font-bold text-blue-600">{formatCurrency(investments.mutualFunds.amount)}</div></div>
              <div className="space-y-2">
                <button onClick={() => { if (pocketCash >= 10000) { setPocketCash(prev => prev - 10000); setInvestments(prev => ({ ...prev, mutualFunds: { ...prev.mutualFunds, amount: prev.mutualFunds.amount + 10000, initialAmount: prev.mutualFunds.initialAmount + 10000 } })); } }} disabled={pocketCash < 10000} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">+10K</button>
                {investments.mutualFunds.amount > 0 && <button onClick={() => sellMutualFunds(10000)} disabled={investments.mutualFunds.amount < 10000} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">-10K</button>}
              </div>
            </div>
          )}

          {availableInvestments.includes('fixedDeposits') && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">FDs</h3>
              <p className="text-sm text-gray-600 mb-4">Up to 7.5%</p>
              <div className="mb-4"><div className="text-sm text-gray-600">Active: {investments.fixedDeposits.length}/3</div>{investments.fixedDeposits.map((fd, idx) => (<div key={idx} className="mt-2 p-2 bg-blue-50 rounded text-sm"><div className="flex justify-between"><span>₹{fd.amount.toLocaleString()}</span><span className="text-green-600">+₹{Math.round(fd.profit).toLocaleString()}</span></div><button onClick={() => withdrawFD(idx)} className="mt-1 w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-xs">Withdraw</button></div>))}</div>
              <button onClick={() => { if (pocketCash >= 10000 && investments.fixedDeposits.length < 3) { setPocketCash(prev => prev - 10000); setInvestments(prev => ({ ...prev, fixedDeposits: [...prev.fixedDeposits, { amount: 10000, duration: 12, roi: 6.5, monthsElapsed: 0, profit: 0 }] })); } }} disabled={pocketCash < 10000 || investments.fixedDeposits.length >= 3} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">New FD (10K)</button>
            </div>
          )}

          {availableInvestments.includes('gold') && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Gold</h3>
              <p className="text-sm text-gray-600 mb-4">{formatCurrency(getCurrentGoldPrice(currentMonth))}/g</p>
              <div className="mb-4"><div className="text-sm text-gray-600">Holdings</div><div className="text-2xl font-bold text-yellow-600">{investments.gold.grams.toFixed(2)}g</div></div>
              <div className="space-y-2">
                <button onClick={() => { const goldPrice = getCurrentGoldPrice(currentMonth); if (pocketCash >= goldPrice) { setPocketCash(prev => prev - goldPrice); setInvestments(prev => ({ ...prev, gold: { ...prev.gold, grams: prev.gold.grams + 1 } })); } }} disabled={pocketCash < getCurrentGoldPrice(currentMonth)} className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">Buy 1g</button>
                {investments.gold.grams >= 1 && <button onClick={() => sellGold(1)} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm">Sell 1g</button>}
              </div>
            </div>
          )}

          {availableInvestments.includes('ppf') && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">PPF</h3>
              <p className="text-sm text-gray-600 mb-4">7.1% p.a.</p>
              <div className="mb-4"><div className="text-sm text-gray-600">Balance</div><div className="text-2xl font-bold text-indigo-600">{formatCurrency(investments.ppf.amount)}</div></div>
              <button onClick={() => { if (pocketCash >= 10000) { setPocketCash(prev => prev - 10000); setInvestments(prev => ({ ...prev, ppf: { ...prev.ppf, amount: prev.ppf.amount + 10000 } })); } }} disabled={pocketCash < 10000} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-2 rounded text-sm">+10K</button>
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