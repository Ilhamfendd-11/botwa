const axios =
require("axios")

const btch =
require(
  "btch-downloader"
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
    await btch.tiktok(url)

    const videoUrl =
    data.video

    const response =
    await axios({

      url:
      videoUrl,

      method:
      "GET",

      responseType:
      "arraybuffer",

      timeout:
      60000

    })

    const media = {

      mimetype:
      "video/mp4",

      data:
      Buffer
      .from(response.data)
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

    await message.reply(
      "tiktoknya ngambek 😭"
    )

  }

}

module.exports =
tiktokCommand