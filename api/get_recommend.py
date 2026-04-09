from http.server import BaseHTTPRequestHandler
import json
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # app.jsから送られてきた視聴履歴
        history = data.get('history', [])
        recommended_ids = []

        if history:
            # 履歴の中で一番新しい動画のIDを取得
            latest_video_id = history[0].get('id')
            
            if latest_video_id:
                try:
                    # 自分のVercelのproxy.jsを叩くためのURLを組み立てる
                    host = self.headers.get('Host')
                    protocol = "https" if "vercel.app" in host or "localhost" not in host else "http"
                    proxy_url = f"{protocol}://{host}/api/proxy?videoId={latest_video_id}"
                    
                    # プロキシにIDを投げて、関連動画のID配列を受け取る
                    req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        recommended_ids = json.loads(response.read().decode('utf-8'))
                except Exception as e:
                    print(f"Error calling proxy: {e}")

        # フロントエンド(app.js)にIDの配列だけをそのまま返す
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        self.wfile.write(json.dumps(recommended_ids).encode('utf-8'))
