from http.server import BaseHTTPRequestHandler
import json
import re
from collections import Counter

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'] | 0)
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # app.jsから送られてくる直近10件の履歴
        history = data.get('history', [])
        
        recommend_queries = []
        explanation = "最近の視聴傾向からおすすめを編成しました"

        if len(history) > 0:
            all_titles = ""
            bracket_words = []
            channels = []
            
            # 1. データ収集 (直近10件)
            for item in history[:10]:
                title = item.get('title', '')
                channels.append(item.get('channelTitle', ''))
                all_titles += " " + title
                
                # 隅付き括弧などの抽出（ゲーム名や企画名が多い）
                found = re.findall(r'[【「\[](.*?)[】」\]]', title)
                bracket_words.extend(found)

            # 2. ノイズ除去用フィルタ
            noise = r'(実況|配信|動画|公式|最新|攻略|対戦|まとめ|LIVE|shorts|MV|Music|Video|Official)'

            # 3. 最多視聴チャンネルを特定
            if channels:
                top_channel = Counter(channels).most_common(1)[0][0]
                recommend_queries.append(f"{top_channel}")

            # 4. 括弧内キーワードの上位を選出
            clean_brackets = [re.sub(noise, '', b).strip() for b in bracket_words if len(re.sub(noise, '', b).strip()) >= 2]
            if clean_brackets:
                common_brackets = [w for w, count in Counter(clean_brackets).most_common(2)]
                recommend_queries.extend(common_brackets)

            # 5. 直近3件から「今の気分」を1つ抽出
            recent_text = " ".join([h.get('title', '') for h in history[:3]])
            # 2文字以上の漢字・カタカナを抽出
            words = re.findall(r'[\u30A0-\u30FF\u4E00-\u9FFF]{2,}', recent_text)
            filtered_words = [w for w in words if not re.match(noise, w)]
            if filtered_words:
                recent_focus = Counter(filtered_words).most_common(1)[0][0]
                recommend_queries.append(recent_focus)

            # 重複削除して最大4つのキーワードに絞る
            final_queries = list(dict.fromkeys(recommend_queries))[:4]
            recommend_query = " ".join(final_queries)
            explanation = f"分析ワード: {' / '.join(final_queries)}"
        else:
            recommend_query = "YouTube おすすめ"

        # レスポンス
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {
            "query": recommend_query,
            "explanation": explanation
        }
        self.wfile.write(json.dumps(response).encode())
