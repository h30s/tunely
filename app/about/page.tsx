import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">About Tunely</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your Room. Your Queue. Your Music Democracy.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What is Tunely?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Tunely is a real-time collaborative music app that empowers groups to listen to music together. 
              It's like Spotify Group Session meets YouTube meets democracy, built with modern web technologies.
            </p>
            <p>
              With Tunely, you can create virtual rooms where friends, family, or colleagues can join and 
              contribute to a shared music queue. Everyone can add songs from YouTube and vote on what should 
              play next, creating a truly democratic music listening experience.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">1. Create or Join a Room</h3>
              <p className="text-muted-foreground">
                Create your own room with a unique code or join an existing one. Each room has a host who controls playback.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">2. Add Songs to the Queue</h3>
              <p className="text-muted-foreground">
                Paste any YouTube URL to add songs to the shared queue. The app automatically fetches title, thumbnail, and duration.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">3. Vote for Your Favorites</h3>
              <p className="text-muted-foreground">
                Everyone in the room can upvote or downvote songs in the queue. The most popular songs rise to the top.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">4. Enjoy Synchronized Playback</h3>
              <p className="text-muted-foreground">
                The host controls playback, and everyone stays in sync. When a song ends, the next highest-voted song plays automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technology</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Tunely is built with Next.js, TypeScript, Supabase, and the YouTube API. It leverages real-time 
              database capabilities to ensure everyone's experience stays synchronized.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 