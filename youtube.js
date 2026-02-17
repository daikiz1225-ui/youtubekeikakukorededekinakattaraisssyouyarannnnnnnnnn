/**
 * youtube.js - Educationキー強制適用 & キーローテーション
 */
const YT = {
    // 💡 だいきの5つのキー
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],

    getCurrentKeyIndex() {
        return parseInt(localStorage.getItem('yt_key_index')) || 0;
    },

    getCurrentKey() {
        return this.keys[this.getCurrentKeyIndex()];
    },

    // 💡 全滅時のみTeams報告アラート
    switchNextKey() {
        let index = this.getCurrentKeyIndex() + 1;
        if (index >= this.keys.length) {
            alert("⚠️ API切れたからチームスで切れたこと教えて！");
            return false;
        }
        localStorage.setItem('yt_key_index', index);
        console.log(`Silent switch: Key #${index + 1} active.`);
        return true;
    },

    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams}`);
            
            // クォータ制限(403)時に自動切り替え
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

    // 💡 だいき指定の Kahoot経由 youtubeeducation.com 専用URL生成
    getEmbedUrl(id) {
        const baseUrl = `https://www.youtubeeducation.com/embed/${id}`;
        
        // 抽出したEducation configをそのままセット
        const embedConfig = {
            enc: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",
            hideTitle: true
        };

        const params = new URLSearchParams({
            autoplay: 1,
            mute: 0,
            controls: 1,
            start: 0,
            origin: "https://create.kahoot.it",
            playsinline: 1,
            showinfo: 0,
            rel: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            fs: 1,
            cc_load_policy: 0,
            embed_config: JSON.stringify(embedConfig),
            enablejsapi: 1,
            widgetid: 1,
            forigin: "https://create.kahoot.it/learner/cb8cb5ae-d835-4c4a-bc2d-9cc78519d646/course/6fba06e3-1f76-47a8-9a4a-53c53eb86286/0",
            aoriginsup: 1
        });

        return `${baseUrl}?${params.toString()}`;
    }
};
