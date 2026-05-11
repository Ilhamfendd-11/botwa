const axios =
  require("axios")

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

  // mention mode
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

  chat.sendStateTyping()

  // ======================
  // MEMORY
  // ======================

  let memory =
    loadMemory()

  if (!memory[username]) {

    memory[username] = {
      chats: []
    }

  }

  memory[username]
    .chats
    .push(text)

  memory[username]
    .chats =
    memory[username]
    .chats
    .slice(-5)

  saveMemory(memory)

  // ======================
  // AI REQUEST
  // ======================

  try {

    const prompt = `
Nama user:
${username}

Memory:
${memory[username]
.chats.join("\n")}

Pesan:
${text}
`

    const response =
      await axios.post(

        "https://openrouter.ai/api/v1/chat/completions",

        {

          model:
            config.AI_MODEL,

          messages: [

            {
              role: "system",
              content:
                personality
            },

            {
              role: "user",
              content:
                prompt
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

    const reply =
      response.data
      .choices[0]
      .message.content

    message.reply(reply)

  } catch (err) {

    console.log(
        err.response?.data ||
        err.message
    )

    message.reply(
      "otak gw ngefreeze 💀"
    )

  }

}

module.exports = aiCommand