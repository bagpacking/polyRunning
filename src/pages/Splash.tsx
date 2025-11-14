import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonPage } from '@ionic/react';
import './Splash.css';

const Splash: React.FC = () => {
  const history = useHistory();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 2초 후 페이드 아웃 시작
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // 2.5초 후 지도 페이지로 이동
    const navigateTimer = setTimeout(() => {
      history.push('/map');
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navigateTimer);
    };
  }, [history]);

  return (
    <IonPage>
      <div className={`splash-container ${fadeOut ? 'fade-out' : ''}`}>
        <div className="splash-image">
          {/* 여기에 스플래시 이미지를 배경으로 사용하거나 img 태그 사용 */}
          <div className="splash-content">
            <h1>앱 로딩 중...</h1>
          </div>
        </div>
      </div>
    </IonPage>
  );
};

export default Splash;

