/**
 * formatter.js
 * Utilitas untuk mengubah teks Markdown dari Gemini API
 * menjadi format yang kompatibel dengan WhatsApp,
 * lalu memecah teks panjang menjadi beberapa pesan.
 */

const WA_MAX_LENGTH = 3500 // batas aman per pesan WA (limit sebenarnya 65536)

/**
 * Konversi Markdown → format WhatsApp
 * WA mendukung: *bold*, _italic_, ~coret~, ```kode```
 */
function markdownToWhatsApp(text) {
  if (!text) return text

  let result = text

  // === HEADING (#, ##, ###) → *Teks*
  result = result.replace(/^#{1,6}\s+(.+)$/gm, '*$1*')

  // === BOLD: **teks** atau __teks__ → *teks*
  result = result.replace(/\*\*(.+?)\*\*/gs, '*$1*')
  result = result.replace(/__(.+?)__/gs, '*$1*')

  // === ITALIC: *teks* → _teks_ (HANYA jika bukan bold, sudah dikonversi di atas)
  // Hati-hati: di Markdown *teks* = italic, tapi di WA *teks* = bold
  // Jadi kita ubah italic Markdown → _ di WA
  // Tapi setelah **bold** diubah ke *bold*, kita tidak perlu khawatir lagi
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/gs, '_$1_')

  // === ITALIC: _teks_ (biarkan, WA sudah paham _italic_)
  // Tidak perlu diubah

  // === STRIKETHROUGH: ~~teks~~ → ~teks~
  result = result.replace(/~~(.+?)~~/gs, '~$1~')

  // === CODE BLOCK: ```lang\nkode\n``` → ```kode```
  result = result.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, '```$1```')

  // === INLINE CODE: `kode` → biarkan (WA support backtick tunggal juga)

  // === LINK: [teks](url) → teks (url) — WA tidak support markdown link
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')

  // === HORIZONTAL RULE: --- atau *** → baris kosong
  result = result.replace(/^[-*]{3,}$/gm, '')

  // === BULLET: * item → - item (normalize)
  result = result.replace(/^\* (.+)$/gm, '- $1')

  // === Bersihkan spasi berlebih di akhir baris
  result = result.replace(/ +$/gm, '')

  // === Maksimal 2 baris kosong berturut-turut
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}

/**
 * Pecah teks panjang menjadi array chunk berdasarkan batas karakter,
 * dengan pemecahan di batas paragraf/baris agar tidak terpotong tengah kalimat.
 */
function splitMessage(text, maxLen = WA_MAX_LENGTH) {
  if (!text || text.length <= maxLen) return [text]

  const chunks = []
  let remaining = text

  while (remaining.length > maxLen) {
    let cutAt = maxLen

    // Coba potong di paragraf (baris kosong)
    const paraBreak = remaining.lastIndexOf('\n\n', maxLen)
    if (paraBreak > maxLen * 0.5) {
      cutAt = paraBreak
    } else {
      // Coba potong di newline biasa
      const lineBreak = remaining.lastIndexOf('\n', maxLen)
      if (lineBreak > maxLen * 0.5) {
        cutAt = lineBreak
      } else {
        // Coba potong di spasi (jangan potong tengah kata)
        const spaceBreak = remaining.lastIndexOf(' ', maxLen)
        if (spaceBreak > maxLen * 0.5) {
          cutAt = spaceBreak
        }
        // Kalau tidak ada, potong paksa di maxLen
      }
    }

    chunks.push(remaining.slice(0, cutAt).trim())
    remaining = remaining.slice(cutAt).trim()
  }

  if (remaining.length > 0) {
    chunks.push(remaining)
  }

  return chunks
}

/**
 * Format teks dari AI lalu kirimkan ke chat WhatsApp.
 * Otomatis split jika terlalu panjang.
 *
 * @param {import('whatsapp-web.js').Message} message - Objek pesan WA
 * @param {string} text - Teks dari AI (format Markdown)
 * @param {Object} [opts] - Opsi tambahan untuk message.reply()
 */
async function sendFormattedReply(message, text, opts = {}) {
  const formatted = markdownToWhatsApp(text)
  const chunks = splitMessage(formatted)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    if (!chunk) continue

    if (i === 0) {
      // Pesan pertama sebagai reply (quote)
      await message.reply(chunk, undefined, opts)
    } else {
      // Pesan selanjutnya dikirim ke chat yang sama tanpa quote
      await message.client.sendMessage(message.from, chunk)
    }
  }
}

module.exports = { markdownToWhatsApp, splitMessage, sendFormattedReply }
