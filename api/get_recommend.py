from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import time

class handler(BaseHTTPRequestHandler):
    def test_instance(self, instance_url, video_id):
        """特定のインスタンスをテストし、結果と詳細ログを返す"""
        url = f'{instance_url.rstrip("/")}/api/v1/videos/{video_id}'
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.getcode() == 200:
                    data = json.loads(response.read().decode())
                    related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                    ids = [v['videoId'] for v in related[:5] if 'videoId' in v]
                    if ids:
                        return {"status": "SUCCESS", "ids": ids}
                    return {"status": "EMPTY_DATA", "ids": None}
        except urllib.error.HTTPError as e:
            return {"status": f"HTTP_{e.code}", "ids": None}
        except Exception as e:
            # タイムアウトや接続エラー
            err_name = type(e).__name__
            return {"status": f"ERR_{err_name}", "ids": None}
        return {"status": "UNKNOWN", "ids": None}

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        test_video_id = history[0].get('id') if history else "dQw4w9WgXcQ"
        
        # 前回入りきらなかったインスタンスを中心に構成
        instances = [
            "https://invidious.snopyta.org",
            "https://iv.melmac.space",
            "https://lekiter.gay",
            "https://youtube.mosesmang.com",
            "https://invidious.einfachzocken.eu",
            "https://iv.ggtyler.dev",
            "https://invidious.kavin.rocks",
            "https://invidious.io.lol",
            "https://invidious.private.coffee",
            "https://invidious.drgns.space",
            "https://invidious.slipfox.xyz",
            "https://inv.odyssey346.dev",
            "https://inv.us.projectsegfau.lt",
            "https://invidious.lunivers.trade",
            "https://invidious.sethforprivacy.com"
        ]

        final_ids = []
        winning_url = ""
        debug_report = []

        # 順番にテスト
        for url in instances:
            result = self.test_instance(url, test_video_id)
            
            # ログを記録 (URL:結果)
            debug_report.append(f"{url.split('//')[1]}:{result['status']}")
            
            if result["status"] == "SUCCESS":
                final_ids = result["ids"]
                winning_url = url
                break
            
            time.sleep(0.1)

        # レスポンス
        if final_ids:
            explanation = f"✨ 当たり発見: {winning_url}"
        else:
            # 全滅した場合、全履歴のログを合体させて表示
            explanation = "全滅ログ: " + " | ".join(debug_report)
            final_ids = ["dQw4w9WgXcQ"]

        res_body = {
            "type": "id_list",
            "ids": final_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
