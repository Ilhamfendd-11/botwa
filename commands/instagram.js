const axios =
require("axios")

const {
  MessageMedia
} = require(
  "whatsapp-web.js"
)

// ===================================
// API list dengan fallback
// ===================================

async function fetchFromCobalt(url) {

  // Cobalt adalah open-source & mendukung Instagram
  const cobaltUrl =
  "https://dwnld.nichindi.uk"

  const res = await axios.post(
    cobaltUrl,
    { url: url },
    {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      timeout: 15000
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
      type: data.url.includes(".mp4")
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

  return null

}

async function fetchFromSaveig(url) {

  const api =
  `https://api.saveig.app/api/ajaxSearch`

  const res = await axios.post(
    api,
    new URLSearchParams({
      q: url,
      t: "media",
      lang: "en"
    }),
    {
      headers: {
        "Content-Type":
        "application/x-www-form-urlencoded"
      },
      timeout: 15000
    }
  )

  const html = res.data.data || ""

  // Ambil semua URL video/foto dari response
  const videoMatches =
  [...html.matchAll(
    /href="(https:\/\/[^"]+\.mp4[^"]*)"/g
  )]

  const imageMatches =
  [...html.matchAll(
    /href="(https:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/g
  )]

  const results = []

  for (const m of videoMatches) {
    results.push({ url: m[1], type: "video" })
  }

  for (const m of imageMatches) {
    results.push({ url: m[1], type: "image" })
  }

  return results.length > 0
    ? results
    : null

}

async function fetchFromSnapinsta(url) {

  // SnapInsta API
  const res = await axios.post(
    "https://snapinsta.app/action_download.php",
    new URLSearchParams({ url }),
    {
      headers: {
        "Content-Type":
        "application/x-www-form-urlencoded",
        "Referer": "https://snapinsta.app/",
        "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 15000
    }
  )

  const data = res.data

  if (!data || !data.url) return null

  return [{
    url: data.url,
    type: "video"
  }]

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

    const args =
    text.split(" ")

    if (!args[1]) {

      return message.reply(
        "contoh:\n!ig https://www.instagram.com/p/xxx\natau\n!ig https://www.instagram.com/reel/xxx"
      )

    }

    const url =
    args[1]

    if (!url.includes("instagram.com")) {

      return message.reply(
        "link harus dari instagram bang 😭"
      )

    }

    await message.reply(
      "tunggu bentar bang, lagi diproses... ⏳"
    )

    // Coba satu per satu API
    let medias = null

    try {
      console.log("Mencoba Cobalt...")
      medias = await fetchFromCobalt(url)
    } catch (e) {
      console.log("Cobalt gagal:", e.message)
    }

    if (!medias || medias.length === 0) {
      try {
        console.log("Mencoba SaveIG...")
        medias = await fetchFromSaveig(url)
      } catch (e) {
        console.log("SaveIG gagal:", e.message)
      }
    }

    if (!medias || medias.length === 0) {
      try {
        console.log("Mencoba SnapInsta...")
        medias = await fetchFromSnapinsta(url)
      } catch (e) {
        console.log("SnapInsta gagal:", e.message)
      }
    }

    if (!medias || medias.length === 0) {

      return message.reply(
        "gagal ambil konten ig 😭\npostingan mungkin private atau semua server lagi down"
      )

    }

    // Kirim semua media
    for (let i = 0; i < medias.length; i++) {

      const item = medias[i]

      const isVideo =
      item.type === "video" ||
      (item.url && item.url.includes(".mp4"))

      const filename =
      isVideo
        ? `ig_reel_${i + 1}.mp4`
        : `ig_foto_${i + 1}.jpg`

      try {

        const media =
        await MessageMedia.fromUrl(
          item.url,
          {
            unsafeMime: true,
            filename: filename
          }
        )

        const caption =
        i === 0
          ? "nih bang 😭🔥"
          : ""

        await client.sendMessage(
          message.from,
          media,
          {
            caption: caption,
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

    await message.reply(
      "ignya error 😭\ncoba lagi ntar bang"
    )

  }

}

module.exports =
instagramCommand
