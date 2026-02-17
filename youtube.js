const YT = {
    KEY: "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
    ENC: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw%3D%3D",
    
    // 教育用プレイヤーURLを生成
    getEmbedUrl(id) {
        return `https://www.youtubeeducation.com/embed/${id}?autoplay=1&origin=https%3A%2F%2Fcreate.kahoot.it&enablejsapi=1&embed_config=%7B%22enc%22%3A%22${this.ENC}%22%2C%22hideTitle%22%3Atrue%7D`;
    },

    // 共通のAPI取得関数
    async fetchAPI(endpoint, params = {}) {
        const query = new URLSearchParams({ ...params, key: this.KEY }).toString();
        const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);
        return await res.json();
    }
};
