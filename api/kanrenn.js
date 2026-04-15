from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import concurrent.futures

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. リクエストボディの読み込み
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # app.jsから届く履歴（IDのリスト）
        history = data.get('history', [])
        target_instance = 'https://inv.thepixora.com'
        
        recommended_ids = []

        if len(history) > 0:
            # 最新10件を対象にする
            target_history = history[:10]
            
            # 各動画の関連動画IDを取得する関数
            def fetch_related_ids(item):
                # app.jsの履歴形式に合わせてIDを取得
                v_id = item.get('id') or item.get('videoId')
                if not v_id:
                    return []
                try:
                    # Invidious API 呼び出し
                    url = f"{target_instance}/api/v1/videos/{v_id}"
                    # 1.5秒でタイムアウト設定（回転を速くする）
                    with urllib.request.urlopen(url, timeout=1.5) as response:
                        res_data = json.loads(response.read().decode())
                        related = res_data.get('relatedVideos', [])
                        # 上位2件のvideoIdを抽出
                        return [v.get('videoId') for v in related[:2] if v.get('videoId')]
                except:
                    return []

            # ThreadPoolExecutorを使って10件並列で一斉にAPIを叩く
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                results = list(executor.map(fetch_related_ids, target_history))
            
            # 2次元リストを1次元にまとめつつ、重複を削除（順序維持）
            seen = set()
            for sublist in results:
                for v_id in sublist:
                    if v_id not in seen:
                        recommended_ids.append(v_id)
                        seen.add(v_id)

        # 2. レスポンス送信
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*') # CORS対応
        self.end_headers()
        
        # 純粋なIDの配列 JSON [ "id1", "id2", ... ] を返す
        self.wfile.write(json.dumps(recommended_ids).encode())

    # Vercel等の環境でのCORSプリフライトリクエスト対応
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
