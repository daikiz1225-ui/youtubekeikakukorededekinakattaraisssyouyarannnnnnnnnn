from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import time

class handler(BaseHTTPRequestHandler):
    def test_instance(self, instance_url, video_id):
        """Refererと詳細ヘッダーを追加してボット検知を回避するテスト"""
        base_url = instance_url.rstrip("/")
        api_url = f'{base_url}/api/v1/videos/{video_id}'
        
        try:
            # ブラウザの挙動をより精密に模倣
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Referer': f'{base_url}/watch?v={video_id}', # 動画視聴ページから来たように見せる
                'Origin': base_url
            }
            
            req = urllib.request.Request(api_url, headers=headers)
            
            # タイムアウトを少し延ばして確実に待つ
            with urllib.request.urlopen(req, timeout=3) as response:
                if response.getcode() == 200:
                    body = response.read().decode()
                    # ここでJSONパース
                    data = json.loads(body)
                    
                    related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                    ids = [v['videoId'] for v in related[:10] if 'videoId' in v]
                    
                    if ids:
                        return {"status": "SUCCESS", "ids": ids}
                    return {"status": "EMPTY_DATA", "ids": None}
                    
        except urllib.error.HTTPError as e:
            return {"status": f"HTTP_{e.code}", "ids": None}
        except json.JSONDecodeError:
            return {"status": "HTML_RETURNED", "ids": None} # JSONではなくHTMLが返ってきた
        except Exception as e:
            return {"status": type(e).__name__[:15], "ids": None}
            
        return {"status": "FAILED", "ids": None}

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        # 最新の履歴からテスト用IDを取得
        test_video_id = history[0].get('id') if history else "dQw4w9WgXcQ"
        
        # 期待度が高い（JSONエラーだったもの）＋ 未テストの有力候補
        instances = [
            "https://invidious.snopyta.org",
            "https://invidious.einfachzocken.eu",
            "https://iv.ggtyler.dev",
            "https://invidious.slipfox.xyz",
            "https://inv.odyssey346.dev",
            "https://invidious.flokinet.to",
            "https://inv.tux.pizza",
            "https://invidious.v0l.me",
            "https://invidious.jing.rocks",
            "https://inv.river.me",
            "https://invidious.namesi.icu",
            "https://invidious.projectsegfau.lt"
        ]

        final_ids = []
        winning_url = ""
        debug_report = []

        # ローラー作戦開始
        for url in instances:
            result = self.test_instance(url, test_video_id)
            
            # ログ用 (短く)
            domain = url.replace("https://", "")
            debug_report.append(f"{domain}:{result['status']}")
            
            if result["status"] == "SUCCESS":
                final_ids = result["ids"]
                winning_url = url
                break
            
            # 連続アクセスによる同一IP拒否を防ぐための微小な待機
            time.sleep(0.2)

        # レスポンス
        if final_ids:
            explanation = f"✨ 突破成功! 使用インスタンス: {winning_url}"
        else:
            explanation = "全滅ログ: " + " | ".join(debug_report)
            final_ids = ["dQw4w9WgXcQ", "9bZkp7q19f0"] # 予備

        res_body = {
            "type": "id_list",
            "ids": final_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
