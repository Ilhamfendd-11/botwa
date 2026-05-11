require("dotenv").config()

const { Client } =
  require("whatsapp-web.js")

const qrcode =
  require("qrcode-terminal")

const aiCommand =
  require("./commands/ai")

const client =
  new Client({

    puppeteer: {

      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]

    }

  })

// ======================
// QR
// ======================

client.on("qr", (qr) => {

  console.log("SCAN QR")

  qrcode.generate(qr, {
    small: true
  })

})

// ======================
// READY
// ======================

client.on("ready", () => {

  console.log("BOT READY")

})

// ======================
// MESSAGE
// ======================

client.on(
  "message",
  async (message) => {

    if (message.fromMe)
      return

    const text =
      message.body.trim()

    console.log(
      "MSG:",
      text
    )

    // ping
    if (text === "!ping") {

      message.reply(
        "masih hidup bang 😭"
      )

      return

    }

    // AI
    await aiCommand(
      message,
      client
    )

  }
)

// ======================
// START
// ======================

client.initialize()