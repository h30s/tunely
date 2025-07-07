# Tunely - Real-Time Collaborative Music App

> Your Room. Your Queue. Your Music Democracy.

Tunely is a real-time collaborative music application that empowers groups to listen to music together. Think of it as Spotify Group Session meets YouTube meets democracy, built with modern web technologies.

## Features

- **Google Authentication**: Secure sign-in with Google OAuth
- **Room Creation & Management**: Create rooms with unique codes and invite friends
- **YouTube Integration**: Add any YouTube video to the shared queue
- **Democratic Voting**: Vote songs up or down to determine what plays next
- **Synchronized Playback**: Host controls playback while everyone stays in sync
- **Real-Time Updates**: Everything updates instantly across all devices

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components)
- **Language**: TypeScript with strict typing
- **Authentication**: NextAuth.js v5 + Google OAuth
- **Database**: Supabase (Postgres + Realtime + Edge Functions)
- **Styling**: Tailwind CSS + shadcn/ui
- **YouTube API**: YouTube Data API v3 + YouTube Player API
- **Hosting**: Vercel (Optimized for Edge performance)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Authentication (Google OAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# YouTube API
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google OAuth credentials
- YouTube   API key

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

- `/app`: Next.js app router pages and layouts
- `/components`: React components organized by feature
- `/lib`: Utility functions and type definitions
  - `/supabase`: Supabase client configuration
  - `/youtube`: YouTube API utilities
  - `/types`: TypeScript type definitions

## Usage Flow

1. **Sign In**: Users sign in with Google
2. **Create or Join**: Create a new room or join with a 6-character code
3. **Add Songs**: Paste YouTube URLs to add songs to the queue
4. **Vote**: Everyone votes on songs to determine the play order
5. **Listen Together**: Host controls playback while everyone stays in sync

## License

This project is licensed under the MIT License.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [YouTube API](https://developers.google.com/youtube/v3)

## Database Setup

1. Create a Supabase project
2. Run the SQL queries in `schema.sql` to set up the database schema
3. Enable real-time functionality for the required tables

## Troubleshooting

If you encounter issues:

1. Make sure all environment variables are correctly set
2. Check that the Supabase real-time functionality is enabled
3. Verify that your YouTube API key has the necessary permissions
4. Clear your browser cache and cookies if authentication issues occur

## Contact

For any inquiries or support, please reach out to:

- **Email**: [h30s.soni@gmail.com](mailto:h30s.soni@gmail.com)
- **LinkedIn**: [Himanshu Soni](https://linkedin.com/in/himanshu-soni)
- **Portfolio**: [thecodeofh30s.vercel.app](https://thecodeofh30s.vercel.app/)

---

Built with ❤️ by Himanshu Soni — aka h30s
