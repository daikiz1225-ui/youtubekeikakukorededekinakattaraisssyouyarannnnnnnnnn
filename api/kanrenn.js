export const config = { runtime: 'edge' };

export default async function handler(req) {
    // テスト用に強制的に指定のID（と適当な関連動画ID）を返す
    const testIds = ["4cvXaWyORr8", "dQw4w9WgXcQ", "9bZkp7q19f0"];
    
    return new Response(JSON.stringify(testIds), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
        }
    });
}
