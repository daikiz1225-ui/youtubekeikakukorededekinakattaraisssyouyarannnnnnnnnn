from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import concurrent.futures

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        target_instance = 'https://inv.thepixora.com'
        
        recommended_ids = []

        if len(history) > 0:
            # 直近10件を対象にする
            target_history = history[:10]
            
            # 各動画の関連動画を取得する関数
            def fetch_related(item):
                v_id = item.get('videoId')
                if not v_id:
                    return []
                try:
                    url = f"{target_instance}/api/v1/videos/{v_id}"
                    # 1.5秒でタイムアウト設定
                    with urllib.request.urlopen(url, timeout=1.5) as response:
                        res_data = json.loads(response.read().decode())
                        related = res_data.get('relatedVideos', [])
                        # 上位2件のIDを抽出
                        return [v.get('videoId') for v in related[:2] if v.get('videoId')]
                except:
                    return []

            # ThreadPoolExecutorを使って並列（同時）にAPIを叩く
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                results = list(executor.map(fetch_related, target_history))
            
            # リストを平坦化して重複を削除
            flat_list = [v_id for sublist in results for v_id in sublist]
            recommended_ids = list(dict.fromkeys(flat_list)) # 順番を維持したまま重複削除

        # レスポンス送信
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # app.jsが期待する形式（IDの配列）を返す
        self.wfile.write(json.dumps(recommended_ids).encode())

    # OPTIONSメソッド（CORS対応）も追加しておくと安心
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
