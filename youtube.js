/**
 * youtube.js - APIキー管理 & 通信担当（完全版）
 */

const YT = {
    // 💡 【ここを編集！】集めたキーをここに入れてくれ
    // 1人2個、8人で16個。ここにズラッと並べるだけでOKだぜ！
    keys: [
        "YOUR_API_KEY_01",
        "YOUR_API_KEY_02",
        "YOUR_API_KEY_03",
        "YOUR_API_KEY_04",
        "YOUR_API_KEY_05",
        "YOUR_API_KEY_06",
        "YOUR_API_KEY_07",
        "YOUR_API_KEY_08",
        "YOUR_API_KEY_09",
        "YOUR_API_KEY_10",
        "YOUR_API_KEY_11",
        "YOUR_API_KEY_12",
        "YOUR_API_KEY_13",
        "YOUR_API_KEY_14",
        "YOUR_API_KEY_15",
        "YOUR_API_KEY_16"
    ],

    // 現在使っているキーの番号を保存
    getCurrentKeyIndex() {
        return parseInt(localStorage.getItem('yt_key_index')) || 0;
    },

    getCurrentKey() {
        return this.keys[this.getCurrentKeyIndex()];
    },

    // 💡 切り替えは裏でこっそり。全滅時だけチームス報告。
    switchNextKey() {
        let index = this.getCurrentKeyIndex();
        index++;
        
        if (index >= this.keys.length) {
            // 全滅時のメッセージ
            alert("⚠️ API切れたからチームスで切れたこと教えて！");
            return false;
        }
        
        localStorage.setItem('yt_key_index', index);
        console.log(`Silent switch: Key ${index + 1} is now active.`);
        return true;
    },

    /**
     * APIを叩く共通関数
     * @param {string} endpoint - 'search', 'playlists' など
     * @param {object} params - APIパラメータ
     */
    async fetchAPI(endpoint, params) {
        const baseUrl = `https://www.googleapis.com/youtube/v3/${endpoint}`;
        
        const queryParams = new URLSearchParams({
            ...params,
            key: this.getCurrentKey()
        });

        try {
            const res = await fetch(`${baseUrl}?${queryParams}`);
            
            // 403 (制限超え) の場合は自動切り替え
            if (res.status === 403) {
                if (this.switchNextKey()) {
                    return this.fetchAPI(endpoint, params); // 次のキーでリトライ
                } else {
                    throw new Error("ALL_KEYS_EXHAUSTED");
                }
            }

            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (e) {
            throw e;
        }
    },

    // 埋め込み用URL生成
    getEmbedUrl(id) {
        return `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
    }
};
