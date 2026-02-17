// 他のファイルからも見えるように関数を定義
window.fetchVideos = async function(query) {
    const domain = window.CONFIG.PIPED_DOMAIN;
    const url = `https://${domain}/api/v1/search?q=${encodeURIComponent(query)}&filter=videos`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("通信失敗");
    const data = await response.json();
    
    return data.items.map(item => ({
        id: item.url.split('v=')[1],
        title: item.title
    }));
};
