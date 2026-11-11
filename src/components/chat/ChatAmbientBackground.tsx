import React from "react";

function ChatAmbientBackgroundInner() {
  return (
    <div className="shadowtalk-chat-ambient" aria-hidden="true" />
  );
}

export const ChatAmbientBackground = React.memo(ChatAmbientBackgroundInner);

