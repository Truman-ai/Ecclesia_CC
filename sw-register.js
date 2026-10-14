/* 서비스 워커 등록 + 자동 업데이트 (http/https 에서만; file:// 로 열면 건너뜀)
   - 앱 화면으로 돌아올 때마다 새 버전(sw.js 의 CACHE)이 있는지 확인
   - 새 버전이 적용되면 한 번 새로고침. 음원 재생·띄우기·입력 창이 열려 있으면 다음에 화면으로 돌아올 때 */
(function(){
  if(!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  const sw = navigator.serviceWorker;
  let hadController = !!sw.controller, pendingReload = false;

  function busy(){
    return !!(document.fullscreenElement || document.querySelector('audio, .audioDock, .present-view, .backdrop'));
  }
  function tryReload(){
    if(pendingReload && !busy()){ pendingReload = false; location.reload(); }
  }

  sw.addEventListener('controllerchange', ()=>{
    if(!hadController){ hadController = true; return; } // 첫 설치 때는 새로고침하지 않음
    pendingReload = true; tryReload();
  });

  window.addEventListener('load', ()=>{
    sw.register('./sw.js').then(reg=>{
      document.addEventListener('visibilitychange', ()=>{
        if(document.visibilityState !== 'visible') return;
        tryReload();
        reg.update().catch(()=>{});
      });
    }).catch(()=>{});
  });
})();
