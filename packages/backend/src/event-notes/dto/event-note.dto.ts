export class CreateEventNoteDto {
  content: string;
  reminder_enabled?: boolean;
  reminder_type?: 'days' | 'weeks' | 'date'; // days/weeks before event, or specific date
  reminder_value?: number;                   // number of days or weeks
  reminder_date?: string;                    // ISO date string when type='date'
  reminder_message?: string;                 // custom SMS text
  reminder_phone?: string;                   // destination phone number
  event_date?: string;                       // passed from frontend for computing send_at
}

export class UpdateEventNoteDto {
  content?: string;
  reminder_enabled?: boolean;
  reminder_type?: 'days' | 'weeks' | 'date';
  reminder_value?: number;
  reminder_date?: string;
  reminder_message?: string;
  reminder_phone?: string;
  event_date?: string;
}
