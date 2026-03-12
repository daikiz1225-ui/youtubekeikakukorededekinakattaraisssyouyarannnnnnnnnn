from http.server import BaseHTTPRequestHandler
import json
import google.generativeai as genai

# あなたのAPIキーを設定
GEMINI_API_KEY = "AIzaSyAWBMQKuwlkV_zc_iQrbA7N_j_cdJZfdGc"
genai.configure(api_key=GEMINI_API_KEY)

# エラーを回避するため、モデル名の指定を変更
# 「models/」を付けるか、最新の「-latest」を試します
model = genai.GenerativeModel('gemini-1.5-flash-latest')

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ"
        explanation = "AIレコメンドを準備中..."

        if len(history) > 0:
            history_titles = [item.get('title', '') for item in history]
            
            prompt = f"""
            ユーザーのYouTube視聴履歴から、次に検索すべきキーワードを1つだけ出力してください。
            
            履歴:
            {", ".join(history_titles)}
            
            ルール:
            - 検索キーワードのみを出力（説明不要）
            - 日本語でOK
            - 記号は含めない
            """

            try:
                # 生成リクエスト
                response = model.generate_content(prompt)
                
                # response.text が取れない場合のエラー回避
                if response and response.text:
                    recommend_query = response.text.strip()
                    explanation = f"AI分析完了: {recommend_query}"
                else:
                    explanation = "AIから空の回答が返ってきました"

            except Exception as e:
                # ここで出ているエラーの内容を表示させる
                explanation = f"AIエラー: {str(e)}"
                print(f"Error: {e}") # サーバーログにも残す

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
