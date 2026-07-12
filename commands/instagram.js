const axios =
require("axios")

const {
  MessageMedia
} = require(
  "whatsapp-web.js"
)

// ===================================
// Helper: ekstrak shortcode dari URL IG
// ===================================

function extractShortcode(url) {
  const match = url.match(
    /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/
  )
  return match ? match[2] : null
}

// ===================================
// Helper: decode escaped JSON strings in HTML
// ===================================

function decodeEscapedUrl(raw) {
  let cleaned = raw
  if (cleaned.endsWith("\\")) {
    cleaned = cleaned.slice(0, -1)
  }
  try {
    cleaned = JSON.parse('"' + cleaned + '"')
  } catch (e) {
    // fallback
  }
  cleaned = cleaned.replace(/\\([\/])/g, "$1")
  cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16))
  })
  return cleaned
}

// ===================================
// Method 1: Scrape Instagram Embed Page
// (tidak butuh API pihak ketiga)
// ===================================

async function fetchFromIgEmbed(url) {

  const shortcode = extractShortcode(url)
  if (!shortcode) throw new Error("Shortcode tidak ditemukan")

  const embedUrl =
  `https://www.instagram.com/p/${shortcode}/embed/captioned/`

  const res = await axios.get(embedUrl, {
    headers: {
      "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/120.0.0.0 Safari/537.36",
      "Accept":
      "text/html,application/xhtml+xml," +
      "application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Referer": "https://www.instagram.com/"
    },
    timeout: 15000
  })

  const html = res.data

  // Coba ambil video URL (mendukung quote & slash escaped)
  const videoMatch = html.match(/\\?"video_url\\?":\\?"([^"]+?)\\?"/)
  if (videoMatch) {
    const videoUrl = decodeEscapedUrl(videoMatch[1])
    console.log("IG embed: video found")
    return [{ url: videoUrl, type: "video" }]
  }

  // Coba ambil foto URL (mendukung quote & slash escaped)
  const imageMatch = html.match(/\\?"display_url\\?":\\?"([^"]+?)\\?"/)
  if (imageMatch) {
    const imageUrl = decodeEscapedUrl(imageMatch[1])
    console.log("IG embed: image found")
    return [{ url: imageUrl, type: "image" }]
  }

  throw new Error("Tidak ada media di embed page")

}

// ===================================
// Method 2: Cobalt instances (fallback)
// ===================================

const COBALT_INSTANCES = [
  "https://rue-cobalt.xenon.zone",
  "https://sunny.imput.net",
  "https://cobalt.api.timelessnesses.me"
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
          timeout: 10000,
          // Abaikan SSL error pada instance yang pakai self-signed cert
          httpsAgent: new (require("https").Agent)({
            rejectUnauthorized: false
          })
        }
      )

      const data = res.data

      if (
        data.status === "stream" ||
        data.status === "redirect" ||
        data.status === "tunnel"
      ) {
        return [{
          url: data.url,
          type: data.url && data.url.includes(".mp4")
            ? "video"
            : "image"
        }]
      }

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
// Main Command
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

    // Coba embed scraper dulu (paling reliable)
    try {
      console.log("Mencoba IG embed scraper...")
      medias = await fetchFromIgEmbed(url)
    } catch (e) {
      console.log("IG embed gagal:", e.message)
    }

    // Fallback ke Cobalt
    if (!medias || medias.length === 0) {
      try {
        console.log("Mencoba Cobalt fallback...")
        medias = await fetchFromCobalt(url)
      } catch (e) {
        console.log("Cobalt gagal:", e.message)
      }
    }

    if (!medias || medias.length === 0) {
      return message.reply(
        "gagal ambil konten ig 😭\n" +
        "postingan mungkin private atau tidak bisa diakses"
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
          {
            unsafeMime: true,
            filename,
            headers: {
              "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
              "AppleWebKit/537.36"
            }
          }
        )

        const fileSize = media.data ? (media.data.length * 0.75) : 0
        const sizeLimit = 16 * 1024 * 1024 // 16MB
        const useDocument = isVideo && (!client.hasChromeCodecs || fileSize > sizeLimit)

        if (isVideo) {
          console.log(`Instagram Video - Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB, hasChromeCodecs: ${client.hasChromeCodecs}, sending as document: ${useDocument}`)
        }

        if (useDocument) {
          await client.sendMessage(
            message.from,
            media,
            {
              sendMediaAsDocument: true,
              caption: i === 0 ? "nih bang 😭🔥" : ""
            }
          )
        } else {
          await client.sendMessage(
            message.from,
            media,
            {
              caption: i === 0 ? "nih bang 😭🔥" : "",
              sendVideoAsGif: false
            }
          )
        }

      } catch (mediaErr) {
        console.log(
          `Gagal kirim media ke-${i + 1}:`,
          mediaErr.message
        )
        try {
          await message.reply(
            `gagal kirim media ke-${i + 1} secara langsung 😭\ndownload manual di sini bang:\n${item.url}`
          )
        } catch (replyErr) {
          console.log("Gagal kirim fallback reply:", replyErr.message)
        }
      }

    }

  } catch (err) {
    console.log("IG Error:", err.message)
    await message.reply("ignya error 😭\ncoba lagi ntar bang")
  }

}

module.exports =
instagramCommand
