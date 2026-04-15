from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import random
import time

class handler(BaseHTTPRequestHandler):
    def fetch_related_ids(self, video_id):
        """Invidious APIから関連動画を5件取得"""
        target_instance = 'https://inv.thepixora.com'
        url = f'{target_instance}/api/v1/videos/{video_id}'
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=4) as response:
                status = response.getcode()
                if status != 200:
                    return {"error": f"HTTP {status}", "id": video_id}
                
                data = json.loads(response.read().decode())
                related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                
                # ここで「上位5件」を取得
                video_ids = [v['videoId'] for v in related[:5] if 'videoId' in v]
                
                if not video_ids:
                    return {"error": "JSON_EMPTY", "id": video_id}
                
                return {"ids": video_ids}
        except Exception as e:
            return {"error": str(e)[:20], "id": video_id}

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        # 1. 履歴の最新10件を対象にする
        recent_history = history[:10]
        
        # 2. その中からランダムに3つ選ぶ（履歴が3件未満なら全部）
        sample_count = min(len(recent_history), 3)
        target_items = random.sample(recent_history, sample_count)
        
        recommended_ids = []
        debug_logs = []
        
        # 3. 選ばれた3件に対してリクエスト
        for item in target_items:
            v_id = item.get('id')
            if not v_id: continue
            
            res = self.fetch_related_ids(v_id)
            
            if "ids" in res:
                recommended_ids.extend(res["ids"])
            if "error" in res:
                debug_logs.append(f"{v_id}:{res['error']}")
            
            # 連続リクエストによる403回避のため、少しだけ待機（0.3秒）
            time.sleep(0.3)

        # 重複削除
        recommended_ids = list(dict.fromkeys(recommended_ids))

        # 4. レスポンス構築
        if not recommended_ids:
            # 完全に全滅した時用のデバッグ表示
            recommended_ids = ["dQw4w9WgXcQ", "9bZkp7q19f0"]
            log_str = " / ".join(debug_logs) if debug_logs else "History empty"
            explanation = f"❌ 取得失敗ログ: {log_str}"
        else:
            # 成功時も、どの動画から取ったかチラッと見えるようにデバッグ情報を残す
            source_titles = [i.get('title', '不明')[:10] for i in target_items]
            explanation = f"✅ 履歴の「{', '.join(source_titles)}...」から関連動画を生成しました。"
            if debug_logs:
                explanation += f" (一部失敗: {len(debug_logs)}件)"

        res_body = {
            "type": "id_list",
            "ids": recommended_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
