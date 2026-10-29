import { useRef } from 'react';
import { PanResponder, type GestureResponderHandlers, useWindowDimensions } from 'react-native';
import { claims, settle } from './swipe';

// A swipe right on a card that is otherwise dealt by a tap (2026-10-29): the
// advice and horror rooms' way back. Only a release that settles as `prev`
// does anything; a sideways drag the other way is claimed and dropped, so it
// is not mistaken for the tap that deals. The thresholds are swipe.ts's, the
// same ones the affirmations poster uses.
//
// The responder is built once, so the latest `onBack` and screen width are
// read through refs rather than captured from the first render.
export const useSwipeBack = (onBack: () => void): GestureResponderHandlers => {
  const { width } = useWindowDimensions();
  const widthRef = useRef(width);
  widthRef.current = width;
  const backRef = useRef(onBack);
  backRef.current = onBack;

  return useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => claims(g.dx, g.dy),
      onPanResponderRelease: (_e, g) => {
        if (settle(g.dx, g.vx, widthRef.current) === 'prev') backRef.current();
      },
    }),
  ).current.panHandlers;
};
