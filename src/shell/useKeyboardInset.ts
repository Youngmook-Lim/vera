import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Android has been edge-to-edge since SDK 54, so `softwareKeyboardLayoutMode`
// (still its default `resize`) never shrinks the window: the IME is simply
// drawn over the bottom of the stage, and the input the subject is typing into
// ends up underneath it. Padding by the live keyboard height is what actually
// moves the input clear.
//
// While the keyboard is up it also covers the gesture strip, so the bottom
// safe-area inset stops being something to reserve — hence max() rather than
// a sum, which would leave a visible gap above the keys.
//
// react-native-keyboard-controller rather than Reanimated's own
// `useAnimatedKeyboard`, which is deprecated in 4.5. It needs `KeyboardProvider`
// at the root (App.tsx) and it is a native module, so it is one more reason
// the dev build has to be recut.
export function useKeyboardInset() {
  const insets = useSafeAreaInsets();
  const keyboard = useReanimatedKeyboardAnimation();
  return useAnimatedStyle(() => {
    // NEGATE. This hook reports height as 0 → −keyboardHeight, because it is
    // built to be dropped straight into `translateY`; the library's own
    // KeyboardAvoidingView does `-reanimated.height.value` for exactly this.
    // Used unnegated, max() below would always pick the safe-area inset and
    // the keyboard would go on covering the input — and no test would catch
    // it, since the jest mock reports 0 either way.
    const lifted = -keyboard.height.value;
    return { paddingBottom: Math.max(insets.bottom, lifted) };
  });
}
