from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import time

class handler(BaseHTTPRequestHandler):
    def fetch_related_ids(self, video_id):
        """1件のリクエストを実行"""
        target_instance = 'https://inv.thepixora.com'
        url = f'{target_instance}/api/v1/videos/{video_id}'
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=3) as response:
                data = json.loads(response.read().decode())
                related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                return [v['videoId'] for v in related[:2] if 'videoId' in v]
        except Exception:
            return []

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        history_ids = [item.get('id') for item in history[:10] if item.get('id')]
        
        recommended_ids = []
        
        # --- 2件ずつ順番に処理する作戦 ---
        for i in range(0, len(history_ids), 2):
            # 2件分のIDを切り出す
            chunk = history_ids[i:i+2]
            
            for v_id in chunk:
                res_ids = self.fetch_related_ids(v_id)
                recommended_ids.extend(res_ids)
            
            # 2件リクエストするごとに少し休憩（0.5秒）して負荷を分散
            if i + 2 < len(history_ids):
                time.sleep(0.5)
            
            # Vercelのタイムアウト(約10秒)対策：時間がかかりすぎたら途中で切り上げる
            # ※ここで5秒以上経ってたら安全のためにループを抜ける
            # (今回はシンプルにするため省略していますが、必要なら追加可能)

        # 重複削除
        recommended_ids = list(dict.fromkeys(recommended_ids))

        # 最終チェック
        if not recommended_ids:
            recommended_ids = ["dQw4w9WgXcQ", "9bZkp7q19f0"] # 予備
            explanation = "関連動画が取得できませんでした。履歴を増やしてみてください。"
        else:
            explanation = f"直近の履歴{len(history_ids)}件から、関連動画を抽出しました。"

        res_body = {
            "type": "id_list",
            "ids": recommended_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
