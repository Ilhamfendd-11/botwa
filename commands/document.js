const { extractTextFromMedia } = require("../utils/pdfReader")
const { callTextAI } = require("../utils/visionService")

async function documentCommand(message, client) {
  const text = message.body.trim()
  const lowerText = text.toLowerCase()

  // 1. Detect command type
  let cmd = ""
  let query = ""

  if (text.startsWith("!ringkas")) {
    cmd = "!ringkas"
    query = text.slice(8).trim()
  } else if (text.startsWith("!tanya")) {
    cmd = "!tanya"
    query = text.slice(6).trim()
  }

  // 2. Retrieve media (check direct message first, then quoted message)
  let media = null
  let isMediaInQuoted = false

  try {
    if (message.hasMedia) {
      media = await message.downloadMedia()
    } else if (message.hasQuotedMsg) {
      const quotedMsg = await message.getQuotedMessage()
      if (quotedMsg.hasMedia) {
        media = await quotedMsg.downloadMedia()
        isMediaInQuoted = true
      }
    }
  } catch (downloadErr) {
    console.error("[Document Command] Error downloading media:", downloadErr)
    return message.reply("otak gw ngefreeze 😭")
  }

  // If no media found, prompt user
  if (!media || !media.data) {
    const examples = {
      "!ringkas": "reply dokumen pake !ringkas",
      "!tanya": "reply dokumen pake !tanya [pertanyaan]"
    }
    return message.reply(`contoh:\n${examples[cmd] || "reply dokumen dulu bang 😭"}`)
  }

  // Determine Bacot Mode (-b, !b, bacot)
  const isBacot = lowerText.includes("-b") || 
                  lowerText.includes("bacot") || 
                  lowerText.includes("!b") || 
                  query.toLowerCase().includes("-b") || 
                  query.toLowerCase().includes("bacot")

  // Clean query of bacot flags
  const cleanQuery = query
    .replace(/-b\b/gi, "")
    .replace(/\bbacot\b/gi, "")
    .replace(/!b\b/gi, "")
    .trim()

  if (cmd === "!tanya" && !cleanQuery) {
    return message.reply("contoh:\n!tanya Apa isi bab metode?")
  }

  const chat = await message.getChat()
  await chat.sendStateTyping()

  try {
    // 3. Extract text using pdfReader
    const extractedText = await extractTextFromMedia(media)

    // 4. Generate AI response
    let aiPrompt = ""
    if (cmd === "!ringkas") {
      aiPrompt = "Buatlah ringkasan yang komprehensif, padat, dan jelas dari isi dokumen yang diberikan. Ambil poin-poin penting secara terstruktur menggunakan bullet points."
    } else {
      // !tanya
      aiPrompt = `Jawablah pertanyaan berikut secara singkat, padat, dan akurat HANYA berdasarkan isi dokumen yang disediakan. JANGAN mengarang atau menggunakan pengetahuan luar. Jika informasi tidak ada di dalam dokumen atau Anda tidak yakin, katakan secara jujur bahwa informasi tersebut tidak ditemukan.\n\nPertanyaan: ${cleanQuery}`
    }

    const reply = await callTextAI(extractedText, aiPrompt, isBacot)
    if (!reply) {
      throw new Error("EMPTY_REPLY")
    }

    await message.reply(reply)

  } catch (err) {
    console.error("[Document Command] Processing Error:", err.message)

    if (err.message === "FILE_TOO_LARGE") {
      return message.reply("file kegedean bang 😭")
    }
    if (err.message === "UNSUPPORTED_FORMAT") {
      return message.reply("format ini belum bisa gw baca")
    }
    if (err.message === "EMPTY_CONTENT") {
      return message.reply(
        isBacot 
          ? "dokumen kosong melompong gini mau dibaca apa anjg 😭" 
          : "Waduh, isi dokumennya kosong atau ga terbaca bang 😅"
      )
    }

    return message.reply("otak gw ngefreeze 😭")
  }
}

module.exports = documentCommand
