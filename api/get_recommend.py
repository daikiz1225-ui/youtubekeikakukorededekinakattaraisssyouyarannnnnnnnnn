from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import concurrent.futures

class handler(BaseHTTPRequestHandler):
    def fetch_related_ids(self, video_id):
        """Invidious APIから関連動画を取得"""
        # インスタンスを1つに固定せず、取得を試みる
        url = f'https://inv.thepixora.com/api/v1/videos/{video_id}'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as response:
                data = json.loads(response.read().decode())
                # relatedVideos だけでなく recommendedVideos もチェック
                related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                return [v['videoId'] for v in related[:2] if 'videoId' in v]
        except:
            return []

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # app.jsから送られてくる履歴データ
        history = data.get('history', [])
        # 直近10件の動画IDを抽出
        history_ids = [item.get('id') for item in history[:10] if item.get('id')]
        
        recommended_ids = []
        
        # 1. 履歴がある場合は関連動画の取得を試みる
        if history_ids:
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(self.fetch_related_ids, history_ids))
            for ids in results:
                recommended_ids.extend(ids)
            # 重複削除
            recommended_ids = list(dict.fromkeys(recommended_ids))

        # 2. 【重要】取得できなかった場合、または履歴が空の場合に「適当な動画ID」を入れる
        if not recommended_ids:
            # YouTubeで確実に存在する、かつ「オススメっぽくない」バラエティ豊かな動画ID
            # (音楽、ニュース、自然、テックなど適当に20個)
            backup_ids = [
                "dQw4w9WgXcQ", "9bZkp7q19f0", "CevxZvSJLk8", "j5-yKhDd64s",
                "fJ9rUzIMcZQ", "L_jWHffLa5w", "0gv7C99af84", "0PSw86fK_r4",
                "hS5CfP8n_js", "2Vv-BfVoq4g", "hTWKbfoikeg", "kJQP7kiw5Fk",
                "60ItHLz5WEA", "9p2wMpVVtXg", "Y6Lp9TzU_Y0", "W-fFHe6MsnE",
                "v7S_AsAnUuI", "YQHsXMglC9A", "37p67O65N_Y", "tVLCSRu-R7M"
            ]
            recommended_ids = backup_ids
            explanation = "（デバッグ用：バックアップ動画を表示中）"
        else:
            explanation = "視聴履歴の関連動画からおすすめを抽出しました。"

        # app.jsが期待するJSON形式でレスポンス
        res_body = {
            "type": "id_list",
            "ids": recommended_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
