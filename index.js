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

    const SESSION_OK_FILE =
      path.join(SESSION_DIR, ".session_ok")

    // Jika session ada tapi belum pernah berhasil
    // (tidak ada .session_ok) → hapus ISI session
    // Catatan: tidak bisa rmdir mount point Railway,
    // jadi hapus subfolder session-nya saja
    if (
      fs.existsSync(SESSION_DIR) &&
      !fs.existsSync(SESSION_OK_FILE)
    ) {
      console.log("Session belum valid, hapus session lama...")
      try {
        const items = fs.readdirSync(SESSION_DIR)
        for (const item of items) {
          if (item === ".session_ok") continue
          const itemPath = path.join(SESSION_DIR, item)
          fs.rmSync(itemPath, { recursive: true, force: true })
          console.log("Deleted:", itemPath)
        }
        console.log("Session lama dihapus, bot akan minta scan QR")
      } catch (e) {
        console.log("Gagal hapus session:", e.message)
      }
    } else {
      // Session valid, hanya hapus Chromium lock files
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
    }

    // ----------------------
    // CHROMIUM SETUP
    // ----------------------

    let executablePath = ""
    if (process.platform === "win32") {
      // Di Windows, cari Chrome lokal atau biarkan kosong agar Puppeteer mendeteksi sendiri
      executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      if (!fs.existsSync(executablePath)) {
        executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      }
      if (!fs.existsSync(executablePath)) {
        executablePath = "" // Biarkan Puppeteer mencari default-nya
      }
      console.log("Running on Windows. Using Chrome path:", executablePath || "default Puppeteer Chrome")
    } else {
      console.log("Getting Chromium executable path via @sparticuz/chromium...")
      executablePath = await chromium.executablePath()
      console.log("Chromium path:", executablePath)
    }

    // ----------------------
    // WHATSAPP CLIENT
    // ----------------------

    const client = new Client({

      authStrategy: new LocalAuth(),

      webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/%V.html"
      },

      puppeteer: {
        ...(executablePath ? { executablePath } : {}),
        headless: true,
        args: [
          ...(process.platform !== "win32" ? chromium.args : []),
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--disable-gpu",
          "--disable-features=LockProfile"
        ]
      }

    })

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

      // Tulis marker: session berhasil init
      // Startup berikutnya tidak akan hapus session
      try {
        if (!fs.existsSync(SESSION_DIR)) {
          fs.mkdirSync(SESSION_DIR, { recursive: true })
        }
        fs.writeFileSync(
          SESSION_OK_FILE,
          new Date().toISOString()
        )
      } catch (e) {
        console.log("Gagal tulis session_ok:", e.message)
      }
    })

    // ======================
    // AUTH FAILURE
    // ======================

    client.on("auth_failure", (msg) => {
      console.error("AUTHENTICATION FAILURE:", msg)
      try {
        if (fs.existsSync(SESSION_OK_FILE)) {
          fs.unlinkSync(SESSION_OK_FILE)
          console.log("session_ok dihapus karena auth_failure (session tidak valid)")
        }
      } catch (e) {
        console.log("Gagal hapus session_ok di auth_failure:", e.message)
      }
    })

    // ======================
    // DISCONNECTED
    // ======================

    client.on("disconnected", (reason) => {
      console.warn("CLIENT DISCONNECTED:", reason)
      try {
        if (fs.existsSync(SESSION_OK_FILE)) {
          fs.unlinkSync(SESSION_OK_FILE)
          console.log("session_ok dihapus karena disconnected (keluar dari bot)")
        }
      } catch (e) {
        console.log("Gagal hapus session_ok di disconnected:", e.message)
      }
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