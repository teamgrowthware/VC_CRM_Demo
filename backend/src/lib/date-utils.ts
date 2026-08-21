export const getShiftBounds = (date = new Date()) => {
    // Determine the IST calendar date + hour of the given instant (timezone-independent)
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: 'numeric', hour12: false
    }).formatToParts(date);

    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    const year = get('year');
    const month = get('month'); // 1-12
    const day = get('day');
    let hour = get('hour');
    if (hour === 24) hour = 0;

    // If it's before 4 AM IST, it belongs to the previous day's shift.
    // Date.UTC handles month/year rollover automatically when day is decremented.
    const shiftDay = hour < 4 ? day - 1 : day;

    // Normalize to 4 AM UTC (the stored "shift day" marker used across the DB)
    const shiftStart = new Date(Date.UTC(year, month - 1, shiftDay, 4, 0, 0, 0));
    return shiftStart;
};

export const isWeekend = (date = new Date()): boolean => {
    // We use Asia/Kolkata timezone to determine the day
    const options = { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric' } as const;
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    
    const weekday = parts.find(p => p.type === 'weekday')?.value;
    const dayOfMonth = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);

    if (weekday === 'Sunday') return true;
    
    if (weekday === 'Saturday') {
        // Calculate which Saturday of the month it is
        const nthSaturday = Math.ceil(dayOfMonth / 7);
        // 2nd and 4th Saturdays are off
        return nthSaturday === 2 || nthSaturday === 4;
    }

    return false;
};
