/**
 * youtube.js - APIキー管理 & 通信担当（だいきのキー実装版）
 */

const YT = {
    // 💡 だいきが送ってくれた5つのキーをセットしたぜ！
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", // 1番目
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", // 2番目
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", // 3番目
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", // 4番目
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"  // 5番目
        // 6番目以降が必要になったら、ここにカンマ区切りで追加していってくれ
    ],

    getCurrentKeyIndex() {
        return parseInt(localStorage.getItem('yt_key_index')) || 0;
    },

    getCurrentKey() {
        return this.keys[this.getCurrentKeyIndex()];
    },

    // 💡 切り替えはサイレント。全滅時のみアラート。
    switchNextKey() {
        let index = this.getCurrentKeyIndex();
        index++;
        
        if (index >= this.keys.length) {
            // だいきの指定メッセージ
            alert("⚠️ API切れたからチームスで切れたこと教えて！");
            return false;
        }
        
        localStorage.setItem('yt_key_index', index);
        console.log(`Silent switch: Using Key #${index + 1}`);
        return true;
    },

    async fetchAPI(endpoint, params) {
        const baseUrl = `https://www.googleapis.com/youtube/v3/${endpoint}`;
        const queryParams = new URLSearchParams({
            ...params,
            key: this.getCurrentKey()
        });

        try {
            const res = await fetch(`${baseUrl}?${queryParams}`);
            
            // 制限エラー (403) が出たら即座に次のキーでリトライ
            if (res.status === 403) {
                if (this.switchNextKey()) {
                    return this.fetchAPI(endpoint, params);
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

    getEmbedUrl(id) {
        return `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
    }
};
