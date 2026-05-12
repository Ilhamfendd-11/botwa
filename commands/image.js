const axios =
require("axios")

const {
  MessageMedia
} = require(
  "whatsapp-web.js"
)

async function imageCommand(
  message,
  client,
  text
) {

  try {

    const prompt =
    text.replace(
      "!img",
      ""
    ).trim()

    if (!prompt) {

      return message.reply(
        "contoh:\n!img kucing naik motor 😭"
      )

    }

    const imageUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Date.now()}`

    const response =
    await axios({

      url:
      imageUrl,

      method:
      "GET",

      responseType:
      "arraybuffer",

      timeout:
      60000

    })

    const media =
    new MessageMedia(

      "image/jpeg",

      Buffer
      .from(response.data)
      .toString("base64")

    )

    await client.sendMessage(

      message.from,

      media,

      {
        caption:
        `🖼️ ${prompt}`
      }

    )

  } catch (err) {

    console.log(err)

    await message.reply(
      "server gambar lagi sakarat 😭"
    )

  }

}

module.exports =
imageCommand