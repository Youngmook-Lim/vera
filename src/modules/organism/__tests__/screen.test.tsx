import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../../core/store';
import { organism } from '../index';
import { useOrganismStore } from '../store';

// The OS keystore has no jsdom implementation — an in-memory vault is enough.
jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      vault.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      vault.delete(k);
    }),
  };
});

const Screen = organism.Screen;

// `hydrated: true` so the mount's own hydrate() early-returns and leaves the
// fixture's hunger where the test put it.
beforeEach(() => {
  useFacilityStore.setState({ view: 'mod01', lang: 'en' });
  useOrganismStore.setState({ hydrated: true, hunger: 82, hungerAt: null });
});

describe('Module 01', () => {
  it('reports the specimen hungry and how long it has been in care', async () => {
    const view = await render(<Screen />);
    expect(view.getByText('● HUNGRY')).toBeTruthy();
    expect(view.getByText('DAY 13 IN CARE')).toBeTruthy();
    expect(view.getByText('82%')).toBeTruthy();
  });

  it('feeds on a tap', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('vivarium'));
    expect(Math.round(useOrganismStore.getState().hunger)).toBe(41);
  });

  it('changes its mood once it is fed', async () => {
    useOrganismStore.setState({ hunger: 20 });
    const view = await render(<Screen />);
    expect(view.getByText('MOOD · TEMPORARILY PACIFIED')).toBeTruthy();
    expect(view.getByText('SPECIMEN SATIATED · FOR NOW')).toBeTruthy();
  });

  it('keeps the mutation log', async () => {
    const view = await render(<Screen />);
    expect(view.getByText('Developed a third eye. It is watching you specifically.')).toBeTruthy();
  });

  // The doorway rule: one exit, top-left, in the module's own ink.
  it('exits to the stage', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('module-exit'));
    expect(useFacilityStore.getState().view).toBe('stage');
  });

  it('speaks korean when the subject reads korean', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<Screen />);
    expect(view.getByText('보호 13일차')).toBeTruthy();
  });
});
