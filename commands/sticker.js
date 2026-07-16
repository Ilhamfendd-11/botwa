const fs =
require("fs")

const path =
require("path")

async function stickerCommand(
  message,
  client
) {
  try {
    if (
      !message.hasMedia
    ) {
      return message.reply(
        "reply gambar pake !sticker 😭"
      )
    }

    const { downloadMediaWithRetry } = require("../utils/downloadHelper")
    const media = await downloadMediaWithRetry(message)
    if (!media) {
      return message.reply("gagal download media sticker bang 😭")
    }

    await client.sendMessage(
      message.from,
      media,
      {
        sendMediaAsSticker: true,
        stickerName: "Tongkrongan",
        stickerAuthor: "Ilham"
      }
    )
  } catch (err) {
    console.error("[Sticker Command] Error:", err)
    await message.reply("gagal bikin sticker bang 😭")
  }
}

module.exports =
stickerCommand