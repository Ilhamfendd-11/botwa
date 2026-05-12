const axios =
require("axios")

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

    // API tiktok
    const api =
    `https://tikwm.com/api/?url=${encodeURIComponent(url)}`

    const result =
    await axios.get(api)

    const videoUrl =
    result.data
    .data
    .play

    if (!videoUrl) {

      return message.reply(
        "gagal ambil video 😭"
      )

    }

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
      "tiktoknya error 😭"
    )

  }

}

module.exports =
tiktokCommand