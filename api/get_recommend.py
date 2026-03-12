from http.server import BaseHTTPRequestHandler
import json
import google.generativeai as genai
import os

# あなたのAPIキー
GEMINI_API_KEY = "AIzaSyAWBMQKuwlkV_zc_iQrbA7N_j_cdJZfdGc"

# ライブラリの初期化設定
genai.configure(api_key=GEMINI_API_KEY)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ"
        explanation = "AIが接続を確認中..."

        if len(history) > 0:
            titles = [item.get('title', '') for item in history]
            
            # --- ここでモデルを指定 ---
            # Flashがダメなら、下の行を 'models/gemini-1.5-pro' に書き換えてみて！
            model_name = 'models/gemini-1.5-flash' 
            
            try:
                # 生成モデルの読み込み
                model = genai.GenerativeModel(model_name)
                
                # プロンプト（指示）
                prompt = f"以下のYouTube履歴から次に見る動画の検索語を1つだけ。履歴: {', '.join(titles)}"
                
                # AIに答えさせる
                response = model.generate_content(prompt)
                
                if response.text:
                    recommend_query = response.text.strip().replace('"', '').replace('「', '').replace('」', '')
                    explanation = f"AI（{model_name}）のオススメ: {recommend_query}"
                else:
                    explanation = "AIから応答がありませんでした"

            except Exception as e:
                # 404エラーの詳細を表示
                explanation = f"エラー発生: {str(e)}"

        # 送信処理
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        res_data = {
            "query": recommend_query,
            "explanation": explanation
        }
        self.wfile.write(json.dumps(res_data).encode())
