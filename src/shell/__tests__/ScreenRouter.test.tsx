import { act, render } from '@testing-library/react-native';
import React from 'react';
import { BackHandler } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { ScreenRouter } from '../ScreenRouter';

beforeEach(() => {
  jest.restoreAllMocks();
  useFacilityStore.setState({
    view: 'stage', lang: 'en', emotion: 'dormant', cabinetOpen: false, keyPanelOpen: false,
  });
});

test('the stage is what she boots into', async () => {
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText('DORMANT')).toBeTruthy();
});

test('every other view renders behind her for now', async () => {
  useFacilityStore.setState({ view: 'sys' });
  const { getByTestId, queryByText } = await render(<ScreenRouter />);
  expect(getByTestId('view-sys')).toBeTruthy();
  expect(queryByText('DORMANT')).toBeNull();
});

test('hardware back is one step out, and only the stage lets the OS exit', async () => {
  const spy = jest.spyOn(BackHandler, 'addEventListener');
  useFacilityStore.setState({ view: 'mem' });
  await render(<ScreenRouter />);
  const handler = spy.mock.calls[0][1] as () => boolean;
  // The store update re-renders the router, so each press goes through act.
  const back = async () => {
    let consumed = false;
    await act(async () => {
      consumed = handler();
    });
    return consumed;
  };

  expect(await back()).toBe(true);
  expect(useFacilityStore.getState().view).toBe('sys');
  expect(await back()).toBe(true);
  expect(useFacilityStore.getState().view).toBe('stage');
  expect(await back()).toBe(false);
});
