from http.server import BaseHTTPRequestHandler
import json
import re
from sklearn.feature_extraction.text import TfidfVectorizer

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # JSから送られてきた履歴（タイトルリスト）
        history = data.get('history', [])
        
        # デフォルトのキーワード
        recommend_query = "YouTube おすすめ"

        if len(history) >= 3:
            # 1. タイトルだけを抽出してリスト化
            titles = [item.get('title', '') for item in history]
            
            # 2. scikit-learnのTF-IDFで単語の重要度を計算
            # token_patternで日本語や英数字をうまく切り出せるように設定
            vectorizer = TfidfVectorizer(token_pattern=r'(?u)\b\w+\b', max_features=10)
            
            try:
                # 学習（タイトル群から特徴的な単語を抜き出す）
                tfidf_matrix = vectorizer.fit_transform(titles)
                # 抽出された単語リスト
                words = vectorizer.get_feature_names_out()
                
                # 3. 最もスコアが高い（よく出てくる重要な）単語を上位3つ結合
                # 今回は簡易的に、上位の単語を組み合わせて検索クエリにします
                recommend_query = " ".join(words[:3]) 
            except:
                pass

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "query": recommend_query,
            "explanation": f"AIがあなたの履歴から『{recommend_query}』に関心があると分析しました。"
        }
        self.wfile.write(json.dumps(response).encode())
