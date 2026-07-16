const axios = require("axios")
const config = require("../config")
const { bacotPersonality, normalPersonality } = require("./personality")

// Track key rotation across requests
let currentKeyIndex = 0

/**
 * Combines Menston personality with document/vision behavior guidelines.
 */
function getSystemInstruction(isBacot) {
  const basePersonality = isBacot ? bacotPersonality : normalPersonality
  const customRules = `
[PENTING - ATURAN ASISTEN DOKUMEN & VISION]:
1. Anda membaca dan menjawab berdasarkan isi gambar atau dokumen yang diberikan secara langsung.
2. JANGAN PERNAH MENGARANG informasi yang tidak ada dalam file. Jika informasi tidak ditemukan atau Anda tidak yakin, katakan secara jujur bahwa Anda tidak tahu atau tidak yakin.
3. Jawab dengan singkat, padat, dan to the point, kecuali jika pengguna secara spesifik meminta penjelasan detail.
4. Tetap gunakan gaya kepribadian dasar Anda (chaos/toxic/bacot jika mode Bacot aktif, atau ramah/helpful jika mode normal aktif) namun INFORMASI HARUS TETAP 100% AKURAT DAN TIDAK MENGARANG.
`
  return basePersonality.trim() + "\n" + customRules.trim()
}

/**
 * Call Gemini API with Key Rotation
 */
async function callGeminiAPI(payload) {
  const keys = config.API_KEYS
  if (!keys || keys.length === 0) {
    throw new Error("No Gemini API keys configured in .env")
  }

  let response
  let success = false
  let attempts = 0
  let lastError = null

  while (!success && attempts < keys.length) {
    const keyIndex = (currentKeyIndex + attempts) % keys.length
    const apiKey = keys[keyIndex]
    attempts++

    try {
      response = await axios.post(
        `${config.API_BASE_URL}/models/${config.AI_MODEL}:generateContent?key=${apiKey}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 25000
        }
      )
      success = true
      currentKeyIndex = (keyIndex + 1) % keys.length
    } catch (err) {
      lastError = err
      const statusCode = err.response?.status
      const errorMsg = err.response?.data?.error?.message || err.message
      console.warn(`[Gemini Service API] Key index ${keyIndex} failed (Status: ${statusCode}, Error: ${errorMsg}). Trying next key...`)
    }
  }

  if (!success) {
    throw lastError || new Error("All Gemini API keys failed.")
  }

  const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!resultText) {
    throw new Error("Empty response from Gemini API")
  }

  return resultText
    .replace(/sebagai ai/gi, "")
    .replace(/aku ai/gi, "")
    .trim()
}

/**
 * Call Gemini Vision Model for Image tasks
 * @param {Buffer|string} imageBase64 - Base64 string of the image (without data prefix)
 * @param {string} mimeType - Image mime type
 * @param {string} prompt - Prompt for the image
 * @param {boolean} isBacot - Active mode
 */
async function callVisionAI(imageBase64, mimeType, prompt, isBacot = false) {
  const instruction = getSystemInstruction(isBacot)

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [{ text: instruction }]
    },
    generationConfig: {
      maxOutputTokens: 1500,
      temperature: isBacot ? 1.0 : 0.7
    }
  }

  return await callGeminiAPI(payload)
}

/**
 * Call Gemini Model for Text-based document tasks
 * @param {string} docText - The extracted text of the document
 * @param {string} prompt - Prompt/question
 * @param {boolean} isBacot - Active mode
 */
async function callTextAI(docText, prompt, isBacot = false) {
  const instruction = getSystemInstruction(isBacot)

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: `${prompt}\n\nBerikut adalah isi dokumen yang dibaca:\n--- START DOCUMENT ---\n${docText}\n--- END DOCUMENT ---` }
        ]
      }
    ],
    systemInstruction: {
      parts: [{ text: instruction }]
    },
    generationConfig: {
      maxOutputTokens: 1500,
      temperature: isBacot ? 1.0 : 0.7
    }
  }

  return await callGeminiAPI(payload)
}

module.exports = {
  callVisionAI,
  callTextAI
}
