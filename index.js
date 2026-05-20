require("dotenv").config()

const express =
require("express")

const app = express()

app.get("/", (req, res) => {
  res.send("bot alive")
})

app.listen(3000)

const {
  Client
} = require("whatsapp-web.js")

const QRCode =
require("qrcode")

const aiCommand =
require("./commands/ai")

const stickerCommand =
require("./commands/sticker")

const tiktokCommand =
require("./commands/tiktok")

const imageCommand =
require("./commands/image")

const client =
new Client({

 puppeteer: {

  headless: true,

  executablePath:
  process.env.RAILWAY_ENVIRONMENT
  ? "/usr/bin/chromium"
  : undefined,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]

  }

})

// ======================
// QR
// ======================

client.on(
  "qr",
  async (qr) => {

    console.log("SCAN QR")

    const url =
    await QRCode.toDataURL(qr)

    console.log(url)

  }
)

// ======================
// READY
// ======================

client.on(
  "ready",
  () => {

    console.log(
      "BOT READY"
    )

  }
)

// ======================
// MESSAGE
// ======================

client.on(
  "message",
  async (message) => {

    if (
      message.fromMe
    ) return

    const text =
    message.body.trim()

    console.log(
      "MSG:",
      text
    )

    // ======================
    // PING
    // ======================

    if (
      text === "!ping"
    ) {

      await message.reply(
        "masih hidup bang 😭"
      )

      return

    }

    // ======================
    // STICKER
    // ======================

    if (
      text === "!sticker"
    ) {

      return stickerCommand(
        message,
        client
      )

    }

    // ======================
    // TIKTOK
    // ======================

    if (
      text.startsWith("!tt ")
    ) {

      return tiktokCommand(
        message,
        client,
        text
      )

    }

    // ======================
    // IMAGE AI
    // ======================

    if (
      text.startsWith("!img ")
    ) {

      return imageCommand(
        message,
        client,
        text
      )

    }

    // ======================
    // AI CHAT
    // ======================

    await aiCommand(
      message,
      client
    )

  }
)

client.initialize()