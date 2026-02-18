const Storage = { 
    getHistory() { return JSON.parse(localStorage.getItem('yt_history')) || []; }, 
    addHistory(v) { 
        let h = this.getHistory(); 
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50); 
        localStorage.setItem('yt_history', JSON.stringify(h)); 
    }, 
    getLiked() { return JSON.parse(localStorage.getItem('yt_liked')) || []; }, 
    toggleLike(v) { 
        let l = this.getLiked(); 
        const idx = l.findIndex(x => x.id === v.id); 
        if (idx > -1) l.splice(idx, 1); else l.unshift(v); 
        localStorage.setItem('yt_liked', JSON.stringify(l)); 
        return idx === -1; 
    }, 
    getSubs() { return JSON.parse(localStorage.getItem('yt_subs')) || []; }, 
    toggleSub(c) { 
        let s = this.getSubs(); 
        const idx = s.findIndex(x => x.id === c.id); 
        if (idx > -1) s.splice(idx, 1); else s.push(c); 
        localStorage.setItem('yt_subs', JSON.stringify(s)); 
        return idx === -1; 
    }, 
    getPlaylists() { return JSON.parse(localStorage.getItem('yt_playlists')) || {}; }, 
    createPlaylist(name) { 
        let p = this.getPlaylists(); 
        if (!p[name]) p[name] = []; 
        localStorage.setItem('yt_playlists', JSON.stringify(p)); 
    }, 
    deletePlaylist(name) { 
        let p = this.getPlaylists(); 
        delete p[name]; 
        localStorage.setItem('yt_playlists', JSON.stringify(p)); 
    }, 
    removeFromPlaylist(name, vId) { 
        let p = this.getPlaylists(); 
        if (p[name]) p[name] = p[name].filter(x => x.id !== vId); 
        localStorage.setItem('yt_playlists', JSON.stringify(p)); 
    } 
}; 

const Actions = { 
    currentList: [], 
    relatedList: [], 
    nextToken: "", 
    isShortsMode: false, 
    currentVideo: null, 
    searchQuery: "", 
    channelIcons: {}, 

    init() { 
        this.renderSidebar(); 
        this.goHome(); 
        // iPad対応：Enterキーでリロードさせない 
        document.getElementById('search-input').addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') {  
                e.preventDefault();  
                this.search(document.getElementById('search-input').value, false);  
            } 
        }); 
    }, 

    renderSidebar() { 
        const playlists = Storage.getPlaylists(); 
        const playlistHTML = Object.keys(playlists).map(name => ` 
            <div class="nav-item" onclick="Actions.showPlaylist('${name}')">📁 <span>${name}</span></div> 
        `).join(''); 

        document.getElementById('sidebar-nav').innerHTML = ` 
            <div class="nav-item" onclick="Actions.goHome(true)">🏠 <span>急上昇</span></div> 
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div> 
            <div class="nav-item" onclick="Actions.showSubsPage()">🔔 <span>登録チャンネル</span></div> 
            <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div> 
            <div class="sidebar-section" style="border-top:1px solid var(--border); margin-top:10px; padding-top:10px;"> 
                <div style="font-size:12px; color:var(--text-sub); padding:0 15px 5px;">ライブラリ</div> 
                <div class="nav-item" onclick="Actions.showLiked()">👍 <span>高評価</span></div> 
                ${playlistHTML} 
                <div class="nav-item" onclick="Actions.promptNewPlaylist()" style="color: var(--accent);">➕ <span>新しいリスト</span></div> 
            </div> 
        `; 
    }, 

    async goHome(clear = false) { 
        if(clear) { document.getElementById('search-input').value = ""; this.searchQuery = ""; } 
        this.isShortsMode = false; 
        this.showView(); 
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 }); 
        this.processData(data, false); 
    }, 

    async search(q, isMore = false) { 
        const query = q || this.searchQuery; 
        if (!query && !isMore && !this.isShortsMode) return; 

        if (!isMore) { 
            this.searchQuery = query; 
            this.nextToken = ""; 
            this.showView(); 
        } 

        const params = { 
            q: this.isShortsMode ? `#Shorts ${this.searchQuery || ''}`.trim() : this.searchQuery, 
            part: 'snippet', 
            type: 'video', 
            maxResults: 24, 
            pageToken: this.nextToken 
        }; 

        if (this.isShortsMode) params.videoDuration = 'short'; 

        const data = await YT.fetchAPI('search', params); 
        this.nextToken = data.nextPageToken || ""; 
          
        const chIds = [...new Set(data.items.map(i => i.snippet.channelId))].join(','); 
        await this.fetchChannelIcons(chIds); 

        if (this.isShortsMode) { 
            if (isMore) this.relatedList = [...this.relatedList, ...data.items]; 
            else { 
                this.relatedList = data.items; 
                document.getElementById('view-container').innerHTML = ` 
                    <div style="padding:20px;"> 
                        <h1>⚡ ショート: ${this.searchQuery || 'おすすめ'}</h1> 
                        <div id="shorts-grid" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div> 
                    </div>`; 
            } 
            this.renderShortsGrid(this.relatedList, 'shorts-grid'); 
        } else { 
            if (isMore) this.currentList = [...this.currentList, ...data.items]; 
            else this.currentList = data.items; 
            this.renderGrid(this.currentList, 'view-container'); 
        } 

        document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none'; 
    }, 

    loadMore() { 
        this.search(this.searchQuery, true); 
    }, 

    async processData(data, isMore) { 
        this.nextToken = data.nextPageToken || ""; 
        const chIds = [...new Set(data.items.map(i => i.snippet.channelId))].join(','); 
        await this.fetchChannelIcons(chIds); 
        if (isMore) this.currentList.push(...data.items); else this.currentList = data.items; 
        this.renderGrid(this.currentList, 'view-container'); 
        document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none'; 
    }, 

    async fetchChannelIcons(ids) { 
        if (!ids) return; 
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' }); 
        if(data.items) data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; }); 
    }, 

    renderGrid(items, targetId) { 
        const container = document.getElementById(targetId); 
        const html = items.map((item, i) => { 
            const chId = item.snippet.channelId; 
            return ` 
            <div class="v-card"> 
                <div class="thumb-container" onclick="Actions.playFromList(${i}, '${targetId}')"> 
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb"> 
                </div> 
                <div class="video-meta-row"> 
                    <img src="${this.channelIcons[chId] || ''}" class="channel-icon-mini" onclick="Actions.openChannel('${chId}')"> 
                    <div class="v-text" onclick="Actions.playFromList(${i}, '${targetId}')"> 
                        <h3>${item.snippet.title}</h3> 
                        <p>${item.snippet.channelTitle}</p> 
                    </div> 
                </div> 
            </div>`; 
        }).join(''); 
        if (targetId === 'view-container') container.innerHTML = `<div class="grid">${html}</div>`; 
        else container.innerHTML = html; 
    }, 

    async showShortsFeed() { 
        this.isShortsMode = true; 
        this.searchQuery = ""; 
        await this.search("", false); 
    }, 

    renderShortsGrid(items, targetId) { 
        document.getElementById(targetId).innerHTML = items.map((item, i) => ` 
            <div class="v-card" onclick="Actions.playShort(${i})"> 
                <div class="thumb-container" style="aspect-ratio: 9/16;"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div> 
                <div class="video-meta-row"> 
                    <img src="${this.channelIcons[item.snippet.channelId] || ''}" class="channel-icon-mini" onclick="event.stopPropagation(); Actions.openChannel('${item.snippet.channelId}')"> 
                    <div class="v-text"><h3>${item.snippet.title}</h3></div> 
                </div> 
            </div>`).join(''); 
    }, 

    async playShort(index) { 
        if (index < 0 || index >= this.relatedList.length) return; 
        const video = this.relatedList[index]; 
        this.currentVideo = video; 
        const vId = video.id.videoId; 
        const chId = video.snippet.channelId; 
        const isLiked = Storage.getLiked().some(x => x.id === vId); 
        const isSubbed = Storage.getSubs().some(x => x.id === chId); 
        this.showView(); 
        document.getElementById('view-container').innerHTML = ` 
            <div class="shorts-container"> 
                <div class="shorts-wrapper"> 
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1&loop=1&playlist=${vId}" style="width:100%;height:100%;border:none;"></iframe> 
                    <div class="shorts-info-overlay"> 
                        <div class="shorts-channel-row" onclick="Actions.openChannel('${chId}')"> 
                            <img src="${this.channelIcons[chId]||''}" style="width:36px;height:36px;border-radius:50%;border:1px solid white;"> 
                            <span style="color:white;font-weight:bold;">@${video.snippet.channelTitle}</span> 
                        </div> 
                        <div style="color:white;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.8);">${video.snippet.title}</div> 
                    </div> 
                </div> 
                <div class="shorts-right-controls"> 
                    <button class="short-action-btn" onclick="Actions.playShort(${index-1})">▲</button> 
                    <button class="short-action-btn" onclick="Actions.playShort(${index+1})">▼</button> 
                    <button class="short-action-btn" onclick="Actions.handleLike()">${isLiked?'❤️':'👍'}</button> 
                    <button class="short-action-btn" onclick="Actions.showPlaylistSelector()">➕</button> 
                    <button class="short-action-btn" style="background:${isSubbed?'#444':'#f00'};font-size:11px;" onclick="Actions.handleSub('${chId}','${video.snippet.channelTitle}')">${isSubbed?'済':'登録'}</button> 
                </div> 
            </div>`; 
    }, 

    async play(video) { 
        this.isShortsMode = false; this.currentVideo = video; 
        const vId = video.id.videoId || video.id; 
        const chId = video.snippet.channelId; 
        this.showView(); 
        const isLiked = Storage.getLiked().some(x => x.id === vId); 
        const isSubbed = Storage.getSubs().some(x => x.id === chId); 
        document.getElementById('view-container').innerHTML = ` 
            <div style="padding:20px;"> 
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;"><iframe src="${YT.getEmbedUrl(vId)}?autoplay=1" style="width:100%;height:100%;border:none;" allowfullscreen></iframe></div> 
                <div style="padding:15px 0;"> 
                    <div style="display:flex; justify-content:space-between;"> 
                        <h2>${video.snippet.title}</h2> 
                        <div style="display:flex; gap:10px;"><button class="btn" onclick="Actions.handleLike()">${isLiked?'❤️':'👍'}</button><button class="btn" onclick="Actions.showPlaylistSelector()">➕</button></div> 
                    </div> 
                    <div style="display:flex; align-items:center; gap:15px; margin-top:10px;"> 
                        <img src="${this.channelIcons[chId]||''}" class="channel-icon-mini" onclick="Actions.openChannel('${chId}')"> 
                        <span style="font-weight:bold;">${video.snippet.channelTitle}</span> 
                        <button class="btn" style="background:${isSubbed?'#444':'#fff'}; color:${isSubbed?'#fff':'#000'}" onclick="Actions.handleSub('${chId}','${video.snippet.channelTitle}')">${isSubbed?'登録済み':'登録'}</button> 
                    </div> 
                </div> 
                <div id="related-grid" class="grid"></div> 
            </div>`; 
        const relData = await YT.fetchAPI('search', { q: video.snippet.title, part: 'snippet', type: 'video', maxResults: 12 }); 
        this.relatedList = relData.items; 
        this.renderGrid(this.relatedList, 'related-grid'); 
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle }); 
    }, 

    async openChannel(chId, tab = 'latest') { 
        this.isShortsMode = false; this.showView(); 
        document.getElementById('load-more').style.display = 'none'; 
        const chData = await YT.fetchAPI('channels', { id: chId, part: 'snippet,statistics,brandingSettings' }); 
        const channel = chData.items[0]; 
        this.channelIcons[chId] = channel.snippet.thumbnails.default.url; 

        document.getElementById('view-container').innerHTML = ` 
            <div class="channel-page"> 
                <div class="banner" style="height:150px; background:url(${channel.brandingSettings?.image?.bannerExternalUrl || ''}) center/cover #333;"></div> 
                <div style="padding:20px; display:flex; align-items:center; gap:20px;"> 
                    <img src="${channel.snippet.thumbnails.high.url}" style="width:80px;height:80px;border-radius:50%;"> 
                    <div><h1>${channel.snippet.title}</h1><p>${parseInt(channel.statistics.subscriberCount).toLocaleString()} 登録者</p></div> 
                </div> 
                <div class="ch-tabs"> 
                    <div class="tab ${tab==='latest'?'active':''}" onclick="Actions.openChannel('${chId}','latest')">最新順</div> 
                    <div class="tab ${tab==='popular'?'active':''}" onclick="Actions.openChannel('${chId}','popular')">人気順</div> 
                    <div class="tab ${tab==='playlists'?'active':''}" onclick="Actions.openChannel('${chId}','playlists')">再生リスト</div> 
                </div> 
                <div id="ch-content" class="grid"></div> 
            </div>`; 

        if (tab === 'playlists') { 
            const data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 20 }); 
            document.getElementById('ch-content').innerHTML = data.items.map(p => ` 
                <div class="v-card"> 
                    <div class="thumb-container"><img src="${p.snippet.thumbnails.high.url}" class="main-thumb"></div> 
                    <div class="v-text"><h3>${p.snippet.title}</h3><p>再生リスト</p></div> 
                </div>`).join(''); 
        } else { 
            const order = tab === 'popular' ? 'viewCount' : 'date'; 
            const data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 20 }); 
            this.relatedList = data.items; 
            this.renderGrid(this.relatedList, 'ch-content'); 
        } 
    }, 

    async showSubsPage() { 
        this.isShortsMode = false; this.showView(); 
        const subs = Storage.getSubs(); 
        let html = `<div style="padding:20px;"><h1>🔔 登録チャンネル</h1><div style="display:flex; overflow-x:auto; gap:15px; padding-bottom:15px; border-bottom:1px solid var(--border);">`; 
        if (subs.length === 0) html += `<p>登録なし</p>`; 
        else html += subs.map(ch => `<div class="ch-item" style="cursor:pointer; text-align:center;" onclick="Actions.openChannel('${ch.id}')"><img src="${this.channelIcons[ch.id] || ''}" style="width:60px;height:60px;border-radius:50%;border:2px solid var(--accent);"><br><span style="font-size:11px;">${ch.name}</span></div>`).join(''); 
        html += `</div><h2 style="margin-top:20px;">📅 3日以内の新着</h2><div id="subs-grid" class="grid"></div></div>`; 
        document.getElementById('view-container').innerHTML = html; 

        if (subs.length > 0) { 
            const date = new Date(); date.setDate(date.getDate() - 3); 
            const data = await YT.fetchAPI('search', { part: 'snippet', type: 'video', q: subs.map(s => s.name).join(' OR '), publishedAfter: date.toISOString(), maxResults: 20 }); 
            this.currentList = data.items; 
            this.renderGrid(this.currentList, 'subs-grid'); 
        } 
    }, 

    handleLike() { 
        const v = this.currentVideo; const vId = v.id.videoId || v.id; 
        Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle }); 
        this.isShortsMode ? this.playShort(this.relatedList.findIndex(x => (x.id.videoId||x.id) === vId)) : this.play(v); 
    }, 
    handleSub(id, name) { Storage.toggleSub({ id, name }); this.renderSidebar(); this.isShortsMode ? this.playShort(this.relatedList.findIndex(x => x.snippet.channelId === id)) : this.play(this.currentVideo); }, 
    showPlaylist(name) { 
        this.isShortsMode = false; this.showView(); 
        const items = Storage.getPlaylists()[name] || []; 
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;display:flex;justify-content:space-between;align-items:center;"><h1>📁 ${name}</h1><button class="btn" style="background:#ff4d4d;" onclick="Actions.removeList('${name}')">削除</button></div><div id="pl-grid" class="grid"></div>`; 
        this.renderGridWithDelete(items, 'pl-grid', name); 
    }, 
    showLiked() { 
        this.isShortsMode = false; this.showView(); 
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>👍 高評価</h1><div id="liked-grid" class="grid"></div></div>`; 
        this.renderGridWithDelete(Storage.getLiked(), 'liked-grid', 'LIKED_SPEC'); 
    }, 
    renderGridWithDelete(items, targetId, listName) { 
        document.getElementById(targetId).innerHTML = items.map((item, i) => ` 
            <div class="v-card"> 
                <div onclick="Actions.playFromStorage('${item.id}')"> 
                    <div class="thumb-container"><img src="${item.thumb}" class="main-thumb"></div> 
                    <div class="v-text"><h3>${item.title}</h3><p>${item.channelTitle}</p></div> 
                </div> 
                <button style="background:#ff4d4d;color:white;border:none;border-radius:4px;padding:4px;width:100%;margin-top:8px;cursor:pointer;" onclick="Actions.removeItem('${listName}', '${item.id}')">抜く</button> 
            </div>`).join(''); 
    }, 
    async playFromStorage(id) { const data = await YT.fetchAPI('videos', { id, part: 'snippet' }); if(data.items[0]) this.play(data.items[0]); }, 
    removeItem(listName, vId) { if(listName === 'LIKED_SPEC') Storage.toggleLike({id: vId}); else Storage.removeFromPlaylist(listName, vId); listName==='LIKED_SPEC'?this.showLiked():this.showPlaylist(listName); }, 
    removeList(name) { if(confirm("リストを消す？")) { Storage.deletePlaylist(name); this.renderSidebar(); this.goHome(); } }, 
    playFromList(i, tId) { this.play((tId==='related-grid'||tId==='shorts-grid'||tId==='ch-content'||tId==='subs-grid') ? (this.relatedList[i] || this.currentList[i]) : this.currentList[i]); }, 
    showView() { document.getElementById('main-content').scrollTop = 0; }, 
    promptNewPlaylist() { const n = prompt("名前:"); if(n) { Storage.createPlaylist(n); this.renderSidebar(); } }, 
    showHistory() { 
        const h = Storage.getHistory(); 
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } })); 
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>🕒 履歴</h1><div id="hist-grid" class="grid"></div></div>`; 
        this.renderGrid(this.currentList, 'hist-grid'); 
    }, 
    showPlaylistSelector() { 
        const p = Storage.getPlaylists(); 
        const html = Object.keys(p).map(n => `<div class="nav-item" onclick="Actions.confirmAdd('${n}')">📁 ${n}</div>`).join(''); 
        const m = document.createElement('div'); 
        m.id = "pl-modal"; m.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;justify-content:center;align-items:center;"; 
        m.onclick = (e) => { if(e.target.id==='pl-modal') m.remove(); }; 
        m.innerHTML = `<div style="background:var(--bg-side);padding:20px;border-radius:12px;width:280px;"><h3>保存先</h3>${html || 'なし'}</div>`; 
        document.body.appendChild(m); 
    }, 
    confirmAdd(n) { 
        const v = this.currentVideo; const vId = v.id.videoId || v.id; 
        let p = Storage.getPlaylists(); 
        if(!p[n].find(x => x.id === vId)) p[n].unshift({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle }); 
        localStorage.setItem('yt_playlists', JSON.stringify(p)); 
        document.getElementById('pl-modal').remove(); 
    },
    toggleTheme() {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('yt_theme', next);
    }
}; 
window.onload = () => Actions.init();
