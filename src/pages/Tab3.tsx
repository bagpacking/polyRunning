import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonInput,
  IonButton,
  IonIcon
} from '@ionic/react';
import { sendOutline } from 'ionicons/icons';
import { useState, useRef, useEffect } from 'react';
import './Tab3.css';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const Tab3: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: '안녕하세요! 어디로 여행 가고 싶으신가요? 원하는 여행 스타일이나 지역을 알려주세요. 😊',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // AI 응답 시뮬레이션 (1초 후)
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        text: generateAIResponse(inputText),
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const generateAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('제주') || lowerInput.includes('제주도')) {
      return '제주도 추천 여행지:\n\n1. 성산일출봉 - 아름다운 일출 명소\n2. 한라산 - 등산과 자연을 즐길 수 있는 곳\n3. 카멜리아힐 - 사진 찍기 좋은 카페 거리\n4. 협재해수욕장 - 맑은 바다와 흰 모래사장\n\n제주도는 4계절 내내 아름다운 풍경을 자랑합니다. 어떤 계절에 가시나요?';
    } else if (lowerInput.includes('부산') || lowerInput.includes('해운대')) {
      return '부산 추천 여행지:\n\n1. 해운대 해수욕장 - 도심 속 해변 휴양지\n2. 감천문화마을 - 부산의 산토리니\n3. 자갈치시장 - 신선한 회와 해산물\n4. 태종대 - 절경을 감상할 수 있는 곳\n\n부산은 바다와 도시가 어우러진 매력적인 도시입니다!';
    } else if (lowerInput.includes('서울') || lowerInput.includes('경복궁')) {
      return '서울 추천 여행지:\n\n1. 경복궁 - 조선왕조의 대표 궁궐\n2. 북한산 - 도심 속 등산 코스\n3. 한강공원 - 피크닉과 레저 활동\n4. 명동/홍대 - 쇼핑과 맛집 탐방\n\n서울은 전통과 현대가 공존하는 도시입니다!';
    } else if (lowerInput.includes('강원') || lowerInput.includes('속초') || lowerInput.includes('강릉')) {
      return '강원도 추천 여행지:\n\n1. 남이섬 - 자연과 예술이 만나는 곳\n2. 설악산 - 가을 단풍 명소\n3. 정동진 - 해돋이 명소\n4. 평창 알펜시아 - 스키와 리조트\n\n강원도는 자연을 만끽할 수 있는 최고의 여행지입니다!';
    } else if (lowerInput.includes('해변') || lowerInput.includes('바다') || lowerInput.includes('해수욕장')) {
      return '해변 여행 추천지:\n\n1. 제주 협재해수욕장\n2. 부산 해운대 해수욕장\n3. 강원도 정동진 해변\n4. 전남 여수 오동도\n\n바다를 보며 힐링하고 싶으시군요! 어떤 지역을 선호하시나요?';
    } else if (lowerInput.includes('산') || lowerInput.includes('등산') || lowerInput.includes('트레킹')) {
      return '등산/트레킹 추천지:\n\n1. 한라산 (제주) - 정상에서 바다 조망\n2. 설악산 (강원) - 가을 단풍 명소\n3. 북한산 (서울) - 도심 접근성 좋음\n4. 지리산 - 남한 최고봉\n\n등산 코스 난이도나 지역 선호도가 있으신가요?';
    } else if (lowerInput.includes('맛집') || lowerInput.includes('음식') || lowerInput.includes('먹거리')) {
      return '맛집 탐방 추천지:\n\n1. 전주 한옥마을 - 전통 한식\n2. 부산 자갈치시장 - 신선한 회\n3. 제주 흑돼지 거리 - 제주 특산물\n4. 대구 서문시장 - 분식과 떡볶이\n\n어떤 음식을 좋아하시나요? 지역별 특색 있는 맛집을 추천해드릴 수 있습니다!';
    } else {
      return `"${userInput}"에 대한 여행지를 추천해드리겠습니다!\n\n더 구체적인 정보를 알려주시면 더 정확한 추천을 드릴 수 있어요:\n- 선호하는 지역 (제주, 부산, 서울, 강원 등)\n- 여행 스타일 (휴양, 액티비티, 문화 탐방 등)\n- 여행 기간\n- 동행자 (혼자, 커플, 가족 등)\n\n어떤 여행을 꿈꾸고 계신가요? ✈️`;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>AI 여행 추천</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="chat-content">
        <div className="messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-bubble">
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <IonInput
            value={inputText}
            placeholder="여행지 추천을 받고 싶은 곳을 입력하세요..."
            onIonInput={(e) => setInputText(e.detail.value!)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSend();
              }
            }}
            className="chat-input"
          />
          <IonButton
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="send-button"
          >
            <IonIcon icon={sendOutline} />
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
