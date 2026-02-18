const YT = {
    API_KEYS: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWAE",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vC"
    ],
    currentKeyIndex: 0,
    EDU_TOKEN: "",

    // Actionsから呼ばれる「キー更新」の核心
    async refreshEduKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            if (data && data.key) {
                // 生の長い文字列(==含む)をそのまま保存
                this.EDU_TOKEN = data.key;
                console.log("Edu Key Refreshed");
                return true;
            }
        } catch (e) {
            console.error("Key refresh failed, using fallback");
            // 失敗時の予備（だいきが貼ってくれたキー）
            this.EDU_TOKEN = "AXH1ezlTIv1iET739iyM40XBTC-rMyUWcQxOgfqaUQcrFTpcX9b6OFMaFtizY_gF5XcWSVzqxlKauGTacUn-KEbquLUbsJGkTUAtn-QLC0SF8NkYXoVyAphLMuUywzlVHkq7x5moacy4NzQmF-_cGm-zi26NmgkTLQ==";
        }
    },

    // 5連装APIキーを使った通信ロジック
    async fetchAPI(endpoint, params) {
        for (let i = 0; i < this.API_KEYS.length; i++) {
            const key = this.API_KEYS[this.currentKeyIndex];
            try {
                const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({...params, key})}`);
                const data = await res.json();
                
                if (data.error && data.error.code === 403) {
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.API_KEYS.length;
                    continue;
                }
                return data;
            } catch (e) {
                this.currentKeyIndex = (this.currentKeyIndex + 1) % this.API_KEYS.length;
            }
        }
    },

    // 教育用埋め込みURLの生成（生キー直結）
    getEmbedUrl(id) {
        // encodeURIComponentを使わないのがお前の環境の正解
        return `https://www.youtubeeducation.com/embed/${id}?edufilter=${this.EDU_TOKEN}`;
    }
};

// --- ここから下に、お前が貼ってくれた Storage と Actions を繋げる ---
// (Actions内の search, fetchTrending, play などはそのまま動く)

// iPad対応：Enterキーで検索（だいきのこだわり）
window.addEventListener('load', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                Actions.search(searchInput.value);
            }
        });
    }
});
