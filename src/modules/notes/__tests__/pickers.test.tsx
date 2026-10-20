import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DayPicker } from '../DayPicker';
import { TimePicker } from '../TimePicker';
import { MINUTE_STEP } from '../schedule';
import { T } from '../strings';

describe('the day picker', () => {
  it('reads Monday first, whatever the days are stored as', async () => {
    const view = await render(<DayPicker days={[]} onChange={() => {}} lang="en" />);

    expect(view.getAllByTestId(/^day-/).map((n) => n.props.testID)).toEqual([
      'day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6', 'day-0',
    ]);

    await view.unmount();
  });

  it('marks the days that are set', async () => {
    const view = await render(<DayPicker days={[1, 0]} onChange={() => {}} lang="en" />);

    expect(view.getByTestId('day-1').props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId('day-0').props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId('day-2').props.accessibilityState.selected).toBe(false);

    await view.unmount();
  });

  it('adds a day on a tap and takes it away on the next', async () => {
    const onChange = jest.fn();
    const view = await render(<DayPicker days={[1]} onChange={onChange} lang="en" />);

    await fireEvent.press(view.getByTestId('day-3'));
    expect(onChange).toHaveBeenLastCalledWith([1, 3]);

    await fireEvent.press(view.getByTestId('day-1'));
    expect(onChange).toHaveBeenLastCalledWith([]);

    await view.unmount();
  });

  it('hands back the days in storage order, not tap order', async () => {
    const onChange = jest.fn();
    const view = await render(<DayPicker days={[5]} onChange={onChange} lang="en" />);

    await fireEvent.press(view.getByTestId('day-0'));
    expect(onChange).toHaveBeenLastCalledWith([0, 5]);

    await view.unmount();
  });

  it('names the days in the reading language', async () => {
    const view = await render(<DayPicker days={[]} onChange={() => {}} lang="ko" />);
    expect(view.getByTestId('day-0')).toHaveTextContent(T.ko.dayNames[0]);
    await view.unmount();
  });
});

describe('the time picker', () => {
  it('shows the hour and the minute it was given', async () => {
    const view = await render(<TimePicker hour={9} minute={30} onChange={() => {}} />);

    expect(view.getByTestId('picked-hour')).toHaveTextContent('09');
    expect(view.getByTestId('picked-minute')).toHaveTextContent('30');

    await view.unmount();
  });

  // Clamping at 23 would make midnight a twenty-three-tap journey.
  it('walks the hour round the clock rather than off the end', async () => {
    const onChange = jest.fn();
    const view = await render(<TimePicker hour={23} minute={0} onChange={onChange} />);

    await fireEvent.press(view.getByTestId('hour-up'));
    expect(onChange).toHaveBeenLastCalledWith({ hour: 0, minute: 0 });

    await view.unmount();
  });

  it('walks the minute round too', async () => {
    const onChange = jest.fn();
    const view = await render(<TimePicker hour={9} minute={0} onChange={onChange} />);

    await fireEvent.press(view.getByTestId('minute-down'));
    expect(onChange).toHaveBeenLastCalledWith({ hour: 9, minute: 60 - MINUTE_STEP });

    await view.unmount();
  });

  it('moves the minute in the step the picker offers', async () => {
    const onChange = jest.fn();
    const view = await render(<TimePicker hour={9} minute={0} onChange={onChange} />);

    await fireEvent.press(view.getByTestId('minute-up'));
    expect(onChange).toHaveBeenLastCalledWith({ hour: 9, minute: MINUTE_STEP });

    await view.unmount();
  });

  it('carries the whole pair, so the two can never disagree', async () => {
    const onChange = jest.fn();
    const view = await render(<TimePicker hour={9} minute={30} onChange={onChange} />);

    await fireEvent.press(view.getByTestId('hour-down'));
    expect(onChange).toHaveBeenLastCalledWith({ hour: 8, minute: 30 });

    await view.unmount();
  });
});
