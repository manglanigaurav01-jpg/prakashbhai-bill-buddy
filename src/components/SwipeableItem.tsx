import React, { useRef, useState, TouchEvent } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface SwipeableItemProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number; // Minimum distance to trigger swipe (default: 100px)
  className?: string;
  disabled?: boolean;
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  onEdit,
  onDelete,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  className,
  disabled = false,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartTime = useRef<number>(0);

  const SWIPE_THRESHOLD = swipeThreshold;
  const MAX_SWIPE_DISTANCE = 200; // Maximum swipe distance

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setCurrentX(touch.clientX);
    setIsSwiping(true);
    touchStartTime.current = Date.now();
    triggerHaptic('light');
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isSwiping || disabled) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    
    // Limit swipe distance
    const limitedDelta = Math.max(
      -MAX_SWIPE_DISTANCE,
      Math.min(MAX_SWIPE_DISTANCE, deltaX)
    );
    
    setCurrentX(touch.clientX);
    setSwipeOffset(limitedDelta);
  };

  const handleTouchEnd = () => {
    if (!isSwiping || disabled) return;
    
    const deltaX = currentX - startX;
    const swipeDistance = Math.abs(deltaX);
    const swipeTime = Date.now() - touchStartTime.current;
    
    // Determine if swipe was intentional (fast swipe or long distance)
    const isFastSwipe = swipeTime < 300 && swipeDistance > 50;
    const isLongSwipe = swipeDistance > SWIPE_THRESHOLD;
    
    if (isFastSwipe || isLongSwipe) {
      if (deltaX < -SWIPE_THRESHOLD) {
        // Swipe left - show delete/edit actions
        triggerHaptic('medium');
        if (onSwipeLeft) {
          onSwipeLeft();
        } else if (onDelete) {
          onDelete();
        }
      } else if (deltaX > SWIPE_THRESHOLD) {
        // Swipe right
        triggerHaptic('medium');
        if (onSwipeRight) {
          onSwipeRight();
        } else if (onEdit) {
          onEdit();
        }
      }
    }
    
    // Reset swipe state
    setIsSwiping(false);
    setSwipeOffset(0);
    setStartX(0);
    setCurrentX(0);
  };

  const handleTouchCancel = () => {
    setIsSwiping(false);
    setSwipeOffset(0);
    setStartX(0);
    setCurrentX(0);
  };

  // Show action buttons when swiped left
  const showActions = swipeOffset < -50;
  const actionWidth = 80;

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Action buttons (shown when swiped left) */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full flex items-center gap-2 pr-4 transition-transform duration-200 z-10",
          showActions ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width: `${actionWidth * 2}px` }}
      >
        {onEdit && (
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              onEdit();
              setSwipeOffset(0);
            }}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('medium');
              onDelete();
              setSwipeOffset(0);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main content */}
      <div
        className={cn(
          "relative transition-transform duration-200",
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {children}
      </div>
    </div>
  );
};

