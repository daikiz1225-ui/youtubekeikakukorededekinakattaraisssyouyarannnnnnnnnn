from http.server import BaseHTTPRequestHandler
import json
import re
from collections import Counter

class handler(BaseHTTPRequestHandler):
    def clean_text(self, text):
        """タイトルから検索の邪魔なノイズを消し、純粋なキーワードだけにする"""
        # 1. 記号と、その中身を削除（例：【マイクラ】→削除）
        text = re.sub(r'【.*?】|\[.*?\]|（.*?）|\(.*?\)|<.*?>', ' ', text)
        # 2. 邪魔な単語を削除
        garbage = r'(公式|実況|配信|生放送|切り抜き|まとめ|shorts|ショート|字幕|和訳|MV|Music Video|Official)'
        text = re.sub(garbage, ' ', text, flags=re.IGNORECASE)
        # 3. 記号をスペースに
        text = re.sub(r'[!！?？|｜/／_＿\-ー~～★☆♪]', ' ', text)
        return ' '.join(text.split())

    def detect_next_part(self, title):
        """「Part1」などを見つけて「Part2」を予測する"""
        patterns = [
            r'(?i)(part|pt|ep|episode|#|第|その|vol\.?)\s*(\d+)',
            r'(\d+)\s*(話|回)'
        ]
        for p in patterns:
            match = re.search(p, title)
            if match:
                prefix = match.group(1)
                num = int(match.group(2))
                return f"{prefix}{num + 1}"
        return None

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        recommend_query = "YouTube おすすめ"
        explanation = "新しい動画を見て好みを教えてください！"

        if len(history) > 0:
            latest = history[0]
            latest_title = latest.get('title', '')
            
            # 1. 続編があるかチェック
            next_part = self.detect_next_part(latest_title)
            
            # 2. タイトルを掃除
            cleaned_title = self.clean_text(latest_title)
            
            # 3. チャンネルの偏りをチェック
            channels = [h.get('channelTitle', '') for h in history if h.get('channelTitle')]
            top_channel = Counter(channels).most_common(1)[0][0] if channels else ""

            if next_part:
                # 続編があるなら「掃除したタイトル + 次のPart」
                base = cleaned_title[:15] # 長すぎ防止
                recommend_query = f"{base} {next_part}"
                explanation = f"「{base}」の続き（{next_part}）を見つけました"
            elif top_channel and channels.count(top_channel) >= 2:
                # 特定のチャンネルをよく見ていれば、その人の関連
                recommend_query = f"{top_channel} {cleaned_title.split()[0] if cleaned_title.split() else ''}"
                explanation = f"よく見ている「{top_channel}」の関連動画です"
            else:
                # それ以外は、掃除したタイトルの先頭キーワード
                words = cleaned_title.split()
                recommend_query = " ".join(words[:2]) if words else "YouTube おすすめ"
                explanation = f"最近見た「{recommend_query}」に関連するおすすめ"

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        res_data = {"query": recommend_query, "explanation": explanation}
        self.wfile.write(json.dumps(res_data).encode())
