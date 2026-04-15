from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import concurrent.futures

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        target_instance = 'https://inv.thepixora.com'
        
        recommended_ids = []

        if len(history) > 0:
            target_history = history[:10]
            
            def fetch_related_ids(item):
                v_id = item.get('id') or item.get('videoId')
                if not v_id:
                    return []
                try:
                    url = f"{target_instance}/api/v1/videos/{v_id}"
                    
                    # 【強化1】ブラウザからのアクセスだと思わせる（弾かれ対策）
                    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    
                    # 【強化2】タイムアウトを4秒に伸ばして、しっかり待つ
                    with urllib.request.urlopen(req, timeout=4.0) as response:
                        res_data = json.loads(response.read().decode())
                        related = res_data.get('relatedVideos', [])
                        return [v.get('videoId') for v in related[:2] if v.get('videoId')]
                except Exception as e:
                    # エラーが起きても止まらずに空リストを返す
                    return []

            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                results = list(executor.map(fetch_related_ids, target_history))
            
            seen = set()
            for sublist in results:
                for v_id in sublist:
                    if v_id not in seen:
                        recommended_ids.append(v_id)
                        seen.add(v_id)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        self.wfile.write(json.dumps(recommended_ids).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
