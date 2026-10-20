import * as Notifications from 'expo-notifications';
import { readTapTarget } from '../../modules/advice/notify';
import { MODES } from '../modes/registry';
import { CHANNEL, SLOTS, TITLE, TRANSMISSION_DAYS } from '../transmissions';
import { syncTransmissions } from '../transmissionsNotify';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

const NOW = new Date(2026, 8, 21, 8, 0);

const queued = () => mocked.scheduleNotificationAsync.mock.calls.map(([req]) => req);
const channelsNamed = () => mocked.setNotificationChannelAsync.mock.calls.map(([id]) => id);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

describe('her transmissions', () => {
  it('hands over a fortnight of both slots', async () => {
    await syncTransmissions(true, 'default', NOW);

    const hours = queued().map((r) => r.trigger.date.getHours());
    expect(hours.filter((h) => h === 11)).toHaveLength(TRANSMISSION_DAYS);
    expect(hours.filter((h) => h === 16)).toHaveLength(TRANSMISSION_DAYS);
  });

  // channelId rides on the TRIGGER, not the content. Naming no channel does
  // not fall back to the one just created: Android files the card under expo's
  // own fallback channel instead, at an importance nobody chose.
  it('files every one under her own channel', async () => {
    await syncTransmissions(true, 'default', NOW);

    expect(channelsNamed()).toContain(CHANNEL);
    for (const r of queued()) {
      expect(r.trigger.channelId).toBe(CHANNEL);
    }
  });

  // The id `vera` is poisoned: recreating it restores v1's importance 3 with
  // vibration off, silently.
  it('never recreates the orphaned v1 channel id', async () => {
    await syncTransmissions(true, 'default', NOW);
    expect(channelsNamed()).not.toContain('vera');
  });

  it('carries her name, and a line from the register it was sent in', async () => {
    await syncTransmissions(true, 'supportive', NOW);

    for (const r of queued()) {
      expect(r.content.title).toBe(TITLE);
    }
    const eleven = queued().filter((r) => r.trigger.date.getHours() === 11);
    expect(eleven.length).toBeGreaterThan(0);
    for (const r of eleven) {
      expect(MODES.supportive.transmissions.midday).toContain(r.content.body);
    }
  });

  // The whole reason the register is a parameter rather than read inside
  // `build`. Hardcoding 'default' there must fail here.
  it('changes what is queued when the register changes', async () => {
    await syncTransmissions(true, 'default', NOW);
    const before = queued().map((r) => r.content.body);

    jest.clearAllMocks();
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);

    await syncTransmissions(true, 'supportive', NOW);
    const after = queued().map((r) => r.content.body);

    expect(after.some((line) => before.includes(line))).toBe(false);
  });

  // She uses the seeded planner, and this is the only thing that says so.
  // planDaily draws afresh every sync, so a horizon rewritten each morning
  // would hand the same day a different line each time it was re-planned —
  // which is the defect the seeded planner exists to fix, and it is invisible
  // from inside daily.ts.
  it('queues the same lines for the same days however often it re-plans', async () => {
    await syncTransmissions(true, 'default', NOW);
    const first = queued().map((r) => r.content.body);

    jest.clearAllMocks();
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);

    await syncTransmissions(true, 'default', NOW);

    expect(queued().map((r) => r.content.body)).toEqual(first);
  });

  it('tags the two slots apart, so cancelling one leaves the other', async () => {
    await syncTransmissions(true, 'default', NOW);

    const rooms = new Set(queued().map((r) => r.content.data.room));
    expect(rooms).toEqual(new Set(SLOTS.map((s) => `transmission.${s.slot}`)));
  });

  it('queues nothing when they are switched off', async () => {
    await syncTransmissions(false, 'default', NOW);
    expect(queued()).toHaveLength(0);
  });
});

// A tap on hers must never be read as an index into a room's corpus. The
// advice room is the one that could plausibly over-claim: it widened `owns` to
// catch its own untagged legacy rows.
describe('the rooms do not read her cards', () => {
  it('leaves a transmission of hers alone', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: {
        request: { content: { data: { room: 'transmission.midday', index: 3 } } },
      },
    });

    expect(await readTapTarget()).toBeNull();
  });
});
