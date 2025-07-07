/**
 * YouTube API utility functions
 */

// Extract YouTube video ID from various URL formats
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Pattern for various YouTube URL formats
  const patterns = [
    // Standard watch URL (https://www.youtube.com/watch?v=VIDEO_ID)
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\?\/]+)/,
    // Shortened URL (https://youtu.be/VIDEO_ID)
    /youtu\.be\/([^&\?\/]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Fetch video details from YouTube API
export async function fetchVideoDetails(videoId: string) {
  try {
    console.log("Fetching video details for ID:", videoId);
    
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    
    if (!API_KEY) {
      console.error('YouTube API key not found');
      throw new Error('YouTube API key not found');
    }
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch video details');
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }
    
    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    
    // Parse ISO 8601 duration to seconds
    const duration = parseDuration(contentDetails.duration);
    
    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      thumbnailUrl: snippet.thumbnails.high.url,
      duration
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    
    // Fallback to mock data if API fails (for development purposes)
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock data for development');
      
      // Generate a consistent title based on the video ID
      const titleIndex = videoId.charCodeAt(0) % sampleTitles.length;
      const title = `${sampleTitles[titleIndex]} (${videoId})`;
      
      // Generate a random duration between 3 and 6 minutes
      const duration = Math.floor(Math.random() * (360 - 180 + 1)) + 180;
      
      return {
        videoId,
        title,
        description: `This is a video with ID: ${videoId}`,
        channelTitle: 'Music Channel',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration
      };
    }
    
    return null;
  }
}

// Sample video titles for mock data
const sampleTitles = [
  "Top 10 Songs of 2023",
  "Best Music Videos Ever",
  "Official Music Video - Artist Name",
  "Live Concert Performance",
  "Acoustic Cover - Popular Song",
  "Music Festival Highlights",
  "New Release - Hit Single",
  "Classic Rock Compilation",
  "Indie Artist Showcase",
  "Electronic Dance Mix"
];

// Parse ISO 8601 duration format
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) {
    return 0;
  }
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}