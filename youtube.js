/**
 * youtube.js - Educationキー自動更新 & APIローテーション
 */
const YT = {
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    
    // 💡 取得した最新のEducationキーを保持する場所
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    // 💡 画像のURLから最新のキーを自動で取ってくる関数
    async refreshEduKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                console.log("Education Key Updated!");
            }
        } catch (e) {
            console.error("Key refresh failed, using backup.", e);
        }
    },

    getCurrentKeyIndex() { return parseInt(localStorage.getItem('yt_key_index')) || 0; },
    getCurrentKey() { return this.keys[this.getCurrentKeyIndex()]; },

    switchNextKey() {
        let index = this.getCurrentKeyIndex() + 1;
        if (index >= this.keys.length) {
            alert("⚠️ API切れたからチームスで切れたこと教えて！");
            return false;
        }
        localStorage.setItem('yt_key_index', index);
        return true;
    },

    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams}`);
            if (res.status === 403 && this.switchNextKey()) return this.fetchAPI(endpoint, params);
            if (!res.ok) throw new Error("API Error");
            return await res.json();
        } catch (e) { throw e; }
    },

    getEmbedUrl(id) {
        const baseUrl = `https://www.youtubeeducation.com/embed/${id}`;
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
            // 💡 常に最新の currentEduKey を使う
            embed_config: JSON.stringify({
                enc: this.currentEduKey,
                hideTitle: true
            }),
            enablejsapi: 1,
            widgetid: 1,
            forigin: "https://create.kahoot.it/learner/cb8cb5ae-d835-4c4a-bc2d-9cc78519d646/course/6fba06e3-1f76-47a8-9a4a-53c53eb86286/0",
            aoriginsup: 1
        });
        return `${baseUrl}?${params.toString()}`;
    }
};
