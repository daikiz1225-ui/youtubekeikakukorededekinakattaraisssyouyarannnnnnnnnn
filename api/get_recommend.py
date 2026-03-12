from http.server import BaseHTTPRequestHandler
import json
import google.generativeai as genai

# 1. 新しいAPIキーをセット
GEMINI_API_KEY = "AIzaSyCfyCeL1SN7ZK-EYgJ_6vxmB0KsUXsUd14"

# 2. 初期設定（最新のAPIバージョンを確実に使う設定）
genai.configure(api_key=GEMINI_API_KEY)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ"
        explanation = "AIがあなたの好みを分析中です..."

        if len(history) > 0:
            titles = [item.get('title', '') for item in history]
            
            try:
                # 3. モデル名をフルパスで指定
                model = genai.GenerativeModel('models/gemini-1.5-flash')
                
                # 4. 指示文（プロンプト）
                prompt = f"""
                ユーザーのYouTube視聴履歴から、次に検索すべき単語を1つだけ出力してください。
                
                履歴:
                {", ".join(titles)}
                
                ルール:
                - 回答は検索キーワードのみ（1語または2語の組み合わせ）
                - 挨拶や説明は不要
                - 日本語で回答
                """

                # 5. AIにリクエスト
                response = model.generate_content(prompt)
                
                # 6. 結果の取り出し（404や空レスポンス対策）
                if response and response.candidates:
                    ai_text = response.text.strip()
                    if ai_text:
                        # 変な記号や引用符を掃除
                        recommend_query = ai_text.replace('"', '').replace('「', '').replace('」', '').replace('*', '')
                        explanation = f"AIが導き出したオススメ: {recommend_query}"
                    else:
                        explanation = "AIの回答が空でした"
                else:
                    explanation = "AIが回答を生成できませんでした（設定を確認してください）"

            except Exception as e:
                # エラーが出た場合はその内容を画面に表示
                explanation = f"AIエラー: {str(e)}"

        # 7. ブラウザへのレスポンス
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        res_data = {
            "query": recommend_query,
            "explanation": explanation
        }
        self.wfile.write(json.dumps(res_data).encode())
