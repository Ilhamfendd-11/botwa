const { callVisionAI } = require("../utils/visionService")
const { performOCR } = require("../utils/ocr")

// 15MB size limit
const FILE_SIZE_LIMIT = 15 * 1024 * 1024

async function visionCommand(message, client) {
  const text = message.body.trim()
  const lowerText = text.toLowerCase()

  // 1. Detect command type
  let cmd = ""
  let query = ""

  if (text.startsWith("!lihat")) {
    cmd = "!lihat"
    query = text.slice(6).trim()
  } else if (text.startsWith("!translate")) {
    cmd = "!translate"
    query = text.slice(10).trim()
  } else if (text.startsWith("!ocr")) {
    cmd = "!ocr"
    query = text.slice(4).trim()
  } else if (text.startsWith("!jelaskan")) {
    cmd = "!jelaskan"
    query = text.slice(9).trim()
  } else if (text.startsWith("!tabel")) {
    cmd = "!tabel"
    query = text.slice(6).trim()
  }

  // 2. Retrieve media (check direct message first, then quoted message)
  let media = null
  let isMediaInQuoted = false

  const { downloadMediaWithRetry } = require("../utils/downloadHelper")
  try {
    if (message.hasMedia) {
      media = await downloadMediaWithRetry(message)
    } else if (message.hasQuotedMsg) {
      const quotedMsg = await message.getQuotedMessage()
      if (quotedMsg.hasMedia) {
        media = await downloadMediaWithRetry(quotedMsg)
        isMediaInQuoted = true
      }
    }
  } catch (downloadErr) {
    console.error("[Vision Command] Error downloading media:", downloadErr)
    return message.reply("otak gw ngefreeze 😭")
  }

  // If no media found, prompt user
  if (!media || !media.data) {
    const examples = {
      "!lihat": "reply gambar pake !lihat [pertanyaan]",
      "!translate": "reply gambar pake !translate",
      "!ocr": "reply gambar pake !ocr",
      "!jelaskan": "reply gambar pake !jelaskan",
      "!tabel": "reply gambar pake !tabel"
    }
    return message.reply(`contoh:\n${examples[cmd] || "reply gambar dulu bang 😭"}`)
  }

  // 3. Size and format validations
  const fileSize = Math.floor((media.data.length * 3) / 4)
  if (fileSize > FILE_SIZE_LIMIT) {
    return message.reply("file kegedean bang 😭")
  }

  const mime = media.mimetype ? media.mimetype.toLowerCase() : ""
  if (!mime.startsWith("image/")) {
    return message.reply("format ini belum bisa gw baca")
  }

  // 4. Determine Bacot Mode (-b, !b, bacot)
  const isBacot = lowerText.includes("-b") || 
                  lowerText.includes("bacot") || 
                  lowerText.includes("!b") || 
                  query.toLowerCase().includes("-b") || 
                  query.toLowerCase().includes("bacot")

  // Clean the query of bacot flags to avoid sending it to the model
  const cleanQuery = query
    .replace(/-b\b/gi, "")
    .replace(/\bbacot\b/gi, "")
    .replace(/!b\b/gi, "")
    .trim()

  const chat = await message.getChat()
  await chat.sendStateTyping()

  try {
    let reply = ""

    switch (cmd) {
      case "!ocr": {
        reply = await performOCR(media.data, media.mimetype)
        if (!reply) {
          reply = isBacot 
            ? "ga ada teksnya anjg, matamu picek kah? 😭" 
            : "Gak nemu tulisan apa-apa di gambar ini bang 😅"
        }
        break
      }

      case "!translate": {
        const prompt = "Temukan semua teks dalam gambar ini dan terjemahkan ke bahasa Indonesia secara natural. Tampilkan hasil terjemahannya saja tanpa menambahkan penjelasan tambahan atau teks pembuka/penutup."
        reply = await callVisionAI(media.data, media.mimetype, prompt, isBacot)
        break
      }

      case "!jelaskan": {
        const prompt = cleanQuery || "Jelaskan isi gambar ini secara detail dan menyeluruh. Deskripsikan objek, suasana, teks, warna, serta detail-detail kecil yang penting."
        reply = await callVisionAI(media.data, media.mimetype, prompt, isBacot)
        break
      }

      case "!tabel": {
        const prompt = "Temukan data tabel di gambar ini dan konversikan menjadi format tabel Markdown yang rapi. Jangan tambahkan penjelasan lain, cukup keluarkan tabel markdown saja."
        reply = await callVisionAI(media.data, media.mimetype, prompt, isBacot)
        break
      }

      case "!lihat":
      default: {
        const prompt = cleanQuery || "Deskripsikan gambar ini secara ringkas, sebutkan objek utama, teks yang terlihat, dan suasana di dalamnya."
        reply = await callVisionAI(media.data, media.mimetype, prompt, isBacot)
        break
      }
    }

    if (!reply) {
      throw new Error("EMPTY_REPLY")
    }

    await message.reply(reply)

  } catch (err) {
    console.error("[Vision Command] API Error:", err.message)
    return message.reply("otak gw ngefreeze 😭")
  }
}

module.exports = visionCommand
