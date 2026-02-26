from http.server import BaseHTTPRequestHandler
import json
from sklearn.feature_extraction.text import TfidfVectorizer

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ" # デフォルト

        # 3件以上の履歴があればAI分析開始
        if len(history) >= 3:
            titles = [item.get('title', '') for item in history]
            # 日本語や記号を考慮したトークナイズ設定
            vectorizer = TfidfVectorizer(token_pattern=r'(?u)\b\w+\b', max_features=5)
            
            try:
                vectorizer.fit_transform(titles)
                # 重要度が高い単語を取得
                words = vectorizer.get_feature_names_out()
                if len(words) > 0:
                    recommend_query = " ".join(words[:2]) # 上位2単語で検索
            except:
                pass

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "query": recommend_query,
            "explanation": f"AIが分析したあなたの興味キーワード: {recommend_query}"
        }
        self.wfile.write(json.dumps(response).encode())
