const axios = require("axios")

const personality =
require("../utils/personality")

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

  // trigger
  if (
    !lower.includes(
      config.BOT_NAME
    )
  ) return

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
    config.BOT_NAME,
    ""
  )
  .trim()

  const chatId = message.from

  // Reset feature
  if (cleanText.toLowerCase() === "reset") {
    let memory = loadMemory()
    delete memory[chatId]
    saveMemory(memory)
    await message.reply("memori chat room ini udah dihapus bang 🧼")
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
          temperature: 1.0
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 15000 // Gemini sangat cepat, 15 detik sudah sangat cukup
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

    await message.reply(
      "otak gw ngefreeze 💀"
    )

  }

}

module.exports = aiCommand