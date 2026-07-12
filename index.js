require("dotenv").config()

const fs = require("fs")
const path = require("path")
const express = require("express")
const chromium = require("@sparticuz/chromium")
const { Client, LocalAuth } = require("whatsapp-web.js")
const QRCode = require("qrcode")

const aiCommand = require("./commands/ai")
const stickerCommand = require("./commands/sticker")
const tiktokCommand = require("./commands/tiktok")
const imageCommand = require("./commands/image")
const instagramCommand = require("./commands/instagram")

// ======================
// EXPRESS SERVER
// ======================

const app = express()

app.get("/", (req, res) => {
  res.send("bot alive")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})

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
  // MAIN BOT (async)
  // ======================

  ; (async () => {

    // ----------------------
    // SESSION MANAGEMENT
    // ----------------------

    const SESSION_DIR =
      path.join(process.cwd(), ".wwebjs_auth")

    // Hapus Chromium lock files jika ada agar Puppeteer tidak stuck saat restart
    const LOCK_FILES = [
      "SingletonLock",
      "SingletonSocket",
      "SingletonCookie"
    ]

    function deleteLocks(dir) {
      if (!fs.existsSync(dir)) return
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            deleteLocks(fullPath)
          } else if (LOCK_FILES.includes(entry.name)) {
            try {
              fs.unlinkSync(fullPath)
              console.log("Deleted lock:", fullPath)
            } catch (e) {
              console.log("Lock delete failed:", e.message)
            }
          }
        }
      } catch (e) {
        console.log("Lock scan error:", e.message)
      }
    }

    deleteLocks(SESSION_DIR)
    console.log("Lock cleanup done")

    // ----------------------
    // CHROMIUM SETUP
    // ----------------------

    let executablePath = ""
    let hasChromeCodecs = false

    if (process.platform === "win32") {
      // Di Windows, cari Chrome lokal atau biarkan kosong agar Puppeteer mendeteksi sendiri
      executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      if (!fs.existsSync(executablePath)) {
        executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      }
      if (!fs.existsSync(executablePath)) {
        executablePath = "" // Biarkan Puppeteer mencari default-nya
      }
      hasChromeCodecs = true // Windows Chrome / default Puppeteer Chrome has codecs
      console.log("Running on Windows. Using Chrome path:", executablePath || "default Puppeteer Chrome")
    } else {
      // Di Linux, coba cari google-chrome-stable terlebih dahulu untuk full codec support
      const chromePaths = [
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser"
      ]
      for (const p of chromePaths) {
        if (fs.existsSync(p)) {
          executablePath = p
          break
        }
      }

      if (executablePath) {
        hasChromeCodecs = executablePath.toLowerCase().includes("chrome")
        console.log("Found full Chrome/Chromium installation at:", executablePath, "Codecs:", hasChromeCodecs)
      } else {
        console.log("Full Chrome/Chromium not found. Getting Chromium executable path via @sparticuz/chromium...")
        executablePath = await chromium.executablePath()
        hasChromeCodecs = false // @sparticuz/chromium lacks proprietary codecs
        console.log("Chromium path:", executablePath)
      }
    }

    // ----------------------
    // WHATSAPP CLIENT
    // ----------------------

    const client = new Client({

      authStrategy: new LocalAuth(),

      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",

      webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1043012667-alpha.html"
      },

      puppeteer: {
        ...(executablePath ? { executablePath } : {}),
        headless: process.platform === "win32" ? true : (executablePath.toLowerCase().includes("chrome") ? true : chromium.headless),
        args: process.platform === "win32" ? [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--disable-gpu"
        ] : (
          executablePath.toLowerCase().includes("chrome")
            ? [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-first-run"
              ]
            : [
                ...chromium.args,
                "--disable-features=LockProfile"
              ]
        )
      }

    })

    client.hasChromeCodecs = hasChromeCodecs

    // ----------------------
    // GRACEFUL SHUTDOWN
    // ----------------------
    const handleShutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down client...`)
      try {
        await client.destroy()
        console.log("Client destroyed successfully.")
      } catch (e) {
        console.error("Error destroying client:", e.message)
      }
      process.exit(0)
    }

    process.on("SIGINT", () => handleShutdown("SIGINT"))
    process.on("SIGTERM", () => handleShutdown("SIGTERM"))

    // ======================
    // QR
    // ======================

    client.on("qr", async (qr) => {
      console.log("SCAN QR")
      const url = await QRCode.toDataURL(qr)
      console.log(url)
    })

    // ======================
    // READY
    // ======================

    client.on("ready", () => {
      console.log("BOT READY")
    })

    // ======================
    // AUTH FAILURE
    // ======================

    client.on("auth_failure", (msg) => {
      console.error("AUTHENTICATION FAILURE:", msg)
    })

    // ======================
    // DISCONNECTED
    // ======================

    client.on("disconnected", (reason) => {
      console.warn("CLIENT DISCONNECTED:", reason)
    })

    // ======================
    // MESSAGE
    // ======================

    client.on("message", async (message) => {

      if (message.fromMe) return

      const text = message.body.trim()

      console.log("MSG:", text)

      // PING
      if (text === "!ping") {
        await message.reply("masih hidup bang 😭")
        return
      }

      // STICKER
      if (text === "!sticker") {
        return stickerCommand(message, client)
      }

      // TIKTOK
      if (text.startsWith("!tt ")) {
        return tiktokCommand(message, client, text)
      }

      // INSTAGRAM
      if (text.startsWith("!ig ")) {
        return instagramCommand(message, client, text)
      }

      // IMAGE AI
      if (text.startsWith("!img ")) {
        return imageCommand(message, client, text)
      }

      // AI CHAT
      await aiCommand(message, client)

    })

    // ======================
    // INIT
    // ======================

    console.log("Launching Chromium...")

    client.initialize().then(() => {
      console.log("client.initialize() selesai")
    }).catch((err) => {
      console.error("client.initialize() GAGAL:", err.message)
      console.log("Menghentikan proses bot tanpa menghapus session_ok agar bisa dicoba kembali saat restart.")
      process.exit(1)
    })

  })()