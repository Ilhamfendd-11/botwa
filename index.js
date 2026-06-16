require("dotenv").config()

const fs = require("fs")
const path = require("path")

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

const instagramCommand =
require("./commands/instagram")

// ======================
// HAPUS SINGLETON LOCK (REKURSIF)
// (fix Railway redeploy error)
// ======================

const LOCK_FILES = [
  "SingletonLock",
  "SingletonSocket",
  "SingletonCookie"
]

function deleteLockFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        deleteLockFilesRecursive(fullPath)
      } else if (LOCK_FILES.includes(entry.name)) {
        try {
          fs.unlinkSync(fullPath)
          console.log("Deleted lock file:", fullPath)
        } catch (e) {
          console.log("Could not delete:", fullPath, e.message)
        }
      }
    }
  } catch (e) {
    console.log("Error scanning dir:", dir, e.message)
  }
}

deleteLockFilesRecursive(
  path.join(process.cwd(), ".wwebjs_auth")
)

console.log("Lock cleanup done, starting bot...")

const client =
new Client({

  authStrategy: new LocalAuth(),

  puppeteer: {
    headless: true,
    protocolTimeout: 90000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-features=LockProfile",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--mute-audio",
      "--hide-scrollbars"
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
    // INSTAGRAM
    // ======================

    if (
      text.startsWith("!ig ")
    ) {

      return instagramCommand(
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

// ======================
// GLOBAL ERROR HANDLER
// ======================

process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT]:", err.message)
  process.exit(1)
})

process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]:", reason)
  process.exit(1)
})

// ======================
// INIT BOT
// ======================

console.log("Launching Chromium...")

client.initialize().then(() => {
  console.log("client.initialize() selesai")
}).catch((err) => {
  console.error("client.initialize() GAGAL:", err.message)
  process.exit(1)
})