/**
 * MathVerse Frontend Client
 * Handles real-time Socket.IO connection and status indicators
 */

(() => {
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');

  // Update connection status badge in real-time
  function setConnectionStatus(isConnected) {
    if (!statusBadge || !statusText) return;

    if (isConnected) {
      statusBadge.classList.remove('status-disconnected');
      statusBadge.classList.add('status-connected');
      statusText.textContent = 'Connected';
    } else {
      statusBadge.classList.remove('status-connected');
      statusBadge.classList.add('status-disconnected');
      statusText.textContent = 'Disconnected';
    }
  }

  // Initialize Socket.IO connection
  const socket = io();

  socket.on('connect', () => {
    console.log(`[MathVerse] Connected to server. Socket ID: ${socket.id}`);
    setConnectionStatus(true);
  });

  socket.on('disconnect', (reason) => {
    console.warn(`[MathVerse] Disconnected from server: ${reason}`);
    setConnectionStatus(false);
  });

  socket.on('connect_error', (err) => {
    console.error(`[MathVerse] Connection error: ${err.message}`);
    setConnectionStatus(false);
  });
})();
