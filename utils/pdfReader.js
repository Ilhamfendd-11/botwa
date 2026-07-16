const fs = require("fs")
const path = require("path")
const pdfParse = require("pdf-parse")
const officeParser = require("officeparser")

// 15MB size limit
const FILE_SIZE_LIMIT = 15 * 1024 * 1024

/**
 * Extracts text from supported media files.
 * Supported: txt, pdf, docx, xlsx, pptx, etc.
 * @param {object} media - The MessageMedia object downloaded from whatsapp-web.js
 * @returns {Promise<string>} The extracted text content of the document.
 */
async function extractTextFromMedia(media) {
  if (!media || !media.data) {
    throw new Error("EMPTY_FILE")
  }

  // Calculate approximate file size from base64
  const fileSize = Math.floor((media.data.length * 3) / 4)
  if (fileSize > FILE_SIZE_LIMIT) {
    throw new Error("FILE_TOO_LARGE")
  }

  const mime = media.mimetype ? media.mimetype.toLowerCase() : ""
  const buffer = Buffer.from(media.data, "base64")

  // 1. Plain Text
  if (mime.startsWith("text/plain")) {
    const text = buffer.toString("utf8").trim()
    if (!text) throw new Error("EMPTY_CONTENT")
    return text
  }

  // 2. PDF Document
  if (mime === "application/pdf") {
    try {
      const data = await pdfParse(buffer)
      const text = data.text ? data.text.trim() : ""
      if (!text) throw new Error("EMPTY_CONTENT")
      return text
    } catch (err) {
      console.error("[pdfReader] Error parsing PDF:", err.message)
      throw new Error("PARSE_FAILED")
    }
  }

  // 3. Office Documents & OpenDocuments
  const officeMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/msword", // doc
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "application/vnd.ms-excel", // xls
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "application/vnd.ms-powerpoint", // ppt
    "application/vnd.oasis.opendocument.text", // odt
    "application/vnd.oasis.opendocument.spreadsheet", // ods
    "application/vnd.oasis.opendocument.presentation", // odp
    "application/rtf",
    "text/csv"
  ]

  const isOffice = officeMimeTypes.includes(mime) || 
    (media.filename && /\.(docx|doc|xlsx|xls|pptx|ppt|odt|ods|odp|rtf|csv)$/i.test(media.filename))

  if (isOffice) {
    const tempDir = path.join(process.cwd(), "temp")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Determine extension from mime or filename
    let ext = ".docx"
    if (mime.includes("spreadsheet") || mime.includes("excel") || (media.filename && /\.xlsx?$/i.test(media.filename))) {
      ext = ".xlsx"
    } else if (mime.includes("presentation") || mime.includes("powerpoint") || (media.filename && /\.pptx?$/i.test(media.filename))) {
      ext = ".pptx"
    } else if (mime.includes("rtf")) {
      ext = ".rtf"
    } else if (mime.includes("csv")) {
      ext = ".csv"
    } else if (media.filename) {
      const match = media.filename.match(/\.[0-9a-z]+$/i)
      if (match) ext = match[0]
    }

    const tempFilePath = path.join(tempDir, `temp_${Date.now()}${ext}`)

    try {
      fs.writeFileSync(tempFilePath, buffer)
      
      // Parse using officeparser
      const extractedText = await officeParser.parseOfficeAsync(tempFilePath, {
        newlineDelimiter: "\n",
        ignoreNotes: false
      })

      const text = extractedText ? extractedText.trim() : ""
      if (!text) throw new Error("EMPTY_CONTENT")
      return text
    } catch (err) {
      console.error("[pdfReader] Error parsing office file:", err.message)
      if (err.message === "EMPTY_CONTENT") throw err
      throw new Error("PARSE_FAILED")
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath)
        }
      } catch (cleanupErr) {
        console.error("[pdfReader] Temp cleanup failed:", cleanupErr.message)
      }
    }
  }

  // If we reach here, the file format is not supported
  throw new Error("UNSUPPORTED_FORMAT")
}

module.exports = {
  extractTextFromMedia
}
