from http.server import BaseHTTPRequestHandler
import json
import re
from collections import Counter
import random

class handler(BaseHTTPRequestHandler):
    
    # 検索の邪魔になる「ゴミ単語」のリスト
    NOISE_WORDS = ['公式', 'MV', 'Music Video', '実況', '配信', '生放送', '切り抜き', 'まとめ', 'shorts', 'ショート', '字幕', '和訳', 'HD', '4K']

    def clean_text(self, text):
        """タイトルから記号や不要な単語を完全に除去する"""
        # 記号に囲まれた部分を削除（例：【マイクラ実況】 → 削除）
        text = re.sub(r'【.*?】|\[.*?\]|（.*?）|\(.*?\)|<.*?>|《.*?》', ' ', text)
        # 特殊記号をスペースに変換
        text = re.sub(r'[!！?？|｜/／_＿\-ー~～★☆♪]', ' ', text)
        # ゴミ単語を削除
        for noise in self.NOISE_WORDS:
            text = re.sub(rf'(?i){noise}', ' ', text)
        # 余分な空白を削除して返す
        return ' '.join(text.split())

    def engine_series(self, latest_title):
        """エンジンA: 続編を見つける（Part1 → Part2）"""
        # Part, #, 第○話, その○ などのパターンを網羅
        pattern = r'(?i)(part|pt|ep|episode|#|第|その|vol\.?)\s*(\d+)'
        match = re.search(pattern, latest_title)
        
        if match:
            prefix = match.group(1)
            current_num = int(match.group(2))
            next_num = current_num + 1
            
            # シリーズ名（数字より前の部分）を抽出してクリーンアップ
            base_name = latest_title[:match.start()].strip()
            clean_base = self.clean_text(base_name)
            
            # 長すぎると検索に引っかからないので最初の20文字程度にする
            clean_base = clean_base[:20].strip()
            
            if clean_base:
                return f"{clean_base} {prefix}{next_num}", f"「{clean_base}」の続き（{prefix}{next_num}）をどうぞ！", 90 # スコア90 (最優先)
        return None, None, 0

    def engine_channel_dive(self, history):
        """エンジンB: お気に入りチャンネルの深掘り"""
        channels = [item.get('channelTitle', '') for item in history if item.get('channelTitle')]
        if not channels:
            return None, None, 0
            
        channel_counts = Counter(channels)
        top_channel, count = channel_counts.most_common(1)[0]
        
        # 10件中3件以上（30%以上）同じチャンネルなら「ハマっている」と判定
        if count >= 3 and len(history) >= 3:
            # 直近の興味（最新の動画のクリーンな単語）を掛け合わせる
            latest_clean = self.clean_text(history[0].get('title', ''))
            keywords = latest_clean.split()
            search_append = keywords[0] if keywords else "最新"
            
            return f"{top_channel} {search_append}", f"よく見ている「{top_channel}」のおすすめ動画です！", 70
        return None, None, 0

    def engine_topic_cluster(self, history):
        """エンジンC: 直近の興味キーワードを抽出"""
        if len(history) < 2:
            return None, None, 0
            
        # 直近3件のタイトルから単語を抽出
        recent_titles = [item.get('title', '') for item in history[:3]]
        all_words = []
        for title in recent_titles:
            clean = self.clean_text(title)
            # 2文字以上の単語をリストアップ
            all_words.extend([w for w in clean.split() if len(w) >= 2])
            
        if all_words:
            # よく出てくる単語上位2つを組み合わせる
            word_counts = Counter(all_words)
            top_words = [word for word, count in word_counts.most_common(2)]
            query = " ".join(top_words)
            return query, f"最近のトレンド「{query}」に関連する動画です。", 50
        return None, None, 0

    def engine_serendipity(self, history):
        """エンジンD: 過去の履歴からランダムなキーワードを拾う（マンネリ防止）"""
        if len(history) > 5:
            # 5件目〜最後までの古い履歴からランダムに1つ選ぶ
            old_video = random.choice(history[4:])
            old_title = old_video.get('title', '')
            clean = self.clean_text(old_title)
            words = [w for w in clean.split() if len(w) >= 2]
            
            if words:
                query = random.choice(words)
                return query, f"少し前に見た「{query}」系の動画もいかがですか？", 30 # スコアは低いがランダムで選ばれる
        return None, None, 0

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        history = data.get('history', [])
        
        # デフォルトのフォールバック
        final_query = "YouTube おすすめ"
        final_explanation = "いろんな動画を見て、おすすめを充実させましょう！"

        if len(history) > 0:
            latest_title = history[0].get('title', '')
            
            # 各エンジンから候補とスコアを取得
            candidates = []
            
            # A: 続編チェック
            q_a, exp_a, score_a = self.engine_series(latest_title)
            if q_a: candidates.append((q_a, exp_a, score_a))
                
            # B: チャンネル偏愛チェック
            q_b, exp_b, score_b = self.engine_channel_dive(history)
            if q_b: candidates.append((q_b, exp_b, score_b))
                
            # C: トピッククラスタリング
            q_c, exp_c, score_c = self.engine_topic_cluster(history)
            if q_c: candidates.append((q_c, exp_c, score_c))
                
            # D: セレンディピティ（15%の確率でスコアを爆上げして採用）
            q_d, exp_d, score_d = self.engine_serendipity(history)
            if q_d and random.random() < 0.15:
                candidates.append((q_d, exp_d, 100)) # 強制的にトップにする
                
            # 一番スコアが高い候補を採用
            if candidates:
                best_candidate = max(candidates, key=lambda item: item[2])
                final_query = best_candidate[0]
                final_explanation = best_candidate[1]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            "query": final_query,
            "explanation": final_explanation
        }
        self.wfile.write(json.dumps(response).encode())
