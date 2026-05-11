const fs = require("fs")

function loadMemory() {

  return JSON.parse(
    fs.readFileSync(
      "./memory.json"
    )
  )

}

function saveMemory(data) {

  fs.writeFileSync(
    "./memory.json",

    JSON.stringify(
      data,
      null,
      2
    )
  )

}

module.exports = {
  loadMemory,
  saveMemory
}