from http.server import BaseHTTPRequestHandler
import json
import google.generativeai as genai

# あなたのAPIキーを設定
GEMINI_API_KEY = "AIzaSyAWBMQKuwlkV_zc_iQrbA7N_j_cdJZfdGc"
genai.configure(api_key=GEMINI_API_KEY)

# AIモデルの準備 (軽量で速い 1.5-flash を使用)
model = genai.GenerativeModel('gemini-1.5-flash')

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ"
        explanation = "動画をたくさん見て、AIを育てましょう！"

        if len(history) > 0:
            # 履歴のタイトルをリスト化
            history_titles = [item.get('title', '') for item in history]
            
            # Geminiへの指示文（プロンプト）を作成
            prompt = f"""
            あなたはYouTubeの高度な推薦エンジンです。
            以下の視聴履歴（最新順）を見て、ユーザーの現在の興味を分析してください。
            次にユーザーが検索しそうな、具体的で短い検索キーワードを「1つだけ」出力してください。
            
            条件：
            - 余計な説明や挨拶は一切不要。
            - 記号（【】など）は除外すること。
            - 続き物（Part1など）があれば、次の番号を推測すること。
            - 検索キーワードのみを出力すること。

            視聴履歴：
            {", ".join(history_titles)}
            """

            try:
                # Geminiに推論させる
                response = model.generate_content(prompt)
                ai_result = response.text.strip()
                
                if ai_result:
                    recommend_query = ai_result
                    explanation = f"AIがあなたの履歴から「{recommend_query}」に注目しました"
            except Exception as e:
                # エラーの内容を具体的に表示させる
                explanation = f"エラー詳細: {str(e)}"

        # レスポンス送信
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        res_data = {
            "query": recommend_query,
            "explanation": explanation
        }
        self.wfile.write(json.dumps(res_data).encode())
