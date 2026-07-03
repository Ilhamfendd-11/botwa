const axios = require("axios")

const {
  bacotPersonality,
  normalPersonality
} = require("../utils/personality")

const {
  loadMemory,
  saveMemory
} = require("../utils/memory")

const config =
require("../config")

async function aiCommand(
  message,
  client
) {

  const text =
  message.body.trim()

  const lower =
  text.toLowerCase()

  // Cek mode: bacot atau normal
  const isBacot = lower.includes(config.BOT_NAME_BACOT)
  const isNormal = lower.includes(config.BOT_NAME)

  // Kalau tidak ada trigger sama sekali, skip
  if (!isBacot && !isNormal) return

  // Pilih personality sesuai mode
  const personality = isBacot
    ? bacotPersonality
    : normalPersonality

  // Pilih trigger yang aktif (prioritaskan !bacot jika keduanya ada)
  const activeTrigger = isBacot
    ? config.BOT_NAME_BACOT
    : config.BOT_NAME

  const chat =
  await message.getChat()

  const contact =
  await message.getContact()

  const username =
  contact.pushname ||
  "orang"

  await chat.sendStateTyping()

  // ======================
  // CLEAN MESSAGE
  // ======================

  const cleanText =
  text
  .replace(
    new RegExp(activeTrigger, "gi"),
    ""
  )
  .trim()

  // Gunakan chatId + mode sebagai key memori yang terpisah
  const chatId = `${message.from}:${isBacot ? "bacot" : "normal"}`

  // Reset feature
  if (cleanText.toLowerCase() === "reset") {
    let memory = loadMemory()
    delete memory[chatId]
    saveMemory(memory)

    const resetMsg = isBacot
      ? "memori mode bacot dihapus anjg 🧼"
      : "memori percakapan normal sudah direset ✅"

    await message.reply(resetMsg)
    return
  }

  // ======================
  // MEMORY
  // ======================

  let memory = loadMemory()
  const history = memory[chatId] || []

  // Map history to Gemini format (user -> user, assistant -> model)
  const geminiHistory = history.map(item => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }]
  }))

  // ======================
  // AI (GEMINI 2.5 FLASH)
  // ======================

  try {

    const response = await axios.post(
      `${config.API_BASE_URL}/models/${config.AI_MODEL}:generateContent?key=${config.API_KEY}`,
      {
        contents: [
          ...geminiHistory,
          {
            role: "user",
            parts: [{ text: `[${username}]: ${cleanText}` }]
          }
        ],
        systemInstruction: {
          parts: [{ text: personality }]
        },
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: isBacot ? 1.0 : 0.7
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    )

    let reply = response.data.candidates[0].content.parts[0].text

    // bersihin respon aneh
    reply = reply
    .replace(/sebagai ai/gi, "")
    .replace(/aku ai/gi, "")
    .replace(/chat sebelumnya/gi, "")
    .replace(/pesan terbaru/gi, "")
    .trim()

    // Simpan ke memori setelah respon sukses didapatkan
    if (!memory[chatId]) {
      memory[chatId] = []
    }

    memory[chatId].push(
      {
        role: "user",
        content: `[${username}]: ${cleanText}`
      },
      {
        role: "assistant",
        content: reply
      }
    )

    // Batasi maksimum 10 pesan (5 percakapan dua arah)
    memory[chatId] = memory[chatId].slice(-10)
    saveMemory(memory)

    await message.reply(reply)

  } catch (err) {

    console.error("Gemini API Error:", err.response?.data || err.message)

    const errMsg = isBacot
      ? "otak gw ngefreeze 💀"
      : "Waduh, ada error nih. Coba lagi ya 😅"

    await message.reply(errMsg)

  }

}

module.exports = aiCommand