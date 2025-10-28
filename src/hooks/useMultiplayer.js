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
  const [error, setError] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [availableInvestments, setAvailableInvestments] = useState(['savings']);
  const [currentEvent, setCurrentEvent] = useState(null); // ✅ NEW: Track year events from server
  const socketRef = useRef(null);

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
      
      if (data.room.gameData?.stocks) {
        setAvailableStocks(data.room.gameData.stocks);
        console.log('📈 Stocks loaded:', data.room.gameData.stocks.length);
      }
      
      // ✅ NEW: Set initial investments
      if (data.room.availableInvestments) {
        setAvailableInvestments(data.room.availableInvestments);
      }
    });

    newSocket.on('room-joined', (data) => {
      console.log('🚪 Joined room:', data.roomCode);
      setRoomCode(data.roomCode);
      setGameStatus('waiting');
      setPlayers(Object.values(data.room.players));
      
      if (data.room.gameData?.stocks) {
        setAvailableStocks(data.room.gameData.stocks);
        console.log('📈 Loaded stocks:', data.room.gameData.stocks.length);
      }
      
      // ✅ NEW: Load investments when joining
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
      
      // ✅ CRITICAL: Load investments on game start
      if (data.availableInvestments) {
        console.log('💼 Investments on start:', data.availableInvestments);
        setAvailableInvestments(data.availableInvestments);
      }
      
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    });

    newSocket.on('month-update', (data) => {
      console.log(`📅 Month ${data.currentMonth} (Year ${data.currentYear})`);
      
      // ✅ SYNC: Update month from server
      setCurrentMonth(data.currentMonth);
      setCurrentYear(data.currentYear);
      setCurrentPrices(data.currentPrices);
      
      // ✅ SYNC: Update investments if server sends them
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
      
      setCurrentEvent(data.event); // ✅ NEW: Set the event for Game.jsx to handle (popup + cash adjustments)
      
      // ✅ CRITICAL: Update investments when unlocked
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
    });

    newSocket.on('investment-success', (data) => {
      console.log('✅ Investment successful:', data.type);
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
    error,
    myPlayerId,
    currentEvent, // ✅ NEW
    setCurrentEvent, // ✅ NEW: To clear after modal close
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