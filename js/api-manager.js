/**
 * Pipedのインスタンスドメインを管理する（1ファイル1機能）
 */
export const InstanceManager = {
    // 保存されているドメインを取得
    getDomain() {
        // 初期値として有名なインスタンスをセットしておくと親切
        return localStorage.getItem('kick_tube_domain') || "pipedapi.kavin.rocks";
    },

    // ドメインを保存
    saveDomain(domain) {
        // 末尾に / がついてたら消す（エラー防止）
        const cleanDomain = domain.replace(/\/$/, "");
        localStorage.setItem('kick_tube_domain', cleanDomain);
    }
};
