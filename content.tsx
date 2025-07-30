import type { PlasmoContentScript } from "plasmo"
import { useEffect } from "react"

export const config: PlasmoContentScript = {
  matches: ["https://www.youtube.com/*", "https://youtube.com/*"]
}

// React component for the content script
function ContentScript() {
  useEffect(() => {
    console.log("🎯 Content script loaded!")
    alert("Content script is working!")
  }, [])

  // Return null since this is a content script, not a UI component
  return null
}

export default ContentScript 