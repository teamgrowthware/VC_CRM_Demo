export const getShiftBounds = (date = new Date()) => {
    // Use Asia/Kolkata timezone
    const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false } as const;
    const formatter = new Intl.DateTimeFormat('en-US', options);
    let currentHour = parseInt(formatter.format(date), 10);
    if (currentHour === 24) currentHour = 0;
    
    // Create a new date based on the input date
    const shiftStart = new Date(date);
    
    // We need to adjust based on Kolkata time. 
    // If it's before 4 AM in Kolkata, it belongs to the previous day's shift.
    if (currentHour < 4) {
       shiftStart.setDate(shiftStart.getDate() - 1);
    }
    
    // Reset hours to 4 AM UTC to maintain a consistent 24h block in DB
    // Or rather, just set it to 4 AM local time if the DB is agnostic, but since Date methods use local, we should stick to UTC normalization if possible.
    shiftStart.setUTCHours(4, 0, 0, 0);
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
