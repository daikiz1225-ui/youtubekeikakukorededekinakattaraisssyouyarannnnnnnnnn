from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # app.jsから送られてきた視聴履歴
        history = data.get('history', [])
        recommended_ids = []

        if history:
            # 履歴の最新の動画IDを取得
            latest_video_id = history[0].get('id')
            
            if latest_video_id:
                try:
                    # 自分のドメインのproxy.jsを叩く（ホスト名はリクエストヘッダーから取得）
                    host = self.headers.get('Host')
                    protocol = "https" if "vercel.app" in host else "http"
                    proxy_url = f"{protocol}://{host}/api/proxy?videoId={latest_video_id}"
                    
                    # プロキシに動画IDを投げて関連動画IDリストを取得
                    with urllib.request.urlopen(proxy_url) as response:
                        recommended_ids = json.loads(response.read().decode())
                except Exception as e:
                    print(f"Error calling proxy: {e}")

        # レスポンス送信
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # フロントエンドにIDの配列をそのまま返す
        self.wfile.write(json.dumps(recommended_ids).encode('utf-8'))
