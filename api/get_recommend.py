from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import concurrent.futures
import traceback

class handler(BaseHTTPRequestHandler):
    def fetch_related_ids(self, video_id):
        """Invidious APIから詳細なエラーログ付きで取得を試みる"""
        # kanrenn.js と同じ、安定しているはずのインスタンス
        target_instance = 'https://inv.thepixora.com'
        url = f'{target_instance}/api/v1/videos/{video_id}'
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            req = urllib.request.Request(url, headers=headers)
            
            # 通信実行
            with urllib.request.urlopen(req, timeout=5) as response:
                status = response.getcode()
                if status != 200:
                    return {"error": f"HTTP {status}", "id": video_id}
                
                body = response.read().decode()
                data = json.loads(body)
                
                # データ構造の確認
                related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                video_ids = [v['videoId'] for v in related[:2] if 'videoId' in v]
                
                if not video_ids:
                    return {"error": "Related empty in JSON", "id": video_id}
                
                return {"ids": video_ids}

        except urllib.error.HTTPError as e:
            return {"error": f"HTTPError: {e.code}", "id": video_id}
        except urllib.error.URLError as e:
            return {"error": f"URLError: {e.reason}", "id": video_id}
        except Exception as e:
            return {"error": f"LogicError: {str(e)}", "id": video_id}

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        history_ids = [item.get('id') for item in history[:10] if item.get('id')]
        
        recommended_ids = []
        debug_logs = []
        
        if history_ids:
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(self.fetch_related_ids, history_ids))
            
            for res in results:
                if "ids" in res:
                    recommended_ids.extend(res["ids"])
                if "error" in res:
                    debug_logs.append(f"{res['id']}:{res['error']}")
            
            recommended_ids = list(dict.fromkeys(recommended_ids))

        # エラーが見えるように説明文を構築
        if not recommended_ids:
            # 失敗時のバックアップ
            recommended_ids = ["dQw4w9WgXcQ", "9bZkp7q19f0", "CevxZvSJLk8"]
            log_str = " / ".join(debug_logs) if debug_logs else "No History Found"
            explanation = f"❌ 取得失敗ログ: {log_str}"
        else:
            explanation = f"✅ 成功! 関連動画を{len(recommended_ids)}件取得しました。"

        res_body = {
            "type": "id_list",
            "ids": recommended_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
