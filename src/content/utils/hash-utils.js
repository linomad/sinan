/**
 * Common utility functions for Chat Navigator.
 */
window.ChatNavUtils = {
  /**
   * Generates a simple hash ID from a string.
   * Useful for stable IDs when DOM lacks unique attributes.
   * @param {string} str - The input string (e.g., message text).
   * @returns {string} - A stable hash string (e.g., "id12345").
   */
  hashCode: function(str) {
    let hash = 0;
    if (str.length === 0) return "id0";
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return "id" + Math.abs(hash);
  }
};
