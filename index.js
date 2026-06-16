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
// SESSION MANAGEMENT
// ======================

const SESSION_DIR =
path.join(process.cwd(), ".wwebjs_auth")

const SESSION_OK_FILE =
path.join(SESSION_DIR, ".session_ok")

// Jika session ada tapi belum pernah berhasil init
// (tidak ada marker .session_ok) → session corrupt
// Hapus seluruh session agar start fresh
if (
  fs.existsSync(SESSION_DIR) &&
  !fs.existsSync(SESSION_OK_FILE)
) {
  console.log("Session corrupt / belum pernah ready, hapus dan mulai fresh...")
  try {
    fs.rmSync(SESSION_DIR, { recursive: true, force: true })
    console.log("Session dihapus, bot akan minta scan QR")
  } catch (e) {
    console.log("Gagal hapus session:", e.message)
  }
} else {
  // Session valid, hanya hapus lock files
  const LOCK_FILES = ["SingletonLock", "SingletonSocket", "SingletonCookie"]

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

  deleteLockFilesRecursive(SESSION_DIR)
  console.log("Lock cleanup done")
}

console.log("Starting bot...")

const client =
new Client({

  authStrategy: new LocalAuth(),

  // Fix: pakai versi WA Web yang stabil,
  // bukan latest yang sering redirect/berubah
  webVersionCache: {
    type: "remote",
    remotePath:
    "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/%V.html"
  },

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

    console.log("BOT READY")

    // Tulis marker: session berhasil init
    // Startup berikutnya tidak akan hapus session
    try {
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true })
      }
      fs.writeFileSync(SESSION_OK_FILE, new Date().toISOString())
    } catch (e) {
      console.log("Gagal tulis session_ok:", e.message)
    }

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