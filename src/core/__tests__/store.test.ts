import { useFacilityStore } from '../store';

const reset = () =>
  useFacilityStore.setState({
    view: 'stage', cabinetOpen: false, keyPanelOpen: false, confirmingClear: false,
    apiKey: '', emotion: 'dormant', line: '', shown: '', thinking: false, draft: '',
    log: [], impressions: [], cleared: 0, visits: 1, lang: 'en',
  });

describe('the router', () => {
  beforeEach(reset);

  it('starts on the stage, dormant', () => {
    const s = useFacilityStore.getState();
    expect(s.view).toBe('stage');
    expect(s.emotion).toBe('dormant');
    expect(s.apiKey).toBe('');
  });

  it('moves between views', () => {
    useFacilityStore.getState().setView('sys');
    expect(useFacilityStore.getState().view).toBe('sys');
  });

  it('closes the cabinet when a room opens', () => {
    useFacilityStore.setState({ cabinetOpen: true });
    useFacilityStore.getState().setView('mod02');
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
  });
});

describe('stepBack', () => {
  beforeEach(reset);

  it('closes the cabinet before it changes view', () => {
    useFacilityStore.setState({ cabinetOpen: true, view: 'stage' });
    expect(useFacilityStore.getState().stepBack()).toBe(true);
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
    expect(useFacilityStore.getState().view).toBe('stage');
  });

  it('closes the key panel before it changes view', () => {
    useFacilityStore.setState({ keyPanelOpen: true, view: 'sys' });
    expect(useFacilityStore.getState().stepBack()).toBe(true);
    expect(useFacilityStore.getState().keyPanelOpen).toBe(false);
    expect(useFacilityStore.getState().view).toBe('sys');
  });

  it('steps a file back to system, not all the way home', () => {
    useFacilityStore.setState({ view: 'mem' });
    useFacilityStore.getState().stepBack();
    expect(useFacilityStore.getState().view).toBe('sys');

    useFacilityStore.setState({ view: 'soul' });
    useFacilityStore.getState().stepBack();
    expect(useFacilityStore.getState().view).toBe('sys');
  });

  it('steps every other view back to the stage', () => {
    for (const view of ['sys', 'log', 'mod01', 'mod02'] as const) {
      useFacilityStore.setState({ view });
      expect(useFacilityStore.getState().stepBack()).toBe(true);
      expect(useFacilityStore.getState().view).toBe('stage');
    }
  });

  it('lets the OS exit from the stage', () => {
    useFacilityStore.setState({ view: 'stage' });
    expect(useFacilityStore.getState().stepBack()).toBe(false);
  });
});
