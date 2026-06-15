require("dotenv").config()

const express = require("express")

const app = express()

app.get("/", (req, res) => {
  res.send("bot alive")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})

const {
  Client,
  LocalAuth
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

  authStrategy: new LocalAuth(),

  puppeteer: {
    headless: true,
    executablePath: process.env.RAILWAY_ENVIRONMENT ? "/usr/bin/chromium" : undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu"
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