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

  // ======================
  // AI
  // ======================

  try {

    const response =
    await axios.post(

      `${config.API_BASE_URL}/chat/completions`,

      {

        model:
        config.AI_MODEL,

        max_tokens: 1000,

        messages: [

          {
            role: "system",
            content:
            personality
          },

          ...history,

          {
            role: "user",
            content: `[${username}]: ${cleanText}`
          }

        ]

      },

      {

        headers: {

          Authorization:
          `Bearer ${config.API_KEY}`,

          "HTTP-Referer":
          "https://localhost",

          "X-Title":
          "TongkronganBot",

          "Content-Type":
          "application/json"

        }

      }

    )

    let reply =
    response.data
    .choices[0]
    .message.content

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

    console.log(
    JSON.stringify(
      err.response?.data,
      null,
      2
    ) || err.message)

    await message.reply(
      "otak gw ngefreeze 💀"
    )
    console.log(err)

  }

}

module.exports = aiCommand