/**
 * Helper to download message media with delay and retries to prevent race conditions
 * in the WhatsApp Web browser database sync.
 * @param {object} message - The WhatsApp message object.
 * @param {number} retries - Number of retry attempts.
 * @param {number} delayMs - Delay in milliseconds between attempts.
 * @returns {Promise<object>} The downloaded media.
 */
async function downloadMediaWithRetry(message, retries = 3, delayMs = 2000) {
  let lastError = null

  for (let i = 0; i < retries; i++) {
    try {
      // Tunggu beberapa saat agar database browser mensinkronkan media
      await new Promise((resolve) => setTimeout(resolve, delayMs))

      const media = await message.downloadMedia()
      if (media && media.data) {
        return media
      }
    } catch (err) {
      lastError = err
      const errMsg = err.message || String(err)
      console.warn(`[Download Helper] Percobaan ${i + 1} gagal: ${errMsg}`)
    }
  }

  throw lastError || new Error("DOWNLOAD_FAILED")
}

module.exports = {
  downloadMediaWithRetry
}
