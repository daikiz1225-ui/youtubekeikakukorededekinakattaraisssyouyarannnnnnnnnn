/**
 * api/m3u8.js
 * YouTubeの動画IDから、制限回避用のm3u8(HLS)ストリームURLを抽出するモジュール
 */

const M3U8_API = {
    // アイフィルターに強いPipedインスタンスのリスト
    // 一つがダメでも次を試す「冗長構成」にしています
    instances: [
        "https://pipedapi.kavin.rocks",
        "https://api.piped.victr.me",
        "https://piped-api.garudalinux.org",
        "https://api.piped.projectsegfau.lt",
        "https://pa.il.ax"
    ],

    /**
     * 指定した動画IDのm3u8 URLを取得する
     * @param {string} videoId - YouTubeの動画ID
     * @returns {Promise<string>} m3u8のURL
     */
    async getLiveStreamUrl(videoId) {
        let lastError = null;

        for (let instance of this.instances) {
            try {
                console.log(`[M3U8_API] Trying instance: ${instance}`);
                
                // タイムアウト付きのフェッチ（10秒で諦めて次へ）
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(`${instance}/streams/${videoId}`, {
                    method: 'GET',
                    headers: { 
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    console.warn(`[M3U8_API] ${instance} returned status: ${response.status}`);
                    continue;
                }

                const data = await response.json();
                
                // ライブ配信用のHLS URLをチェック
                if (data.hls) {
                    console.log(`[M3U8_API] Success! Found HLS URL from ${instance}`);
                    return data.hls;
                }
                
                // 通常動画用のHLS URLをチェック（予備）
                if (data.hlsUrl) {
                    console.log(`[M3U8_API] Success! Found HLS URL (fallback) from ${instance}`);
                    return data.hlsUrl;
                }

                console.warn(`[M3U8_API] No HLS stream found in response from ${instance}`);
                
            } catch (error) {
                lastError = error;
                console.error(`[M3U8_API] Error with ${instance}:`, error.message);
            }
        }

        throw new Error(lastError ? `ストリーム取得失敗: ${lastError.message}` : "有効なストリームが見つかりませんでした。");
    }
};

// 他のスクリプトから呼び出せるように公開（またはグローバルに配置）
window.M3U8_API = M3U8_API;
