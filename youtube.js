/**
 * youtube.js - Educationキー自動収集 & API管理
 */
const YT = {
    // データ取得用APIキー（だいきの5つ）
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    
    // 写真から抜いた最新キー（サイトから取れなかった時のバックアップ）
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    // 💡 サイトから最新キーを自動で取ってくる「ハンター」
    async refreshEduKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                console.log("Education Key Synced.");
            }
        } catch (e) {
            console.error("Using backup key.", e);
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

    // 💡 教育用ドメイン + 収集した最新キーでURL作成（昨日の安定版構成）
    getEmbedUrl(id) {
        const baseUrl = `https://www.youtubeeducation.com/embed/${id}`;
        const params = new URLSearchParams({
            autoplay: 1,
            origin: "https://create.kahoot.it",
            embed_config: JSON.stringify({
                enc: this.currentEduKey,
                hideTitle: true
            }),
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1
        });
        return `${baseUrl}?${params.toString()}`;
    }
};
