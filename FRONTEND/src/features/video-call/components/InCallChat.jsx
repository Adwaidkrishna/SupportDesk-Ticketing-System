import { useState } from 'react';
import styles from './VideoCall.module.css';

export default function InCallChat({ messages, onSendMessage, onClose }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatHeader}>
        <div className={styles.chatTitleGroup}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h3>In-Call Chat</h3>
        </div>
        <button type="button" className={styles.closeChatBtn} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.chatNotice}>
        <span>ℹ️ Messages are temporary for the active call session.</span>
      </div>

      <div className={styles.chatMessagesList}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`${styles.chatMsgItem} ${m.sender === 'agent' ? styles.agentMsg : styles.customerMsg}`}
          >
            <div className={styles.chatMsgHeader}>
              <strong className={styles.chatMsgSender}>{m.senderName}</strong>
              <span className={styles.chatMsgTime}>{m.time}</span>
            </div>
            <p className={styles.chatMsgText}>{m.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.chatInputForm}>
        <input
          type="text"
          className={styles.chatInput}
          placeholder="Type in-call message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className={styles.chatSendBtn}>
          Send
        </button>
      </form>
    </div>
  );
}
