import type { PlasmoContentScript } from "plasmo"
import { useEffect } from "react"
import { analyzeYouTubePage, extractVideoId } from "./lib/youtube-likes"

export const config: PlasmoContentScript = {
  matches: ["https://www.youtube.com/*", "https://youtube.com/*"]
}

// React component for the content script
function ContentScript() {
  useEffect(() => {
    console.log("🎯 Sum Like It content script loaded!")
    
    const analyzePage = () => {
      const result = analyzeYouTubePage(document, window.location.href)
      if (result.success && result.data) {
        console.log("📊 Analysis result:", result.data)
        
        // Show visual feedback
        const indicator = document.createElement('div')
        indicator.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          background: #ff0000;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `
        indicator.textContent = `Likes: ${result.data.totalLikes}`
        document.body.appendChild(indicator)
        
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator)
          }
        }, 3000)
      } else {
        console.log("❌ Analysis failed:", result.error)
      }
    }

    // Run analysis when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', analyzePage)
    } else {
      analyzePage()
    }

    // Also run on navigation - improved for YouTube SPA
    let lastUrl = location.href
    let lastVideoId = extractVideoId(location.href)
    
    const observer = new MutationObserver(() => {
      const url = location.href
      const currentVideoId = extractVideoId(url)
      
      // Check if we've navigated to a different video
      if (url !== lastUrl || currentVideoId !== lastVideoId) {
        console.log("🔄 Navigation detected:", { from: lastUrl, to: url, fromVideo: lastVideoId, toVideo: currentVideoId })
        lastUrl = url
        lastVideoId = currentVideoId
        
        // Wait a bit for the page to settle, then analyze
        setTimeout(analyzePage, 2000)
      }
    })
    
    // Observe both document changes and URL changes
    observer.observe(document, { subtree: true, childList: true })
    
    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(analyzePage, 1000)
    })
    
    // Listen for YouTube's internal navigation events
    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(analyzePage, 1000)
    })
  }, [])

  // Return null since this is a content script, not a UI component
  return null
}

export default ContentScript 