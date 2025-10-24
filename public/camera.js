// Camera Module - Instant capture, flip, stream management

class CameraManager {
    constructor() {
        this.videoElement = document.getElementById('camera');
        this.canvasElement = document.getElementById('canvas');
        this.ctx = this.canvasElement.hasOwnProperty('getContext') ? this.canvasElement.getContext('2d') : null;
        this.currentStream = null;
        this.facingMode = 'user'; // 'user' or 'environment'
        this.isCapturing = false;
    }

    async init() {
        try {
            await this.startCamera();
            return true;
        } catch (error) {
            console.error('Camera init failed:', error);
            alert('Camera access needed! Please allow camera permissions.');
            return false;
        }
    }

    async startCamera() {
        // Stop existing stream
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: this.facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        try {
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.currentStream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });

            return true;
        } catch (error) {
            console.error('Camera start failed:', error);
            throw error;
        }
    }

    async flipCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';

        // Toggle mirror effect
        if (this.facingMode === 'user') {
            this.videoElement.style.transform = 'scaleX(-1)';
        } else {
            this.videoElement.style.transform = 'scaleX(1)';
        }

        await this.startCamera();
    }

    async capture() {
        if (this.isCapturing) return null;

        this.isCapturing = true;

        // Set canvas size to match video
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;

        // Draw current frame
        if (this.facingMode === 'user') {
            // Mirror the image for front camera
            this.ctx.translate(this.canvasElement.width, 0);
            this.ctx.scale(-1, 1);
        }

        this.ctx.drawImage(
            this.videoElement,
            0, 0,
            this.canvasElement.width,
            this.canvasElement.height
        );

        // Reset transform
        if (this.facingMode === 'user') {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Convert to blob
        return new Promise((resolve) => {
            this.canvasElement.toBlob((blob) => {
                this.isCapturing = false;

                // Create preview URL
                const url = URL.createObjectURL(blob);

                resolve({
                    blob: blob,
                    url: url,
                    timestamp: Date.now(),
                    facingMode: this.facingMode
                });
            }, 'image/jpeg', 0.9);
        });
    }

    // Start video recording (6 seconds max)
    async startRecording() {
        if (!this.currentStream) {
            throw new Error('Camera not started');
        }

        const options = { mimeType: 'video/webm;codecs=vp9' };

        // Fallback for Safari
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }

        const mediaRecorder = new MediaRecorder(this.currentStream, options);
        const chunks = [];

        return new Promise((resolve, reject) => {
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: options.mimeType });
                const url = URL.createObjectURL(blob);

                resolve({
                    blob: blob,
                    url: url,
                    timestamp: Date.now(),
                    type: 'video',
                    duration: 6000
                });
            };

            mediaRecorder.onerror = (error) => {
                reject(error);
            };

            // Start recording
            mediaRecorder.start();

            // Auto-stop after 6 seconds
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 6000);
        });
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        this.videoElement.srcObject = null;
    }

    // Check if camera is available
    static async isAvailable() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Camera check failed:', error);
            return false;
        }
    }

    // Get list of available cameras
    static async getCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Get cameras failed:', error);
            return [];
        }
    }
}

// Export for use in app.js
window.CameraManager = CameraManager;
