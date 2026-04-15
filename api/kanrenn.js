export const config = { runtime: 'edge' };

export default async function handler(req) {
    // テスト用に強制的に指定のID（と適当な関連動画ID）を返す
    const testIds = [";
    
    return new Response(JSON.stringify(testIds), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
        }
    });
}
