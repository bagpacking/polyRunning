import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonButton,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonProgressBar
} from '@ionic/react';
import {
  notificationsOutline,
  ticketOutline,
  documentTextOutline,
  arrowForwardOutline,
  homeOutline,
  carOutline,
  giftOutline,
  menuOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { useEffect, useRef } from 'react';
import './Tab1.css';

const Tab1: React.FC = () => {
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateButtonPosition = () => {
      const tabBar = document.querySelector('ion-tab-bar');
      if (tabBar && buttonContainerRef.current) {
        // 탭 바의 실제 위치를 가져옴
        const tabBarRect = tabBar.getBoundingClientRect();
        
        // 탭 바의 상단 Y 좌표 (화면 상단에서의 거리)
        const tabBarTop = tabBarRect.top;
        
        // 버튼 컨테이너의 높이를 계산
        const buttonRect = buttonContainerRef.current.getBoundingClientRect();
        const buttonHeight = buttonRect.height;
        
        // 버튼 컨테이너의 하단이 탭 바 상단과 정확히 맞도록
        // top 속성을 사용하여 버튼 컨테이너의 상단 위치를 설정
        // 버튼 컨테이너의 하단 = top + buttonHeight
        // 이 값이 tabBarTop과 같아야 하므로:
        // top = tabBarTop - buttonHeight
        const topValue = tabBarTop - buttonHeight;
        
        buttonContainerRef.current.style.top = `${topValue}px`;
        buttonContainerRef.current.style.bottom = 'auto';
        
        // 디버깅용 콘솔 출력
        console.log('Tab bar top:', tabBarTop);
        console.log('Button height:', buttonHeight);
        console.log('Calculated top:', topValue);
        console.log('Button bottom will be at:', topValue + buttonHeight);
      }
    };

    // 초기 위치 설정
    updateButtonPosition();
    
    // 리사이즈 및 오리엔테이션 변경 이벤트 리스너
    window.addEventListener('resize', updateButtonPosition);
    window.addEventListener('orientationchange', updateButtonPosition);
    
    // Ionic이 탭 바를 렌더링한 후 다시 계산 (약간의 지연)
    const timers = [
      setTimeout(updateButtonPosition, 100),
      setTimeout(updateButtonPosition, 300),
      setTimeout(updateButtonPosition, 500)
    ];

    // MutationObserver로 탭 바 변경 감지
    const observer = new MutationObserver(updateButtonPosition);
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      observer.observe(tabBar, { 
        attributes: true, 
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true
      });
    }

    return () => {
      window.removeEventListener('resize', updateButtonPosition);
      window.removeEventListener('orientationchange', updateButtonPosition);
      timers.forEach(timer => clearTimeout(timer));
      observer.disconnect();
    };
  }, []);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <div className="header-content">
            <div className="logo-section">
              <div className="logo">e<span className="logo-plus">+</span></div>
              <div className="greeting">안녕하세요, 김주유님!</div>
            </div>
            <IonIcon icon={notificationsOutline} className="notification-icon" />
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="home-content">
        {/* 빠른 접근 메뉴 */}
        <IonGrid className="quick-access">
          <IonRow>
            <IonCol size="4" className="quick-access-item">
              <div className="quick-access-icon coupon">
                <span className="icon-text">%</span>
              </div>
              <IonLabel className="quick-access-label">쿠폰</IonLabel>
            </IonCol>
            <IonCol size="4" className="quick-access-item">
              <div className="quick-access-icon point">
                <span className="icon-text">P</span>
              </div>
              <IonLabel className="quick-access-label">GS&POINT</IonLabel>
            </IonCol>
            <IonCol size="4" className="quick-access-item">
              <div className="quick-access-icon history">
                <IonIcon icon={documentTextOutline} />
              </div>
              <IonLabel className="quick-access-label">결제 내역</IonLabel>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* 프로모션 카드 1 - 진행 상황 */}
        <IonCard className="promo-card progress-card">
          <IonCardContent>
            <div className="card-content-wrapper">
              <div className="card-text-section">
                <div className="promo-title">바로주유하고 혜택 받기!</div>
                <div className="progress-amount">0원 / 800,000원</div>
                <IonProgressBar value={0} className="progress-bar" />
              </div>
              <IonIcon icon={arrowForwardOutline} className="card-arrow" />
            </div>
          </IonCardContent>
        </IonCard>

        {/* 프로모션 카드 2 - 이벤트 */}
        <IonCard className="promo-card event-card">
          <IonCardContent>
            <div className="event-tags">
              <span className="tag">#출석체크</span>
              <span className="tag">#매일 출석체크</span>
            </div>
            <div className="event-content">
              <div className="event-text-section">
                <div className="event-title">GS&POINT 즉시 적립 +바로주유 할인쿠폰 혜택</div>
                <div className="event-date">11.01 - 11.30</div>
              </div>
              <div className="event-illustration">
                <div className="calendar-icon">
                  <div className="calendar-month">24년 11월</div>
                  <div className="calendar-checks">
                    <IonIcon icon={checkmarkCircleOutline} />
                    <IonIcon icon={checkmarkCircleOutline} />
                    <IonIcon icon={checkmarkCircleOutline} />
                  </div>
                </div>
                <div className="point-badge">100% 포인트 적립</div>
                <div className="coins">
                  <span className="coin">🪙</span>
                  <span className="coin">🪙</span>
                  <span className="coin">🪙</span>
                </div>
              </div>
            </div>
            <div className="pagination">1/3 &gt;</div>
          </IonCardContent>
        </IonCard>

        {/* 단골 주유소 */}
        <div className="favorite-station">
          <span>단골 주유소 5</span>
          <IonIcon icon={arrowForwardOutline} />
        </div>

        {/* 하단 여백 (버튼 공간 확보) */}
        <div className="bottom-spacer"></div>
      </IonContent>
      
      {/* CTA 버튼 - 하단 고정 */}
      <div ref={buttonContainerRef} className="fixed-button-container">
        <IonButton expand="block" className="main-cta-button">
          <IonIcon icon={carOutline} slot="start" />
          바로주유 하러가기
        </IonButton>
      </div>
    </IonPage>
  );
};

export default Tab1;
