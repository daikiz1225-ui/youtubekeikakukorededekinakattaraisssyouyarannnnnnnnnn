from http.server import BaseHTTPRequestHandler
import json
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# あなたのAPIキー
GEMINI_API_KEY = "AIzaSyAWBMQKuwlkV_zc_iQrbA7N_j_cdJZfdGc"
genai.configure(api_key=GEMINI_API_KEY)

# 【重要】モデルの指定方法と安全設定を変更
model = genai.GenerativeModel(
    model_name='gemini-1.5-flash',
    # AIが勝手に回答をブロックしないようにする設定
    safety_settings={
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }
)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ"
        explanation = "AIがあなたの好みを学習中です..."

        if len(history) > 0:
            titles = [item.get('title', '') for item in history]
            
            prompt = f"""
            以下のYouTube視聴履歴から、次にユーザーが検索しそうな単語を1つだけ選んでください。
            履歴: {", ".join(titles)}
            回答は検索ワードのみを出し、余計な言葉は一切禁止します。
            """

            try:
                # 最新の呼び出し方式
                response = model.generate_content(prompt)
                
                # 候補が存在するかチェック
                if response.candidates:
                    # テキストを取り出す
                    ai_text = response.text.strip()
                    if ai_text:
                        recommend_query = ai_text
                        explanation = f"AI分析完了: {recommend_query}"
                else:
                    explanation = "AIが回答を控えました（安全フィルター等）"

            except Exception as e:
                # 404が出る場合はここで詳細を出す
                explanation = f"AIエラー詳細: {str(e)}"

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
