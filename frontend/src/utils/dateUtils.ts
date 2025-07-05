// Date utility functions for formatting and manipulation

export const formatTime = (date: Date | string): string => {
  const now = new Date();
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (isNaN(messageDate.getTime())) {
    return 'Invalid date';
  }
  
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  // Just now (< 1 minute)
  if (diffInMinutes < 1) {
    return 'Just now';
  }
  
  // Minutes ago (< 1 hour)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  // Hours ago (< 24 hours)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  // Days ago (< 7 days)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  // Older dates - show actual date
  return messageDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

export const formatFullDate = (date: Date | string): string => {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(messageDate.getTime())) {
    return 'Invalid date';
  }
  
  return messageDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const isToday = (date: Date | string): boolean => {
  const today = new Date();
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  
  return (
    today.getDate() === compareDate.getDate() &&
    today.getMonth() === compareDate.getMonth() &&
    today.getFullYear() === compareDate.getFullYear()
  );
};

export const isYesterday = (date: Date | string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  
  return (
    yesterday.getDate() === compareDate.getDate() &&
    yesterday.getMonth() === compareDate.getMonth() &&
    yesterday.getFullYear() === compareDate.getFullYear()
  );
};