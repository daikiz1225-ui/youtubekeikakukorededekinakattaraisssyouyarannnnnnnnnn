from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import traceback

class handler(BaseHTTPRequestHandler):
    def fetch_related_ids(self, video_id):
        """1本だけリクエストを送る（最小負荷）"""
        target_instance = 'https://invidious.nerdvpn.de'
        url = f'{target_instance}/api/v1/videos/{video_id}'
        
        try:
            # ブラウザのふりを強化
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
            }
            req = urllib.request.Request(url, headers=headers)
            
            with urllib.request.urlopen(req, timeout=5) as response:
                status = response.getcode()
                if status != 200:
                    return {"error": f"HTTP {status}", "id": video_id}
                
                data = json.loads(response.read().decode())
                related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                
                # 1本のリクエストから多めに（10件くらい）IDを抜く
                video_ids = [v['videoId'] for v in related[:10] if 'videoId' in v]
                
                if not video_ids:
                    return {"error": "JSON_EMPTY", "id": video_id}
                
                return {"ids": video_ids}
        except urllib.error.HTTPError as e:
            return {"error": f"HTTP {e.code}", "id": video_id}
        except Exception as e:
            return {"error": str(e)[:30], "id": video_id}

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        
        recommended_ids = []
        explanation = ""

        # 【変更点】最新の1件だけを対象にする
        if history:
            target_item = history[0] # 一番最近見た動画
            v_id = target_item.get('id')
            title = target_item.get('title', '不明')
            
            res = self.fetch_related_ids(v_id)
            
            if "ids" in res:
                recommended_ids = res["ids"]
                explanation = f"✅ 最新の履歴「{title[:15]}...」の関連動画を表示中"
            else:
                # 失敗時のログ表示
                recommended_ids = ["dQw4w9WgXcQ"] # バックアップ
                explanation = f"❌ 1件リクエストで失敗: {res.get('error')} (ID: {v_id})"
        else:
            recommended_ids = ["dQw4w9WgXcQ"]
            explanation = "履歴がないため取得できません。"

        res_body = {
            "type": "id_list",
            "ids": recommended_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
