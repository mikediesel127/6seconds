# 6seconds

Instant moments. Addictive camera-first social app.

## Features

- **Instant Capture** - Quick camera access, snap in seconds
- **Swipe Feed** - Addictive swipe-through interface
- **Live Rooms** - Real-time connections with friends
- **Mobile First** - Built for speed on mobile devices
- **Cloudflare Workers** - Fast, global edge deployment

## Setup

### Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Wrangler CLI

### Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **Create KV Namespace**
   ```bash
   npx wrangler kv:namespace create MOMENTS
   ```
   Copy the ID and update `wrangler.toml`

4. **Create R2 Bucket**
   ```bash
   npx wrangler r2 bucket create 6seconds-media
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open on your phone**
   - Use the local network URL shown in terminal
   - Or use `wrangler dev --remote` for public URL

### Deployment

```bash
npm run deploy
```

Your app will be live on Cloudflare Workers!

## Project Structure

```
6seconds/
├── index.html      # Main app UI
├── styles.css      # Mobile-first styling
├── app.js          # Core app logic
├── camera.js       # Camera management
├── worker.js       # Cloudflare Workers backend
├── wrangler.toml   # Cloudflare config
└── package.json    # Dependencies
```

## Usage

1. **Capture** - Tap the big SNAP button to capture moments
2. **Swipe** - Swipe through other users' moments
3. **Rooms** - Join or create live rooms with friends
4. **Profile** - View your captured moments

## Tech Stack

- Pure JavaScript (no frameworks)
- Cloudflare Workers (edge computing)
- WebRTC (camera access)
- WebSockets (real-time)
- Durable Objects (rooms)
- R2 Storage (media)
- KV Storage (metadata)

## Development

The app uses vanilla JS for maximum speed. No build step required for frontend.

### Local Development

```bash
npm run dev
```

This starts Wrangler in dev mode with live reload.

### Testing on Mobile

For best experience, test on actual mobile device:

1. Start dev server with `--local-protocol=https`
2. Get your local IP address
3. Visit `https://YOUR_IP:8787` on your phone
4. Accept the self-signed certificate warning

Or use remote mode for instant public URL:

```bash
npx wrangler dev --remote
```

## Customization

- Update `API_URL` in `app.js` after deployment
- Modify colors in `styles.css` (see `:root` variables)
- Adjust camera settings in `camera.js`
- Add features in `worker.js` backend

## Performance

- Camera initializes in <500ms
- Capture to upload in <1s
- Global edge deployment = fast everywhere
- WebSocket connections for instant updates

## Privacy

- No accounts required (anonymous IDs)
- Moments stored temporarily (customize retention)
- Camera never accessed without permission
- All connections over HTTPS/WSS

## License

MIT

---

Built for speed. Built for moments. Built for connection.
