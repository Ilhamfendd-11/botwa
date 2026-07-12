const axios =
require("axios")

const {
  MessageMedia
} = require(
  "whatsapp-web.js"
)

async function tiktokCommand(
  message,
  client,
  text
) {

  try {

    const args =
    text.split(" ")

    if (!args[1]) {

      return message.reply(
        "contoh:\n!tt link"
      )

    }

    const url =
    args[1]

    const api =
    `https://tikwm.com/api/?url=${encodeURIComponent(url)}`

    const result =
    await axios.get(api)

    const data = result.data && result.data.data

    if (!data) {
      return message.reply(
        "gagal ambil konten tiktok 😭"
      )
    }

    // Cek apakah ada slideshow gambar
    let images = null
    if (data.images && Array.isArray(data.images)) {
      images = data.images
    } else if (data.image_post_info && Array.isArray(data.image_post_info.images)) {
      images = data.image_post_info.images
    }

    if (images && images.length > 0) {
      await message.reply(
        `tunggu bentar bang, ada ${images.length} gambar lagi didownload... ⏳`
      )

      for (let i = 0; i < images.length; i++) {
        try {
          const imageUrl = images[i]
          const media = await MessageMedia.fromUrl(
            imageUrl,
            {
              unsafeMime: true,
              filename: `tiktok_image_${i + 1}.jpg`
            }
          )

          await client.sendMessage(
            message.from,
            media,
            {
              caption: i === 0 ? "nih gambarnya bang 😭🔥" : ""
            }
          )
        } catch (imgErr) {
          console.log(`Gagal kirim gambar ke-${i + 1}:`, imgErr.message)
        }
      }
      return
    }

    // Jika bukan gambar, download video
    const videoUrl = data.play

    if (!videoUrl) {
      return message.reply(
        "gagal ambil video/gambar tiktok 😭"
      )
    }

    const media = await MessageMedia.fromUrl(
      videoUrl,
      {
        unsafeMime: true,
        filename: "tiktok.mp4"
      }
    )

    // Deteksi ukuran file dan ketersediaan codec Chrome
    const fileSize = media.data ? (media.data.length * 0.75) : 0
    const sizeLimit = 16 * 1024 * 1024 // 16MB
    const useDocument = !client.hasChromeCodecs || fileSize > sizeLimit

    console.log(`TikTok Video - Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB, hasChromeCodecs: ${client.hasChromeCodecs}, sending as document: ${useDocument}`)

    try {
      if (useDocument) {
        await client.sendMessage(
          message.from,
          media,
          {
            sendMediaAsDocument: true,
            caption: "nih bang 😭🔥"
          }
        )
      } else {
        await client.sendMessage(
          message.from,
          media,
          {
            caption: "nih bang 😭🔥",
            sendVideoAsGif: false
          }
        )
      }
    } catch (sendErr) {
      console.error("Gagal mengirim video TikTok:", sendErr.message)
      await message.reply(
        `gagal kirim media secara langsung 😭\ndownload manual di sini bang:\n${videoUrl}`
      )
    }

  } catch (err) {

    console.log(err)

    await message.reply(
      "tiktoknya error 😭"
    )

  }

}

module.exports =
tiktokCommand