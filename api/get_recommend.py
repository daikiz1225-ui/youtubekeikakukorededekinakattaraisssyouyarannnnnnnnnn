from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import re

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # --- 設定 ---
        # app.jsで使っているのと同じAPIキーをここに入れてください
        YOUTUBE_API_KEY = "AIzaSyAA7IsnGA1X2GTv-cvZVeyiTIvFwRR7wT0"
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ"
        explanation = "あなたへのおすすめを分析中..."

        if len(history) > 0 and YOUTUBE_API_KEY != "ここにあなたのYouTube_APIキーを入れてください":
            last_video_id = history[0].get('videoId')
            
            try:
                # 1. Pythonから直接YouTube APIに「関連動画」を問い合わせる
                # relatedToVideoId はAPIの仕様変更で制限される場合があるため、
                # 代替として「その動画のタイトル」をベースに公式の関連検索をシミュレートします
                search_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&relatedToVideoId={last_video_id}&type=video&maxResults=5&key={YOUTUBE_API_KEY}"
                
                # 関連動画が取れない場合（API制限など）は、タイトルのキーワードを使う
                with urllib.request.urlopen(search_url) as response:
                    res_body = json.loads(response.read().decode('utf-8'))
                    items = res_body.get('items', [])
                    
                    if items:
                        # 関連動画の1番目のタイトルを取得
                        related_title = items[0]['snippet']['title']
                        # 余計な記号を消して、最初の2単語くらいを検索ワードにする
                        clean_related = re.sub(r'[【】\[\]（）()|!！?？]', ' ', related_title)
                        words = clean_related.split()
                        recommend_query = " ".join(words[:2]) if len(words) >= 2 else words[0]
                        explanation = f"前の動画に関連する「{recommend_query}」を提案します"
            
            except Exception as e:
                # 関連動画APIが使えない場合は、急上昇（トレンド）からキーワードを拾う
                try:
                    trending_url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=JP&maxResults=1&key={YOUTUBE_API_KEY}"
                    with urllib.request.urlopen(trending_url) as response:
                        res_body = json.loads(response.read().decode('utf-8'))
                        trending_title = res_body['items'][0]['snippet']['title']
                        recommend_query = trending_title.split()[0]
                        explanation = "今、日本で人気のトピックです"
                except:
                    recommend_query = "YouTube おすすめ"

        # --- レスポンス送信 ---
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        res_data = {
            "query": recommend_query,
            "explanation": explanation
        }
        self.wfile.write(json.dumps(res_data).encode())
