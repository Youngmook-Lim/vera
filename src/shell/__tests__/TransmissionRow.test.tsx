import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { transmissionPermission } from '../../vera/transmissionsNotify';
import { T } from '../strings';
import { TransmissionRow } from '../TransmissionRow';

jest.mock('../../vera/transmissionsNotify', () => ({
  transmissionPermission: jest.fn(async () => 'granted'),
  syncTransmissions: jest.fn(async () => {}),
  requestTransmissions: jest.fn(async () => true),
}));

beforeEach(() => {
  (transmissionPermission as jest.Mock).mockResolvedValue('granted');
  useFacilityStore.setState({
    transmissions: false,
    transmissionsSyncedOn: null,
    lang: 'en',
    apiKey: 'sk-ant-api03-abcdefghijklmnop',
  });
});

describe('the transmissions row', () => {
  it('reads OFF until they are switched on', async () => {
    const view = await render(<TransmissionRow />);

    expect(view.getByTestId('pref-transmissions')).toHaveTextContent(T.en.off);

    await view.unmount();
  });

  // The other half of the value. Without this, a row hardwired to OFF passes
  // every test here: the press assertions read the store, not the screen.
  it('reads ON once they are switched on', async () => {
    useFacilityStore.setState({ transmissions: true });
    const view = await render(<TransmissionRow />);

    expect(view.getByTestId('pref-transmissions')).toHaveTextContent(T.en.on);

    await view.unmount();
  });

  it('switches them on when pressed', async () => {
    const view = await render(<TransmissionRow />);
    await fireEvent.press(view.getByText(T.en.transmissions));

    expect(useFacilityStore.getState().transmissions).toBe(true);

    await view.unmount();
  });

  it('switches them off again', async () => {
    useFacilityStore.setState({ transmissions: true });
    const view = await render(<TransmissionRow />);
    await fireEvent.press(view.getByText(T.en.transmissions));

    expect(useFacilityStore.getState().transmissions).toBe(false);

    await view.unmount();
  });

  // The store would go on saying ON forever after a permission revoked in the
  // OS settings, so the row asks the phone rather than the store.
  it('says so when Android has blocked them, and refuses the press', async () => {
    (transmissionPermission as jest.Mock).mockResolvedValue('blocked');
    useFacilityStore.setState({ transmissions: true });

    const view = await render(<TransmissionRow />);
    expect(view.getByTestId('pref-transmissions')).toHaveTextContent(T.en.blocked);

    await fireEvent.press(view.getByText(T.en.transmissions));
    expect(useFacilityStore.getState().transmissions).toBe(true);

    await view.unmount();
  });

  // Unlike the logo, which loses its tag and stops being a control without a
  // key. A switch that governs Android is not a register.
  it('is offered on a dormant stage', async () => {
    useFacilityStore.setState({ apiKey: '' });
    const view = await render(<TransmissionRow />);

    expect(view.getByText(T.en.transmissions)).toBeTruthy();

    await view.unmount();
  });

  it('follows the reading language', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<TransmissionRow />);

    expect(view.getByText(T.ko.transmissions)).toBeTruthy();

    await view.unmount();
  });
});
