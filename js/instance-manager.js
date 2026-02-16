export const InstanceManager = {
    getDomain() {
        return localStorage.getItem('kick_tube_domain') || "";
    },

    saveDomain(domain) {
        const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
        localStorage.setItem('kick_tube_domain', cleanDomain);
    },

    // ドメインが設定されているかチェック
    isConfigured() {
        const domain = this.getDomain();
        return domain !== "" && domain !== null;
    }
};
