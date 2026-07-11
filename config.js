const apiKeys = process.env.API_KEY 
  ? process.env.API_KEY.split(",").map(k => k.trim()).filter(Boolean)
  : [];

module.exports = {
  BOT_NAME: "!ai",
  BOT_NAME_BACOT: "!b",
  AI_MODEL: "gemini-2.5-flash",
  API_KEYS: apiKeys,
  API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta"
}
