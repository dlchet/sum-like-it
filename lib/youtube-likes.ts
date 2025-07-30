// Interfaces for YouTube data extraction
export interface VideoData {
  id: string
  title: string
  videoUrl: string
  likeCount: number
}

export interface ChannelData {
  channelId: string
  channelName: string
  totalLikes: number
  videoCount: number
  videos: VideoData[]
  lastUpdated: number
}

export interface ExtractionResult {
  success: boolean
  data?: ChannelData
  error?: string
}

// Extract like count from YouTube's internal data structures
export function extractLikeCount(document: Document): number {
  try {
    console.log("🔍 Starting like count extraction...")

    // First, let's see what's actually available in the window object
    console.log("🔍 Investigating what's available in window object...")
    const windowKeys = Object.keys(window).filter(key => 
      key.toLowerCase().includes('yt') || 
      key.toLowerCase().includes('youtube') ||
      key.toLowerCase().includes('video') ||
      key.toLowerCase().includes('like')
    )
    console.log("🔍 YouTube-related window properties:", windowKeys)

    // Check if any of these properties contain useful data
    for (const key of windowKeys) {
      try {
        const value = (window as any)[key]
        if (value && typeof value === 'object') {
          console.log(`🔍 Found window.${key}:`, typeof value, Object.keys(value).slice(0, 10))
        }
      } catch (error) {
        // Ignore errors accessing window properties
      }
    }

    // Let's also check what's in the document's script tags that might contain data
    console.log("🔍 Checking for data in script tags...")
    const scripts = document.querySelectorAll('script')
    for (let i = 0; i < Math.min(scripts.length, 5); i++) {
      const script = scripts[i]
      const content = script.textContent || script.innerHTML
      if (content && content.includes('ytInitialData')) {
        console.log(`🔍 Found script with ytInitialData (script ${i}):`, content.substring(0, 200))
      }
      if (content && content.includes('likeCount')) {
        console.log(`🔍 Found script with likeCount (script ${i}):`, content.substring(0, 200))
      }
    }

    // Now try the DOM scraping approach with better debugging
    console.log("🔍 Using DOM scraping approach...")
    return extractLikeCountFromDOM(document)
  } catch (error) {
    console.error('Error extracting like count:', error)
    return 0
  }
}

function extractFromYtInitialData(data: any): { likeCount?: number; channelName?: string } | null {
  try {
    // Navigate through the complex data structure
    const contents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents
    if (contents) {
      for (const content of contents) {
        if (content?.videoPrimaryInfoRenderer) {
          const videoInfo = content.videoPrimaryInfoRenderer
          const likeButton = videoInfo?.videoActions?.menuRenderer?.topLevelButtons?.[0]?.segmentedLikeDislikeButtonRenderer?.likeButton?.toggleButtonRenderer
          
          if (likeButton?.defaultText?.simpleText) {
            const likeText = likeButton.defaultText.simpleText
            const likeCount = parseLikeCountText(likeText)
            if (likeCount > 0) {
              return { likeCount }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting from ytInitialData:', error)
  }
  return null
}

function extractFromYtInitialDataAlternative(data: any): { likeCount?: number; channelName?: string } | null {
  try {
    // Try alternative paths in the data structure
    console.log("🔍 Searching for alternative paths in ytInitialData...")
    
    // Look for any object that might contain like count
    const searchForLikeCount = (obj: any, path: string = ''): number | null => {
      if (!obj || typeof obj !== 'object') return null
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key
        
        if (key.toLowerCase().includes('like') && typeof value === 'string') {
          console.log(`🔍 Found potential like data at ${currentPath}:`, value)
          const likeCount = parseLikeCountText(value)
          if (likeCount > 0) {
            console.log(`✅ Found like count at ${currentPath}: ${likeCount}`)
            return likeCount
          }
        }
        
        if (typeof value === 'object' && value !== null) {
          const result = searchForLikeCount(value, currentPath)
          if (result !== null) return result
        }
      }
      return null
    }
    
    const likeCount = searchForLikeCount(data)
    if (likeCount !== null) {
      return { likeCount }
    }
  } catch (error) {
    console.error('Error extracting from ytInitialData (alternative):', error)
  }
  return null
}

function extractFromYtcfg(cfg: any): { likeCount?: number } | null {
  try {
    // ytcfg might contain video data in a different format
    const data = cfg?.data_
    if (data) {
      // Look for like count in various possible locations
      const likeCount = data.likeCount || data.videoDetails?.likeCount
      if (likeCount) {
        return { likeCount: parseInt(likeCount, 10) }
      }
    }
  } catch (error) {
    console.error('Error extracting from ytcfg:', error)
  }
  return null
}

function extractFromPlayerResponse(response: any): { likeCount?: number; channelName?: string } | null {
  try {
    const videoDetails = response?.videoDetails
    if (videoDetails) {
      const likeCount = videoDetails.likeCount
      const channelName = videoDetails.author
      
      if (likeCount) {
        return { 
          likeCount: parseInt(likeCount, 10),
          channelName 
        }
      }
    }
  } catch (error) {
    console.error('Error extracting from ytInitialPlayerResponse:', error)
  }
  return null
}

function extractLikeCountFromDOM(document: Document): number {
  try {
    console.log("🔍 Starting DOM scraping for like count...")
    
    // Method 1: Look for elements with aria-label containing "like"
    const likeElements = document.querySelectorAll('[aria-label*="like"], [aria-label*="Like"]')
    console.log(`🔍 Found ${likeElements.length} elements with like in aria-label`)
    
    for (let i = 0; i < likeElements.length; i++) {
      const element = likeElements[i]
      const ariaLabel = element.getAttribute('aria-label')
      const textContent = element.textContent?.trim()
      
      console.log(`🔍 Element ${i + 1}: aria-label="${ariaLabel}", text="${textContent}"`)
      
              if (textContent && ariaLabel && ariaLabel.toLowerCase().includes('like')) {
          // Check if the text content looks like a number (including formatted numbers like "15K")
          if (textContent.match(/^[\d.,]+[KMB]?$/)) {
            const likeCount = parseLikeCountText(textContent)
            if (likeCount > 0) {
              console.log(`✅ Found like count from DOM (aria-label): ${likeCount} (from "${textContent}")`)
              return likeCount
            }
          }
        }
    }
    
    // Method 2: Look for like buttons more broadly
    console.log("🔍 Looking for like buttons more broadly...")
    const allButtons = document.querySelectorAll('button, [role="button"]')
    console.log(`🔍 Found ${allButtons.length} potential buttons`)
    
    for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
      const button = allButtons[i]
      const ariaLabel = button.getAttribute('aria-label')
      const text = button.textContent?.trim()
      const className = button.className
      
      if (ariaLabel && ariaLabel.toLowerCase().includes('like')) {
        console.log(`🔍 Like button ${i + 1}: aria-label="${ariaLabel}", text="${text}", class="${className}"`)
        
        // Look for numbers in the button or its children
        const numberElements = button.querySelectorAll('*')
        for (const child of Array.from(numberElements)) {
          const childText = child.textContent?.trim()
          if (childText && childText.match(/^[\d.,]+[KMB]?$/)) {
            const likeCount = parseLikeCountText(childText)
            if (likeCount > 0) {
              console.log(`✅ Found like count from button child: ${likeCount} (from "${childText}")`)
              return likeCount
            }
          }
        }
      }
    }
    
    // Method 3: Look for any elements with numbers near like-related text
    console.log("🔍 Looking for numbers near like-related text...")
    const allElements = document.querySelectorAll('*')
    const potentialLikeElements = []
    
    for (const element of Array.from(allElements)) {
      const text = element.textContent?.trim()
      if (text && text.match(/^[\d.,]+[KMB]?$/) && text.length < 10) {
        // Check if this element is near like-related content
        const parent = element.parentElement
        if (parent) {
          const parentText = parent.textContent?.toLowerCase() || ''
          if (parentText.includes('like') || parentText.includes('thumb')) {
            potentialLikeElements.push({ element, text, parentText: parentText.substring(0, 50) })
          }
        }
      }
    }
    
    console.log(`🔍 Found ${potentialLikeElements.length} potential like count elements`)
    for (let i = 0; i < Math.min(potentialLikeElements.length, 5); i++) {
      const { element, text, parentText } = potentialLikeElements[i]
      console.log(`🔍 Potential like ${i + 1}: "${text}" (parent: "${parentText}")`)
      
      const likeCount = parseLikeCountText(text)
      if (likeCount > 0) {
        console.log(`✅ Found like count from nearby text: ${likeCount} (from "${text}")`)
        return likeCount
      }
    }
    
    console.log("❌ No like count found in DOM")
    return 0
  } catch (error) {
    console.error('Error extracting from DOM:', error)
    return 0
  }
}

// Parse like count text (e.g., "1.2K", "500", "1.5M")
export function parseLikeCountText(text: string): number {
  const cleanText = text.replace(/[^\w.]/g, '')

  if (cleanText.includes('K')) {
    const num = parseFloat(cleanText.replace('K', ''))
    return isNaN(num) ? 0 : Math.round(num * 1000)
  }

  if (cleanText.includes('M')) {
    const num = parseFloat(cleanText.replace('M', ''))
    return isNaN(num) ? 0 : Math.round(num * 1000000)
  }

  if (cleanText.includes('B')) {
    const num = parseFloat(cleanText.replace('B', ''))
    return isNaN(num) ? 0 : Math.round(num * 1000000000)
  }

  const number = parseInt(cleanText, 10)
  return isNaN(number) ? 0 : number
}

export function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

export function extractChannelId(url: string): string | null {
  const urlObj = new URL(url)
  const pathname = urlObj.pathname

  const patterns = [
    /^\/channel\/([^\/]+)/,
    /^\/c\/([^\/]+)/,
    /^\/@([^\/]+)/
  ]

  for (const pattern of patterns) {
    const match = pathname.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

export function extractChannelName(document: Document): string | null {
  try {
    console.log("🔍 Starting channel name extraction...")

    // Method 1: Try to get from YouTube's internal data
    const ytInitialData = (window as any).ytInitialData
    if (ytInitialData) {
      const channelName = extractChannelNameFromYtInitialData(ytInitialData)
      if (channelName) {
        console.log(`✅ Found channel name from ytInitialData: "${channelName}"`)
        return channelName
      }
    }

    // Method 2: Try to get from ytInitialPlayerResponse
    const ytInitialPlayerResponse = (window as any).ytInitialPlayerResponse
    if (ytInitialPlayerResponse) {
      const videoDetails = ytInitialPlayerResponse?.videoDetails
      if (videoDetails?.author) {
        console.log(`✅ Found channel name from ytInitialPlayerResponse: "${videoDetails.author}"`)
        return videoDetails.author
      }
    }

    // Method 3: Fallback to DOM scraping
    const selectors = [
      'ytd-video-owner-renderer yt-formatted-string a',
      'ytd-channel-name yt-formatted-string a',
      'ytd-video-owner-renderer yt-formatted-string',
      'ytd-channel-name yt-formatted-string',
      'ytd-video-owner-renderer #channel-name a',
      'ytd-video-owner-renderer #channel-name',
      '[id="owner-name"] a',
      '[id="owner-name"]'
    ]

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i]
      console.log(`🔍 Trying channel selector ${i + 1}:`, selector)

      const elements = document.querySelectorAll(selector)
      console.log(`  Found ${elements.length} elements`)

      for (const element of Array.from(elements)) {
        const text = element.textContent?.trim()
        console.log(`  Element text: "${text}"`)

        if (text && text.length > 0) {
          console.log(`✅ Found channel name from DOM: "${text}"`)
          return text
        }
      }
    }

    console.log("❌ No channel name found")
    return null
  } catch (error) {
    console.error('Error extracting channel name:', error)
    return null
  }
}

function extractChannelNameFromYtInitialData(data: any): string | null {
  try {
    const contents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents
    if (contents) {
      for (const content of contents) {
        if (content?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.title?.runs?.[0]?.text) {
          return content.videoSecondaryInfoRenderer.owner.videoOwnerRenderer.title.runs[0].text
        }
      }
    }
  } catch (error) {
    console.error('Error extracting channel name from ytInitialData:', error)
  }
  return null
}

export function calculateTotalLikes(videos: VideoData[]): number {
  return videos.reduce((total, video) => total + video.likeCount, 0)
}

export function analyzeYouTubePage(document: Document, url: string): ExtractionResult {
  try {
    console.log("🔍 Analyzing YouTube page:", url)

    const videoId = extractVideoId(url)
    if (!videoId) {
      console.log("❌ Not a video page")
      return { success: false, error: "Not a video page" }
    }

    const likeCount = extractLikeCount(document)
    const channelName = extractChannelName(document)
    const channelId = extractChannelId(url) || videoId

    console.log("📊 Analysis results:")
    console.log("  Video ID:", videoId)
    console.log("  Like count:", likeCount)
    console.log("  Channel name:", channelName)
    console.log("  Channel ID:", channelId)

    const videoData: VideoData = {
      id: videoId,
      title: document.title.replace(" - YouTube", ""),
      videoUrl: url,
      likeCount: likeCount
    }

    const channelData: ChannelData = {
      channelId: channelId,
      channelName: channelName || "Unknown Channel",
      totalLikes: likeCount,
      videoCount: 1,
      videos: [videoData],
      lastUpdated: Date.now()
    }

    return { success: true, data: channelData }
  } catch (error) {
    console.error('Error analyzing YouTube page:', error)
    return { success: false, error: error.message }
  }
}

export function mergeChannelData(existingData: ChannelData, newData: ChannelData): ChannelData {
  const videoMap = new Map(existingData.videos.map(v => [v.id, v]))

  for (const video of newData.videos) {
    videoMap.set(video.id, video)
  }

  const allVideos = Array.from(videoMap.values())

  return {
    channelId: existingData.channelId,
    channelName: newData.channelName || existingData.channelName,
    totalLikes: calculateTotalLikes(allVideos),
    videoCount: allVideos.length,
    videos: allVideos,
    lastUpdated: Date.now()
  }
} 