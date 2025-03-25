// Helper function to format timestamps in a human-readable way
export function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  
  // Check if the message is from today
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if the message is from yesterday
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Check if the message is from this week
  const daysSinceMessage = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceMessage < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[messageDate.getDay()];
  }
  
  // If the message is older than a week
  return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
