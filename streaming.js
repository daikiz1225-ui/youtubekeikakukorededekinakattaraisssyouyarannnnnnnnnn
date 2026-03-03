/* streaming.js - HLS(m3u8) プレイヤーエンジン */
const M3U8Player = {
    hls: null,
    videoElement: null,

    // ストリーミング表示用のHTMLを生成
    renderPlayer(container) {
        container.innerHTML = `
            <div id="hls-container" style="width:100%; aspect-ratio:16/9; background:#000; border-radius:15px; overflow:hidden; position:relative;">
                <video id="hls-video" controls style="width:100%; height:100%; display:block;"></video>
                <div style="position:absolute; bottom:50px; left:0; right:0; padding:10px; background:rgba(0,0,0,0.7); display:flex; gap:10px;">
                    <input type="text" id="stream-url-input" placeholder="m3u8のURLを入力..." 
                           style="flex:1; padding:8px; border-radius:5px; border:none; background:#333; color:#fff; font-size:12px;">
                    <button class="btn" onclick="M3U8Player.loadNewSource()" style="background:#ff4b4b; padding:5px 15px;">再生</button>
                </div>
            </div>
        `;
        this.videoElement = document.getElementById('hls-video');
    },

    loadSource(url) {
        if (!url) return;
        if (this.hls) this.hls.destroy();

        if (Hls.isSupported()) {
            this.hls = new Hls();
            this.hls.loadSource(url);
            this.hls.attachMedia(this.videoElement);
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => this.videoElement.play());
        } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            this.videoElement.src = url;
            this.videoElement.play();
        }
    },

    loadNewSource() {
        const url = document.getElementById('stream-url-input').value;
        this.loadSource(url);
    },

    stop() {
        if (this.hls) this.hls.destroy();
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = "";
        }
    }
};
