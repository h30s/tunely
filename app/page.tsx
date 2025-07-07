import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await auth();
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Your Room. Your Queue. <span className="text-primary">Your Music Democracy.</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-10">
          Tunely empowers groups to listen to music together in real time, where every participant has a voice.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {session ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/login">Get Started</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </section>

      {/* Features section */}
      <section className="bg-muted py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">How Tunely Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-background p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
              <h3 className="font-bold text-xl mb-2">Create a Room</h3>
              <p className="text-muted-foreground">Generate a secure room code and invite friends to join your music session.</p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
              <h3 className="font-bold text-xl mb-2">Add Songs</h3>
              <p className="text-muted-foreground">Paste any YouTube URL to add songs to the shared queue.</p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
              <h3 className="font-bold text-xl mb-2">Vote Together</h3>
              <p className="text-muted-foreground">Everyone votes on songs in the queue. The most popular rise to the top.</p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mb-4">4</div>
              <h3 className="font-bold text-xl mb-2">Listen in Sync</h3>
              <p className="text-muted-foreground">Enjoy synchronized playback across all devices in the room.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 px-6 text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Your Music Democracy?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join Tunely today and experience the future of social music listening.
          </p>
          {session ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/login">Sign In with Google</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
