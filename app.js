// 6seconds - Main App Logic

const API_URL = window.location.origin;

class App {
    constructor() {
        this.camera = null;
        this.ws = null;
        this.userId = this.getUserId();
        this.username = localStorage.getItem('username') || `user${Math.floor(Math.random() * 9999)}`;
        this.currentScreen = 'loading';
        this.myMoments = JSON.parse(localStorage.getItem('moments') || '[]');
        this.currentRoom = null;

        // Swipe state
        this.currentCard = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
    }

    async init() {
        console.log('6seconds initializing...');

        // Initialize camera
        this.camera = new CameraManager();

        // Setup event listeners
        this.setupEventListeners();

        // Wait a bit for loading screen
        setTimeout(async () => {
            const cameraReady = await this.camera.init();

            if (cameraReady) {
                this.switchScreen('capture');
                // this.connectWebSocket();
            } else {
                alert('Camera required for 6seconds!');
            }
        }, 1500);

        // Set username
        document.getElementById('username').value = this.username;
    }

    setupEventListeners() {
        // Capture button
        document.getElementById('captureBtn').addEventListener('click', () => this.captureNow());

        // Flip camera
        document.getElementById('flipCamera').addEventListener('click', () => this.camera.flipCamera());

        // Navigation
        document.getElementById('goCapture')?.addEventListener('click', () => this.switchScreen('capture'));
        document.getElementById('goRooms')?.addEventListener('click', () => this.switchScreen('rooms'));
        document.getElementById('goProfile')?.addEventListener('click', () => this.switchScreen('profile'));
        document.getElementById('roomsBtn')?.addEventListener('click', () => this.switchScreen('rooms'));

        // Rooms
        document.getElementById('createRoom')?.addEventListener('click', () => this.createRoom());
        document.getElementById('leaveRoom')?.addEventListener('click', () => this.leaveRoom());

        // Username
        document.getElementById('username')?.addEventListener('change', (e) => {
            this.username = e.target.value;
            localStorage.setItem('username', this.username);
        });

        // Swipe gestures
        const swipeContainer = document.getElementById('swipeContainer');
        swipeContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        swipeContainer.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        swipeContainer.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Mouse events for desktop testing
        swipeContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        swipeContainer.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        swipeContainer.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    switchScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        document.getElementById(screenName).classList.add('active');
        this.currentScreen = screenName;

        // Screen-specific actions
        if (screenName === 'feed') {
            this.loadFeed();
        } else if (screenName === 'rooms') {
            this.loadRooms();
        } else if (screenName === 'profile') {
            this.loadMyMoments();
        }
    }

    async captureNow() {
        const captureBtn = document.getElementById('captureBtn');
        captureBtn.style.transform = 'scale(0.8)';

        const moment = await this.camera.capture();

        if (moment) {
            // Add to my moments
            this.myMoments.unshift(moment);
            localStorage.setItem('moments', JSON.stringify(this.myMoments.slice(0, 50))); // Keep last 50

            // Upload to server
            await this.uploadMoment(moment);

            // Show feedback
            this.showToast('Moment captured!');

            // Switch to feed
            setTimeout(() => {
                this.switchScreen('feed');
            }, 300);
        }

        captureBtn.style.transform = 'scale(1)';
    }

    async uploadMoment(moment) {
        const formData = new FormData();
        formData.append('image', moment.blob);
        formData.append('userId', this.userId);
        formData.append('username', this.username);
        formData.append('timestamp', moment.timestamp);

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('Upload success:', data);
            return data;
        } catch (error) {
            console.error('Upload failed:', error);
            return null;
        }
    }

    async loadFeed() {
        try {
            const response = await fetch(`${API_URL}/feed?userId=${this.userId}`);
            const moments = await response.json();

            const swipeContainer = document.getElementById('swipeContainer');
            swipeContainer.innerHTML = '';

            moments.forEach((moment, index) => {
                const card = this.createSwipeCard(moment, index);
                swipeContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Load feed failed:', error);
        }
    }

    createSwipeCard(moment, index) {
        const card = document.createElement('div');
        card.className = 'swipe-card';
        card.style.zIndex = 1000 - index;

        card.innerHTML = `
            <img src="${moment.url}" alt="Moment">
            <div class="card-info">
                <h3>${moment.username}</h3>
                <p>${this.timeAgo(moment.timestamp)}</p>
            </div>
        `;

        return card;
    }

    // Swipe gesture handlers
    handleTouchStart(e) {
        this.isDragging = true;
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - this.startX;
        const deltaY = currentY - this.startY;

        const card = document.querySelector('.swipe-card');
        if (card) {
            const rotation = deltaX / 20;
            card.style.transform = `translate(-50%, -50%) translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
            card.classList.add('dragging');
        }
    }

    handleTouchEnd(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        const card = document.querySelector('.swipe-card');

        if (card) {
            const rect = card.getBoundingClientRect();
            const centerX = window.innerWidth / 2;
            const deltaX = rect.left - centerX;

            if (Math.abs(deltaX) > 100) {
                // Swipe away
                const direction = deltaX > 0 ? 1 : -1;
                card.style.transform = `translate(-50%, -50%) translateX(${direction * 1000}px) rotate(${direction * 45}deg)`;
                card.style.opacity = '0';

                setTimeout(() => {
                    card.remove();
                }, 300);
            } else {
                // Return to center
                card.style.transform = 'translate(-50%, -50%)';
                card.classList.remove('dragging');
            }
        }
    }

    // Mouse handlers (for desktop)
    handleMouseDown(e) {
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        const card = document.querySelector('.swipe-card');
        if (card) {
            const rotation = deltaX / 20;
            card.style.transform = `translate(-50%, -50%) translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
            card.classList.add('dragging');
        }
    }

    handleMouseUp(e) {
        this.handleTouchEnd(e);
    }

    // Rooms
    async loadRooms() {
        try {
            const response = await fetch(`${API_URL}/rooms`);
            const rooms = await response.json();

            const roomsList = document.getElementById('roomsList');
            roomsList.innerHTML = '';

            rooms.forEach(room => {
                const roomCard = document.createElement('div');
                roomCard.className = 'room-card';
                roomCard.innerHTML = `
                    <h3>${room.name}</h3>
                    <div class="room-meta">
                        <span>${room.members} members</span>
                        <span>${room.live ? 'LIVE' : 'Active'}</span>
                    </div>
                `;
                roomCard.addEventListener('click', () => this.joinRoom(room.id));
                roomsList.appendChild(roomCard);
            });
        } catch (error) {
            console.error('Load rooms failed:', error);
        }
    }

    async createRoom() {
        const name = prompt('Room name:');
        if (!name) return;

        try {
            const response = await fetch(`${API_URL}/rooms/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    userId: this.userId,
                    username: this.username
                })
            });

            const room = await response.json();
            this.joinRoom(room.id);
        } catch (error) {
            console.error('Create room failed:', error);
        }
    }

    async joinRoom(roomId) {
        this.currentRoom = roomId;

        // Show room view
        document.getElementById('roomsList').style.display = 'none';
        document.getElementById('activeRoom').style.display = 'block';

        // Send join via WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'join_room',
                roomId,
                userId: this.userId,
                username: this.username
            }));
        }
    }

    leaveRoom() {
        if (this.currentRoom && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'leave_room',
                roomId: this.currentRoom,
                userId: this.userId
            }));
        }

        this.currentRoom = null;
        document.getElementById('roomsList').style.display = 'block';
        document.getElementById('activeRoom').style.display = 'none';
    }

    loadMyMoments() {
        const momentsGrid = document.getElementById('myMoments');
        momentsGrid.innerHTML = '';

        this.myMoments.forEach(moment => {
            const item = document.createElement('div');
            item.className = 'moment-item';
            item.innerHTML = `<img src="${moment.url}" alt="Moment">`;
            momentsGrid.appendChild(item);
        });
    }

    // WebSocket connection
    connectWebSocket() {
        // Note: Update with your Worker WebSocket URL
        const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

        try {
            this.ws = new WebSocket(`${wsUrl}/ws`);

            this.ws.onopen = () => {
                console.log('WebSocket connected');

                // Send init message
                this.ws.send(JSON.stringify({
                    type: 'init',
                    userId: this.userId,
                    username: this.username
                }));
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket closed, reconnecting...');
                setTimeout(() => this.connectWebSocket(), 3000);
            };
        } catch (error) {
            console.error('WebSocket connection failed:', error);
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'live_count':
                document.getElementById('liveCount').textContent = data.count;
                break;

            case 'new_moment':
                // Someone posted a new moment
                this.showToast(`${data.username} posted a moment!`);
                break;

            case 'room_update':
                // Room member count updated
                if (this.currentRoom === data.roomId) {
                    document.getElementById('roomCount').textContent = `${data.members} members`;
                }
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    }

    // Utilities
    getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            z-index: 10000;
            animation: fadeInOut 2s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2000);
    }
}

// Add fade in/out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        10% { opacity: 1; transform: translateX(-50%) translateY(0); }
        90% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
        window.app.init();
    });
} else {
    window.app = new App();
    window.app.init();
}
