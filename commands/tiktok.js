const axios =
require("axios")

const {
  TiktokDL
} = require(
  "@tobyg74/tiktok-api-dl"
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

    const data =
    await TiktokDL(url)

    const videoUrl =
    data.result.video1

    const response =
    await axios.get(
      videoUrl,
      {
        responseType:
        "arraybuffer"
      }
    )

    const media = {
      mimetype:
      "video/mp4",

      data:
      Buffer
      .from(
        response.data,
        "binary"
      )
      .toString("base64")
    }

    await client.sendMessage(

      message.from,

      media,

      {
        caption:
        "nih bang 😭🔥"
      }

    )

  } catch (err) {

    console.log(err)

    message.reply(
      "gagal download tiktok 😭"
    )

  }

}

module.exports =
tiktokCommand