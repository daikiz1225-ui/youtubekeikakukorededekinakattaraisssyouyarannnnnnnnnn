from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import concurrent.futures

class handler(BaseHTTPRequestHandler):
    def fetch_related_ids(self, video_id):
        """Invidious APIから関連動画の上位2件を取得"""
        # インスタンスは kanrenn.js と合わせています
        url = f'https://inv.thepixora.com/api/v1/videos/{video_id}'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as response:
                data = json.loads(response.read().decode())
                # relatedVideos または recommendedVideos から取得
                related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                return [v['videoId'] for v in related[:2] if 'videoId' in v]
        except:
            return []

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        # 履歴から最新10件のIDを抽出
        history_ids = [item.get('id') for item in history[:10] if item.get('id')]
        
        recommended_ids = []
        if history_ids:
            # 5スレッド並列で取得
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(self.fetch_related_ids, history_ids))
            
            for ids in results:
                recommended_ids.extend(ids)
            
            # 重複を削除して順序を維持
            recommended_ids = list(dict.fromkeys(recommended_ids))

        # IDリスト形式でレスポンス
        res_body = {
            "type": "id_list",
            "ids": recommended_ids[:20],
            "explanation": "あなたの視聴履歴に基づいた関連動画を抽出しました"
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
