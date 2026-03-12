from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        
        # デフォルト設定
        recommend_type = "search"
        recommend_value = "YouTube おすすめ"
        explanation = "あなたへのおすすめ動画です"

        # 履歴があれば、一番最後に見た動画の「関連動画」を狙う
        if len(history) >= 1:
            last_video = history[0]
            video_id = last_video.get('videoId')
            video_title = last_video.get('title', '前の動画')
            
            if video_id:
                # 検索ワードの代わりに、IDを渡す形式にする
                # app.js側でこれを受け取って relatedToVideoId を使って検索させる
                recommend_type = "related"
                recommend_value = video_id
                explanation = f"「{video_title[:15]}...」に関連する動画を見つけました"

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            "type": recommend_type,   # "related" か "search" かを判定させる
            "value": recommend_value, # ID または 検索ワード
            "explanation": explanation
        }
        self.wfile.write(json.dumps(response).encode())
