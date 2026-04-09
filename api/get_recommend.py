from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import random
import time

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # 履歴から過去5件を抽出
        history = data.get('history', [])[:5]
        
        # 指定されたインスタンスリスト
        instances = [
            'https://inv.nadeko.net/', 'https://invidious.f5.si/', 'https://invidious.lunivers.trade/',
            'https://invidious.ducks.party/', 'https://iv.melmac.space/', 'https://invidious.nerdvpn.de/',
            'https://invidious.privacyredirect.com', 'https://invidious.technicalvoid.dev',
            'https://invidious.darkness.services', 'https://invidious.nikkosphere.com',
            'https://invidious.schenkel.eti.br', 'https://invidious.tiekoetter.com',
            'https://invidious.perennialte.ch', 'https://invidious.reallyaweso.me',
            'https://invidious.private.coffee', 'https://invidious.privacydev.net'
        ]

        all_recommendations = []
        explanation = "YouTube おすすめ"

        if history:
            explanation = f"最近見た {len(history)} 件の動画に基づくおすすめ"
            for video in history:
                video_id = video.get('id')
                # 試行するインスタンスをシャッフル
                random.shuffle(instances)
                
                # 成功するまで最大3つのインスタンスを試す
                success = False
                for inst in instances[:3]:
                    try:
                        inst_url = inst.rstrip('/')
                        api_url = f"{inst_url}/api/v1/videos/{video_id}"
                        
                        req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(req, timeout=2) as response:
                            res_data = json.loads(response.read().decode())
                            related = res_data.get('relatedVideos', [])
                            
                            for r in related[:4]: # 各履歴から4件ずつ
                                all_recommendations.append({
                                    "id": r['videoId'],
                                    "title": r['title'],
                                    "channelTitle": r['author'],
                                    "thumbnail": f"https://i.ytimg.com/vi/{r['videoId']}/mqdefault.jpg"
                                })
                            success = True
                            break # この動画の解析は完了
                    except:
                        continue
        
        # 重複削除とシャッフル
        unique_recs = {v['id']: v for v in all_recommendations}.values()
        final_list = list(unique_recs)
        random.shuffle(final_list)

        # レスポンス
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response_body = {
            "recommend_query": "関連おすすめ", # app.jsとの互換性用
            "explanation": explanation,
            "videos": final_list[:30] # 多めに返す
        }
        
        self.wfile.write(json.dumps(response_body).encode())
