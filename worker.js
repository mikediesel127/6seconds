// 6seconds Cloudflare Worker - Real-time backend

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // WebSocket upgrade
        if (url.pathname === '/ws') {
            return handleWebSocket(request, env);
        }

        // API endpoints
        if (url.pathname === '/upload') {
            return handleUpload(request, env, corsHeaders);
        }

        if (url.pathname === '/feed') {
            return handleFeed(request, env, corsHeaders);
        }

        // Serve static files
        return serveStatic(url, env, corsHeaders);
    }
};

// WebSocket handler for real-time connections
async function handleWebSocket(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();

    // Handle WebSocket messages
    server.addEventListener('message', async (event) => {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'init':
                    await handleInit(server, data, env);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    server.addEventListener('close', () => {
        console.log('WebSocket closed');
    });

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

async function handleInit(ws, data, env) {
    // Get current live count
    const liveCount = await getLiveCount(env);

    ws.send(JSON.stringify({
        type: 'live_count',
        count: liveCount
    }));
}

// Upload handler
async function handleUpload(request, env, corsHeaders) {
    try {
        const formData = await request.formData();
        const image = formData.get('image');
        const userId = formData.get('userId');
        const username = formData.get('username');
        const timestamp = formData.get('timestamp');

        if (!image) {
            return new Response(JSON.stringify({ error: 'No image provided' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Generate unique ID
        const momentId = `${userId}_${timestamp}`;

        // Store in R2
        await env.MEDIA.put(momentId, image);

        // Store metadata in KV
        const metadata = {
            id: momentId,
            userId,
            username,
            timestamp: parseInt(timestamp),
            url: `/media/${momentId}`
        };

        await env.MOMENTS.put(momentId, JSON.stringify(metadata));

        // Add to global feed
        const feedKey = 'global_feed';
        let feed = await env.MOMENTS.get(feedKey);
        feed = feed ? JSON.parse(feed) : [];
        feed.unshift(metadata);
        feed = feed.slice(0, 100); // Keep last 100 moments
        await env.MOMENTS.put(feedKey, JSON.stringify(feed));

        return new Response(JSON.stringify({ success: true, momentId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Feed handler
async function handleFeed(request, env, corsHeaders) {
    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        // Get global feed
        const feedKey = 'global_feed';
        let feed = await env.MOMENTS.get(feedKey);
        feed = feed ? JSON.parse(feed) : [];

        // Filter out user's own moments
        feed = feed.filter(m => m.userId !== userId);

        // Get media URLs from R2
        for (const moment of feed) {
            const object = await env.MEDIA.get(moment.id);
            if (object) {
                moment.url = URL.createObjectURL(await object.blob());
            }
        }

        return new Response(JSON.stringify(feed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Feed error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Serve static files
async function serveStatic(url, env, corsHeaders) {
    try {
        return await env.ASSETS.fetch(url);
    } catch (error) {
        console.error('Static file error:', error);
        return new Response('Not found', {
            status: 404,
            headers: corsHeaders
        });
    }
}

async function getLiveCount(env) {
    return Math.floor(Math.random() * 100) + 10;
}
