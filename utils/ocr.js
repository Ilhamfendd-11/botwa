const { callVisionAI } = require("./visionService")

/**
 * Extracts raw text from an image.
 * @param {string} imageBase64 - Base64 string of the image (without data URL prefix)
 * @param {string} mimeType - The mime type of the image (e.g., image/jpeg)
 * @returns {Promise<string>} The extracted text.
 */
async function performOCR(imageBase64, mimeType) {
  const prompt = `
Extract all visible text from this image.
Strict instructions:
1. Return ONLY the raw text extracted from the image.
2. DO NOT add any explanations, introductory text (like "Here is the text:"), concluding text, or chatbot responses.
3. DO NOT wrap the output in markdown code blocks.
4. Keep the original line breaks and layout of the text as much as possible.
5. If there is no text in the image, reply with absolutely nothing.
`.trim()

  return await callVisionAI(imageBase64, mimeType, prompt, false)
}

module.exports = {
  performOCR
}
