/* app.js に追加・上書きするプロフェッショナル・コード */

// --- 再生エンジン: M3U8/HLS プレイヤー ---
const M3U8_PLAYER = {
    hlsInstance: null,

    async initAndPlay(videoId, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div style="position:relative; width:100%; height:100%; background:#000;">
                <video id="hls-video" controls autoplay playsinline style="width:100%; height:100%;"></video>
                <div id="hls-status" style="position:absolute; top:10px; left:10px; color:#fff; background:rgba(0,0,0,0.5); padding:5px; font-size:12px; pointer-events:none;">HLS Loading...</div>
            </div>
        `;
        
        const video = document.getElementById('hls-video');
        const status = document.getElementById('hls-status');

        try {
            // api/m3u8.js を利用してストリームURLを取得
            const streamUrl = await M3U8_API.getLiveStreamUrl(videoId);
            
            if (Hls.isSupported()) {
                if (this.hlsInstance) this.hlsInstance.destroy();
                this.hlsInstance = new Hls();
                this.hlsInstance.loadSource(streamUrl);
                this.hlsInstance.attachMedia(video);
                this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    status.innerText = "🔴 LIVE (HLS Mode)";
                    video.play();
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari用
                video.src = streamUrl;
                video.addEventListener('loadedmetadata', () => {
                    status.innerText = "🔴 LIVE (Native Mode)";
                    video.play();
                });
            }
        } catch (err) {
            status.style.color = "red";
            status.innerText = "Error: " + err.message;
            console.error(err);
        }
    }
};

// --- Actions.play の修正案 (既存の Actions.play をこれに差し替えてください) ---
Actions.play = async function(video) {
    const vId = typeof video === 'string' ? video : (video.id.videoId || video.id);
    const container = document.getElementById('view-container');
    
    // 1. まず再生画面の枠組みを作る
    container.innerHTML = `
        <div class="player-wrapper">
            <div id="video-display-area" style="width:100%; aspect-ratio:16/9; background:#000;"></div>
            <div class="video-info-overlay">
                <div class="play-modes" style="margin: 10px 0; display: flex; gap: 5px;">
                    <button onclick="Actions.switchMode('${vId}', 'edu')" style="background:#cc0000; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Edu</button>
                    <button onclick="Actions.switchMode('${vId}', 'direct')" style="background:#444; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Direct</button>
                    <button onclick="Actions.switchMode('${vId}', 'm3u8')" style="background:#0055ff; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Live (HLS)</button>
                </div>
            </div>
        </div>
    `;

    // 2. デフォルトの再生モード（まずはEducationで試みる）
    this.switchMode(vId, 'edu');
    
    // 3. 履歴保存などの既存処理
    if (!isIncognito) {
        let history = JSON.parse(localStorage.getItem('yt_history') || '[]');
        history = history.filter(item => (item.id.videoId || item.id) !== vId);
        history.unshift(video);
        localStorage.setItem('yt_history', JSON.stringify(history.slice(0, 50)));
    }
};

// --- モード切替関数 ---
Actions.switchMode = function(vId, mode) {
    const displayArea = document.getElementById('video-display-area');
    displayArea.innerHTML = ''; // クリア

    if (mode === 'edu') {
        displayArea.innerHTML = `<iframe src="${YT.getEmbedUrl(vId)}" frameborder="0" allowfullscreen style="width:100%; height:100%;"></iframe>`;
    } else if (mode === 'direct') {
        // あなたが実装した既存のストリーミング再生処理をここに
        displayArea.innerHTML = `<video src="YOUR_DIRECT_STREAM_LOGIC_HERE" controls style="width:100%; height:100%;"></video>`;
    } else if (mode === 'm3u8') {
        M3U8_PLAYER.initAndPlay(vId, 'video-display-area');
    }
};
