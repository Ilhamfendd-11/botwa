const axios =
require("axios")

const {
  MessageMedia
} = require(
  "whatsapp-web.js"
)

// ===================================
// Cobalt instances (open-source, support IG)
// POST / dengan body { url: "..." }
// ===================================

const COBALT_INSTANCES = [
  "https://sunny.imput.net",
  "https://cobalt.api.timelessnesses.me",
  "https://cobalt.nadeko.net",
  "https://cobalt.perennialte.ch"
]

async function fetchFromCobalt(url) {

  let lastErr = null

  for (const instance of COBALT_INSTANCES) {

    try {

      console.log("Cobalt try:", instance)

      const res = await axios.post(
        instance,
        { url },
        {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          timeout: 12000
        }
      )

      const data = res.data

      // status: stream / redirect / tunnel = 1 file langsung
      if (
        data.status === "stream" ||
        data.status === "redirect" ||
        data.status === "tunnel"
      ) {
        return [{
          url: data.url,
          type: data.url &&
            data.url.includes(".mp4")
              ? "video"
              : "image"
        }]
      }

      // status: picker = multiple media (carousel)
      if (data.status === "picker") {
        return data.picker.map(item => ({
          url: item.url,
          type: item.type || "image"
        }))
      }

    } catch (e) {
      console.log(`Cobalt ${instance} gagal:`, e.message)
      lastErr = e
    }

  }

  throw lastErr || new Error("Semua Cobalt instance gagal")

}

// ===================================
// Main command
// ===================================

async function instagramCommand(
  message,
  client,
  text
) {

  try {

    const args = text.split(" ")

    if (!args[1]) {
      return message.reply(
        "contoh:\n!ig https://www.instagram.com/p/xxx\natau\n!ig https://www.instagram.com/reel/xxx"
      )
    }

    const url = args[1]

    if (!url.includes("instagram.com")) {
      return message.reply(
        "link harus dari instagram bang 😭"
      )
    }

    await message.reply(
      "tunggu bentar bang, lagi diproses... ⏳"
    )

    let medias = null

    try {
      medias = await fetchFromCobalt(url)
    } catch (e) {
      console.log("Semua Cobalt gagal:", e.message)
    }

    if (!medias || medias.length === 0) {
      return message.reply(
        "gagal ambil konten ig 😭\npostingan mungkin private atau server lagi down"
      )
    }

    // Kirim semua media
    for (let i = 0; i < medias.length; i++) {

      const item = medias[i]

      const isVideo =
        item.type === "video" ||
        (item.url && item.url.includes(".mp4"))

      const filename = isVideo
        ? `ig_reel_${i + 1}.mp4`
        : `ig_foto_${i + 1}.jpg`

      try {

        const media = await MessageMedia.fromUrl(
          item.url,
          { unsafeMime: true, filename }
        )

        await client.sendMessage(
          message.from,
          media,
          {
            caption: i === 0 ? "nih bang 😭🔥" : "",
            sendVideoAsGif: false
          }
        )

      } catch (mediaErr) {
        console.log(
          `Gagal kirim media ke-${i + 1}:`,
          mediaErr.message
        )
      }

    }

  } catch (err) {
    console.log("IG Error:", err.message)
    await message.reply("ignya error 😭\ncoba lagi ntar bang")
  }

}

module.exports =
instagramCommand
