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
        explanation = "もっと動画を見てみましょう！"

        if len(history) >= 1:
            # 1. 履歴のクリーンアップ（不要な記号を除去）
            titles = [re.sub(r'[【】［］（）()\[\]]', ' ', item.get('title', '')) for item in history]
            channels = [item.get('channelTitle', '') for item in history if item.get('channelTitle')]
            
            # --- ロジックA: 続編・次回作を狙う ---
            # 最新の動画タイトルから数字を探す (例: #1, 第2話, Part3)
            last_title = titles[0]
            num_match = re.search(r'(#|第|Part|パート)\s*(\d+)', last_title, re.IGNORECASE)
            
            if num_match:
                prefix = num_match.group(1)
                num = int(num_match.group(2))
                # 数字を+1して、シリーズ名(前方の文字)を抽出
                base_name = last_title.split(num_match.group(0))[0].strip()
                recommend_query = f"{base_name} {prefix}{num + 1}"
                explanation = f"「{base_name}」の続きが気になりませんか？"

            # --- ロジックB: よく見るチャンネルから選ぶ (Aが失敗した時など) ---
            elif channels:
                most_common_channel = Counter(channels).most_common(1)[0][0]
                recommend_query = most_common_channel
                explanation = f"お気に入りの「{most_common_channel}」の新着をチェック！"

            # --- ロジックC: 過去10件のキーワード分析 (最終手段) ---
            else:
                # 頻出単語を簡易的に抽出
                all_words = " ".join(titles).split()
                # 3文字以上の単語を優先
                keywords = [w for w in all_words if len(w) >= 3]
                if keywords:
                    top_word = Counter(keywords).most_common(1)[0][0]
                    recommend_query = top_word
                    explanation = f"最近よく見ている「{top_word}」に関連する動画です。"

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        res_data = {
            "query": recommend_query,
            "explanation": explanation
        }
        self.end_headers()
        self.wfile.write(json.dumps(res_data).encode())
