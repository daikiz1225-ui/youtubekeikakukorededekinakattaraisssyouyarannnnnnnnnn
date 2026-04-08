from http.server import BaseHTTPRequestHandler
import json
import re
from collections import Counter

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ"
        explanation = "視聴履歴から今のトレンドを解析中..."

        if history:
            # 直近5件を重点的に分析
            recent_items = history[:5]
            words_pool = []
            
            # ノイズを除去するための定義
            noise = r'(実況|配信|動画|公式|最新|攻略|対戦|まとめ|LIVE|shorts|パート|Part|ちゃんねる|チャンネル|【】|\[\])'
            
            for i, item in enumerate(recent_items):
                title = item.get('title', '')
                
                # キーワード抽出（カッコ内、ハッシュタグ、3文字以上の固有名詞）
                brackets = re.findall(r'[【「\[](.*?)[】」\]]', title)
                tags = re.findall(r'#([^\s#]+)', title)
                keywords = re.findall(r'[一-龠ぁ-んァ-ヶa-zA-Z0-9ー]{3,}', title)
                
                found_words = brackets + tags + keywords
                
                # スコア計算：最新（i=0）は5点、古い（i=4）は1点としてプールに追加
                weight = 5 - i
                for word in found_words:
                    clean_word = re.sub(noise, '', word).strip()
                    if len(clean_word) >= 2:
                        words_pool.extend([clean_word] * weight)

            if words_pool:
                # 出現頻度（重み付き）が高い順に2つ取得
                most_common = Counter(words_pool).most_common(2)
                
                if len(most_common) >= 2:
                    w1, w2 = most_common[0][0], most_common[1][0]
                    recommend_query = f"{w1} {w2}"
                    explanation = f"最近の視聴「{w1}」と「{w2}」からAIが推論しました"
                elif len(most_common) == 1:
                    w1 = most_common[0][0]
                    recommend_query = w1
                    explanation = f"今のマイトレンド「{w1}」に合わせたおすすめ"

        # レスポンス送信
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        output = {"query": recommend_query, "explanation": explanation}
        self.wfile.write(json.dumps(output).encode('utf-8'))
