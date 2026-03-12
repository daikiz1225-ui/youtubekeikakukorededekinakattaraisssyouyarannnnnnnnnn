from http.server import BaseHTTPRequestHandler
import json
import re

class handler(BaseHTTPRequestHandler):
    def get_clean_keywords(self, text):
        """タイトルから検索に役立つ単語だけを抽出する"""
        # 1. 記号と、その中身を削除（【】など）
        text = re.sub(r'【.*?】|\[.*?\]|（.*?）|\(.*?\)|<.*?>', ' ', text)
        # 2. 邪魔な単語を削除
        garbage = r'(公式|実況|配信|生放送|切り抜き|まとめ|shorts|ショート|字幕|和訳|MV|Music Video|Official|Part\.?\d+|第\d+話|#\d+)'
        text = re.sub(garbage, ' ', text, flags=re.IGNORECASE)
        # 3. 記号をスペースにして分割
        text = re.sub(r'[!！?？|｜/／_＿\-ー~～★☆♪:：]', ' ', text)
        words = text.split()
        
        # 4. 2文字以上10文字以下の「意味がありそうな単語」だけ残す
        valid_words = [w for w in words if 2 <= len(w) <= 10]
        return valid_words

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        
        # 最初から「YouTube おすすめ」にせず、履歴から何とかして単語を絞り出す
        final_query = ""
        explanation = ""

        if len(history) > 0:
            all_keywords = []
            # 直近3件の履歴からキーワードをかき集める
            for item in history[:3]:
                all_keywords.extend(self.get_clean_keywords(item.get('title', '')))
            
            if all_keywords:
                # 1. 最新の動画から1つ、2〜3件目の動画から1つ、単語を組み合わせてみる
                # これにより「特定の動画」に偏りすぎず、かつ関連性の高いワードになる
                top_word = all_keywords[0]
                
                if len(all_keywords) > 1:
                    # 2つ目の単語を足して検索精度を上げる
                    second_word = all_keywords[1]
                    if top_word != second_word:
                        final_query = f"{top_word} {second_word}"
                    else:
                        final_query = top_word
                else:
                    final_query = top_word
                
                explanation = f"最近の履歴「{final_query}」からおすすめを生成"
        
        # どうしてもキーワードが取れなかった場合のみフォールバック
        if not final_query:
            final_query = "人気 動画"
            explanation = "おすすめを計算するためのデータが不足しています"

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        res_data = {
            "query": final_query,
            "explanation": explanation
        }
        self.wfile.write(json.dumps(res_data).encode())
