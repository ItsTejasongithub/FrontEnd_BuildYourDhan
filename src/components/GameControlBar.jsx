/**
 * Fixed bottom control bar - Simple progress indicator only
 * No play/pause controls - game runs automatically (kid-friendly)
 */
const GameControlBar = ({
  currentMonth
}) => {
  const progress = (currentMonth / 240) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-orange-600 shadow-2xl z-40">
      {/* Progress Bar Only */}
      <div className="h-2 bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-green-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-center py-1 text-xs text-gray-600">
        Month {currentMonth} of 240
      </div>
    </div>
  );
};

export default GameControlBar;
