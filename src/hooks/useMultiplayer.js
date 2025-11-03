import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
console.log('🔗 SOCKET_URL:', SOCKET_URL);

export const useMultiplayer = () => {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameStatus, setGameStatus] = useState('disconnected');
  const [currentMonth, setCurrentMonth] = useState(0);
  const [currentYear, setCurrentYear] = useState(0);
  const [currentPrices, setCurrentPrices] = useState({});
  const [randomAssets, setRandomAssets] = useState([]);
  const [error, setError] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [availableInvestments, setAvailableInvestments] = useState(['savings']);
  const [currentEvent, setCurrentEvent] = useState(null);
  const socketRef = useRef(null);
  const [availableMutualFunds, setAvailableMutualFunds] = useState([]);
  const [availableIndexFunds, setAvailableIndexFunds] = useState([]);
  const [availableCommodities, setAvailableCommodities] = useState([]);
  const [availableREITs, setAvailableREITs] = useState([]);
  const [availableCrypto, setAvailableCrypto] = useState([]);
  const [availableForex, setAvailableForex] = useState([]);
  const [gameStartYear, setGameStartYear] = useState(null);
  const [gameEndYear, setGameEndYear] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to server:', newSocket.id);
      setError(null);
      setMyPlayerId(newSocket.id);
      setGameStatus('connected');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setGameStatus('disconnected');
    });

    newSocket.on('error', (data) => {
      console.error('Server error:', data.message);
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    });

    newSocket.on('room-created', (data) => {
      console.log('🏠 Room created:', data.roomCode);
      setRoomCode(data.roomCode);
      setGameStatus('waiting');
      setPlayers(Object.values(data.room.players));
      
      if (data.room.gameStartYear !== undefined) {
        setGameStartYear(data.room.gameStartYear);
        console.log('📅 Game start year set:', data.room.gameStartYear);
      }
      
      if (data.room.gameData?.randomAssets) {
        setRandomAssets(data.room.gameData.randomAssets);
      }

      if (data.room.gameData?.stocks) {
        setAvailableStocks(data.room.gameData.stocks);
        console.log('📈 Stocks loaded:', data.room.gameData.stocks.length);
      }
      if (data.room.gameEndYear !== undefined) {
        setGameEndYear(data.room.gameEndYear);
      }
      if (data.room.gameData?.mutualFunds) {
        setAvailableMutualFunds(data.room.gameData.mutualFunds);
      }
      if (data.room.availableInvestments) {
        setAvailableInvestments(data.room.availableInvestments);
      }
    });

    newSocket.on('room-joined', (data) => {
      console.log('🚪 Joined room:', data.roomCode);
      setRoomCode(data.roomCode);
      setGameStatus('waiting');
      setPlayers(Object.values(data.room.players));

      if (data.room.gameStartYear !== undefined) {
        setGameStartYear(data.room.gameStartYear);
        console.log('📅 Game start year set:', data.room.gameStartYear);
      }
      if (data.room.gameEndYear !== undefined) {
        setGameEndYear(data.room.gameEndYear);
      }

      // Load all asset types from server
      if (data.room.gameData?.stocks) {
        setAvailableStocks(data.room.gameData.stocks);
        console.log('📈 Loaded stocks:', data.room.gameData.stocks.length);
      }

      if (data.room.gameData?.mutualFunds) {
        setAvailableMutualFunds(data.room.gameData.mutualFunds);
        console.log('📊 Loaded mutual funds:', data.room.gameData.mutualFunds.length);
      }

      if (data.room.gameData?.indexFunds) {
        setAvailableIndexFunds(data.room.gameData.indexFunds);
        console.log('📈 Loaded index funds:', data.room.gameData.indexFunds.length);
      }

      if (data.room.gameData?.commodities) {
        setAvailableCommodities(data.room.gameData.commodities);
        console.log('🥇 Loaded commodities:', data.room.gameData.commodities.length);
      }

      if (data.room.gameData?.crypto) {
        setAvailableCrypto(data.room.gameData.crypto);
        console.log('₿ Loaded crypto:', data.room.gameData.crypto.length);
      }

      if (data.room.gameData?.reit) {
        setAvailableREITs(data.room.gameData.reit);
        console.log('🏢 Loaded REITs:', data.room.gameData.reit.length);
      }

      if (data.room.gameData?.forex) {
        setAvailableForex(data.room.gameData.forex);
        console.log('💱 Loaded forex:', data.room.gameData.forex.length);
      }

      if (data.room.availableInvestments) {
        setAvailableInvestments(data.room.availableInvestments);
      }
    });

    newSocket.on('player-joined', (data) => {
      console.log('👤 Player joined:', data.player.name);
      setPlayers(prev => {
        const existing = prev.find(p => p.id === data.player.id);
        if (existing) return prev;
        return [...prev, data.player];
      });
    });

    newSocket.on('player-left', (data) => {
      console.log('👋 Player left:', data.playerId);
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    newSocket.on('new-host', (data) => {
      console.log('👑 New host:', data.hostId);
      setPlayers(prev => prev.map(p => ({
        ...p,
        isHost: p.id === data.hostId
      })));
    });

    newSocket.on('game-started', (data) => {
      console.log('🎮 Game started!');
      setGameStatus('playing');
      setCurrentPrices(data.currentPrices);
      setCurrentMonth(0);
      setCurrentYear(0);

      if (data.gameStartYear !== undefined) {
        setGameStartYear(data.gameStartYear);
        console.log('📅 Game start year:', data.gameStartYear);
      }
      if (data.gameEndYear !== undefined) {
        setGameEndYear(data.gameEndYear);
      }

      if (data.availableInvestments) {
        console.log('💼 Investments on start:', data.availableInvestments);
        setAvailableInvestments(data.availableInvestments);
      }

      // Load all asset types
      if (data.mutualFunds) {
        setAvailableMutualFunds(data.mutualFunds);
      }

      if (data.indexFunds) {
        setAvailableIndexFunds(data.indexFunds);
      }

      if (data.commodities) {
        setAvailableCommodities(data.commodities);
      }

      if (data.crypto) {
        setAvailableCrypto(data.crypto);
      }

      if (data.reit) {
        setAvailableREITs(data.reit);
      }

      if (data.forex) {
        setAvailableForex(data.forex);
      }

      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    });

    newSocket.on('month-update', (data) => {
      console.log(`📅 Month ${data.currentMonth} (Year ${data.currentYear})`);
      
      setCurrentMonth(data.currentMonth);
      setCurrentYear(data.currentYear);
      setCurrentPrices(data.currentPrices);
      
      if (data.gameStartYear !== undefined) {
        setGameStartYear(data.gameStartYear);
      }
      if (data.gameEndYear !== undefined) {
        setGameEndYear(data.gameEndYear);
      }
      
      if (data.availableInvestments) {
        setAvailableInvestments(data.availableInvestments);
      }
      
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    });

    newSocket.on('leaderboard-update', (data) => {
      console.log('🏆 Leaderboard updated');
      setLeaderboard(data.leaderboard);
    });

    newSocket.on('year-event', (data) => {
      console.log('📰 Year event:', data.event.message);
      
      setCurrentEvent(data.event);
      
      if (data.availableInvestments) {
        console.log('🔓 Unlocked investments:', data.availableInvestments);
        setAvailableInvestments(data.availableInvestments);
      }
    });

    newSocket.on('game-ended', (data) => {
      console.log('🏁 Game ended!');
      setGameStatus('ended');
      setLeaderboard(data.leaderboard);
    });

    newSocket.on('transaction-success', (data) => {
      console.log('✅ Transaction successful:', data.type, data.stockId);
      console.log('💰 Updated portfolio:', data.portfolio);
      console.log('💵 Updated pocket cash:', data.pocketCash);
      // Emit event for Game component to update state
      window.dispatchEvent(new CustomEvent('stock-transaction', { detail: data }));
    });

    newSocket.on('investment-success', (data) => {
      console.log('✅ Investment successful:', data.type);
      console.log('💰 Asset details:', data);
      // Emit event for Game component to update state
      window.dispatchEvent(new CustomEvent('asset-transaction', { detail: data }));
    });

    return () => {
      console.log('🔌 Closing socket connection');
      newSocket.close();
    };
  }, []);

  const createRoom = (playerName, gameData) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }
    console.log('Creating room with', gameData.stocks?.length, 'stocks');
    socket.emit('create-room', { playerName, gameData });
  };

  const joinRoom = (roomCode, playerName) => {
    if (!socket || !roomCode.trim()) {
      console.error('Invalid socket or room code');
      return;
    }
    console.log('Joining room:', roomCode);
    socket.emit('join-room', { roomCode: roomCode.toUpperCase().trim(), playerName });
  };

  const startGame = () => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }
    console.log('Starting game...');
    socket.emit('start-game');
  };

  const buyStock = (stockId, shares) => {
    if (!socket) return;
    console.log(`Buying ${shares} shares of ${stockId}`);
    socket.emit('buy-stock', { stockId, shares });
  };

  const sellStock = (stockId, shares) => {
    if (!socket) return;
    console.log(`Selling ${shares} shares of ${stockId}`);
    socket.emit('sell-stock', { stockId, shares });
  };

  const investSavings = (amount) => {
    if (!socket) return;
    socket.emit('invest-savings', { amount });
  };

  const buyGold = (grams) => {
    if (!socket) return;
    socket.emit('buy-gold', { grams });
  };

  const getRoomInfo = () => {
    if (!socket) return;
    socket.emit('get-room-info');
  };

  const buyMutualFund = (mfId, amount) => {
    if (!socket) return;
    socket.emit('buy-mutual-fund', { mfId, amount });
  };

  const sellMutualFund = (mfId, units) => {
    if (!socket) return;
    socket.emit('sell-mutual-fund', { mfId, units });
  };

  return {
    socket,
    roomCode,
    players,
    leaderboard,
    gameStatus,
    currentMonth,
    currentYear,
    currentPrices,
    availableStocks,
    availableInvestments,
    availableMutualFunds,
    availableIndexFunds,
    availableCommodities,
    availableREITs,
    availableCrypto,
    availableForex,
    gameStartYear,
    gameEndYear,
    buyMutualFund,
    sellMutualFund,
    error,
    myPlayerId,
    currentEvent,
    setCurrentEvent,
    createRoom,
    joinRoom,
    startGame,
    buyStock,
    sellStock,
    investSavings,
    buyGold,
    getRoomInfo
  };
};