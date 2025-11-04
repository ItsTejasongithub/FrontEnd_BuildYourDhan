import React, { useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Unlock } from 'lucide-react';

/**
 * Toast notification component for non-intrusive event notifications
 * Replaces full-screen modals
 */
const ToastNotification = ({ event, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration && event) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [event, duration, onClose]);

  if (!event) return null;

  const getEventStyles = () => {
    switch (event.type) {
      case 'gain':
        return {
          bg: 'bg-green-50 border-green-500',
          icon: <TrendingUp className="w-6 h-6 text-green-600" />,
          emoji: '🎉',
          titleColor: 'text-green-800'
        };
      case 'loss':
        return {
          bg: 'bg-red-50 border-red-500',
          icon: <TrendingDown className="w-6 h-6 text-red-600" />,
          emoji: '😰',
          titleColor: 'text-red-800'
        };
      case 'unlock':
        return {
          bg: 'bg-blue-50 border-blue-500',
          icon: <Unlock className="w-6 h-6 text-blue-600" />,
          emoji: '🔓',
          titleColor: 'text-blue-800'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-500',
          icon: null,
          emoji: 'ℹ️',
          titleColor: 'text-gray-800'
        };
    }
  };

  const styles = getEventStyles();

  const getTitle = () => {
    switch (event.type) {
      case 'gain': return 'Good News!';
      case 'loss': return 'Expense';
      case 'unlock': return 'Unlocked!';
      default: return 'Notification';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideIn">
      <div className={`${styles.bg} border-l-4 rounded-lg shadow-2xl p-4 max-w-md min-w-80 transform transition-all`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="text-3xl">{styles.emoji}</div>
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={`font-bold text-lg ${styles.titleColor}`}>
                {getTitle()}
              </h4>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-700 text-sm mb-2">{event.message}</p>

            {event.amount && (
              <div className={`text-2xl font-bold ${
                event.amount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {event.amount > 0 ? '+' : '-'}
                {Math.abs(event.amount).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0
                })}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar for auto-close */}
        {duration && (
          <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-400 animate-shrink"
              style={{ animationDuration: `${duration}ms` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ToastNotification;
