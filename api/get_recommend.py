from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import time

class handler(BaseHTTPRequestHandler):
    def test_instance(self, instance_url, video_id):
        """特定のインスタンスで通信が通るかテストする"""
        url = f'{instance_url}/api/v1/videos/{video_id}'
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
            req = urllib.request.Request(url, headers=headers)
            # タイムアウトは短めに設定して次々回す
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.getcode() == 200:
                    data = json.loads(response.read().decode())
                    related = data.get('relatedVideos') or data.get('recommendedVideos') or []
                    ids = [v['videoId'] for v in related[:5] if 'videoId' in v]
                    return ids if ids else None
        except Exception as e:
            # 403, 401, タイムアウト等はすべて無視して次へ
            return None
        return None

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        # テストに使う動画ID（最新の履歴から1つ）
        test_video_id = history[0].get('id') if history else "dQw4w9WgXcQ"
        
        # inv.json.txt にあったリスト（一部抜粋して順番に試す）
        instances = [
            "https://invidious.nerdvpn.de",
            "https://yewtu.be",
            "https://invidious.f5.si",
            "https://vid.puffyan.us",
            "https://inv.vern.cc",
            "https://invid-api.poketube.fun",
            "https://invidious.nikkosphere.com",
            "https://iv.duti.dev",
            "https://invidious.lunar.icu",
            "https://inv.bp.projectsegfau.lt",
            "https://invidious.perennialte.ch",
            "https://iv.nboeck.de",
            "https://invidious.tiekoetter.com",
            "https://invidious.flokinet.to",
            "https://inv.tux.pizza"
        ]

        success_ids = []
        winning_url = ""

        # インスタンスを順番に叩く
        for url in instances:
            # 念のためURL末尾の / を消す
            url = url.rstrip('/')
            result = self.test_instance(url, test_video_id)
            
            if result:
                success_ids = result
                winning_url = url
                break # 1つでも成功したら即終了
            
            # 相手に負荷をかけすぎないよう、わずかに待機
            time.sleep(0.1)

        # レスポンス
        if success_ids:
            explanation = f"✨ 成功! インスタンス: {winning_url}"
        else:
            explanation = "❌ 全滅しました。どのインスタンスからも拒否されています。"
            success_ids = ["dQw4w9WgXcQ"] # バックアップ

        res_body = {
            "type": "id_list",
            "ids": success_ids[:20],
            "explanation": explanation
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_body).encode())
