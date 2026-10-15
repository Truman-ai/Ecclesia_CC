/* =========================================================================
   섹션별 '새 컨텐츠' 표시
   - 관리자가 저장하면 words/updates 문서에 그 섹션의 마지막 변경 시각(서버 시각)을 기록
       { kind:'meta', seq:0, hymnal, word, schedule, news }
   - 섹션 페이지를 열면 그 시각을 이 기기의 '본 시각'(localStorage seen_<섹션>)으로 저장
   - 메인에서 변경 시각 > 본 시각이면 '새 컨텐츠가 있습니다' 표시
   - 차트는 Firebase 가 아니라 배포로 바뀌므로, 차트 이미지를 추가하면 STATIC_UPDATES 날짜를 고치세요
   사용: <script src="./updates.js" data-section="hymnal"></script>  (Firebase 초기화 뒤에)
   ========================================================================= */
const STATIC_UPDATES = { chart: Date.parse('2026-09-11T00:00:00+09:00') };
const SECTIONS = ['hymnal', 'word', 'schedule', 'news', 'chart'];

const seenStore = {
  get(sec){ try{ return Number(localStorage.getItem('seen_' + sec)) || 0; }catch(e){ return 0; } },
  set(sec, ms){ try{ if(ms > seenStore.get(sec)) localStorage.setItem('seen_' + sec, String(ms)); }catch(e){} },
  inited(){ try{ return localStorage.getItem('seen_init') === '1'; }catch(e){ return true; } },
  markInited(){ try{ localStorage.setItem('seen_init', '1'); }catch(e){} }
};

function updatesRef(){ return firebase.firestore().collection('words').doc('updates'); }

/* 관리자 저장 직후 호출. 실패해도 저장 자체에는 영향 없음 */
function markSectionUpdated(sec){
  return updatesRef().set({
    kind: 'meta', seq: 0,
    [sec]: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(e => console.warn('updates', e));
}

/* 섹션별 마지막 변경 시각(ms)을 계속 받아봄 */
function watchUpdates(cb){
  const emit = data => {
    const out = { ...STATIC_UPDATES };
    for(const sec of SECTIONS){
      const t = data && data[sec];
      if(t && t.toMillis) out[sec] = t.toMillis();
    }
    cb(out);
  };
  if(typeof firebase === 'undefined' || !firebase.apps.length){ emit(null); return; }
  updatesRef().onSnapshot(
    doc => emit(doc.exists ? doc.data({ serverTimestamps: 'estimate' }) : null),
    err => { console.warn('updates', err); emit(null); }
  );
}

/* 처음 쓰는 기기: 지금까지의 내용은 모두 본 것으로 */
function initSeen(updated){
  if(seenStore.inited()) return;
  for(const sec of SECTIONS) seenStore.set(sec, updated[sec] || 0);
  seenStore.markInited();
}

function hasNew(sec, updated){ return (updated[sec] || 0) > seenStore.get(sec); }

/* 섹션 페이지: 열려 있는 동안 들어오는 변경은 본 것으로 */
(function(){
  const sec = document.currentScript && document.currentScript.dataset.section;
  if(!sec) return;
  watchUpdates(updated => { initSeen(updated); seenStore.set(sec, updated[sec] || 0); });
})();
