import BotAvatar from './BotAvatar';
import SwapIcon from './SwapIcon';
import ThinkingBot from './ThinkingBot';

/** Shows the thinking robot while the reply is pending, then swaps to the default avatar. */
export default function AssistantAvatar({ thinking }: { thinking: boolean }) {
  return (
    <SwapIcon
      size={28}
      active={thinking ? 'thinking' : 'avatar'}
      icons={{
        thinking: <ThinkingBot size={28} active={thinking} />,
        avatar: <BotAvatar size={28} />,
      }}
    />
  );
}
