export type DraftType = 'invoice' | 'estimate' | 'contract';

export interface Draft {
  to: string;
  subject: string;
  body: string;
}

export interface DraftContext {
  today: string;
  businessName: string | null;
  /** Public payment page for invoices, when the record has one. */
  payUrl?: string;
}

const money = (n: unknown) =>
  `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateText = (value: unknown) => {
  const d = typeof value === 'string' ? value.slice(0, 10) : '';
  return d
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : null;
};

const greeting = (name: unknown) => {
  const first =
    typeof name === 'string' ? name.trim().split(/\s+/)[0] : undefined;
  return `Hi ${first || 'there'},`;
};

/** A starting point the owner edits and sends themselves; nothing here is sent automatically. */
export function buildDraft(
  type: DraftType,
  record: any,
  ctx: DraftContext,
): Draft {
  const signOff = `Thank you,\n${ctx.businessName || '[Your name]'}`;
  const to = typeof record.client_email === 'string' ? record.client_email : '';

  if (type === 'invoice') {
    const due = dateText(record.due_date);
    const isOverdue =
      typeof record.due_date === 'string' &&
      record.due_date.slice(0, 10) < ctx.today;
    const amount = money(record.amount_due ?? record.total_amount);
    const lines = [
      greeting(record.client_name),
      '',
      isOverdue
        ? `I'm following up on invoice ${record.invoice_number}, for ${amount}, which was due on ${due}.`
        : `This is a friendly reminder that invoice ${record.invoice_number}, for ${amount}${due ? `, is due on ${due}` : ' is coming due'}.`,
    ];
    if (ctx.payUrl)
      lines.push('', `You can view and pay it here: ${ctx.payUrl}`);
    lines.push(
      '',
      "If you've already sent payment, please disregard this note. Let me know if you have any questions.",
      '',
      signOff,
    );
    return {
      to,
      subject: isOverdue
        ? `Invoice ${record.invoice_number} is past due`
        : `Reminder: invoice ${record.invoice_number}`,
      body: lines.join('\n'),
    };
  }

  if (type === 'estimate') {
    const issued = dateText(record.issue_date);
    const expires = dateText(record.expiration_date);
    return {
      to,
      subject: `Following up on estimate ${record.estimate_number}`,
      body: [
        greeting(record.client_name),
        '',
        `I wanted to follow up on estimate ${record.estimate_number} for ${money(record.total_amount)}${issued ? `, which I sent on ${issued}` : ''}.`,
        expires ? `It is valid through ${expires}.` : '',
        '',
        'Do you have any questions, or would you like me to adjust anything? I would be glad to hold your date once you are ready to move forward.',
        '',
        signOff,
      ]
        .filter((l, i, all) => l !== '' || all[i - 1] !== '')
        .join('\n'),
    };
  }

  const title =
    record.title || `contract ${record.contract_number ?? ''}`.trim();
  const sent = dateText(record.sent_date);
  return {
    to,
    subject: `Your contract is waiting for a signature`,
    body: [
      greeting(record.client_name),
      '',
      `I'm following up on ${title}${sent ? `, which I sent on ${sent}` : ''}. It still needs your signature to confirm your booking.`,
      '',
      'You can sign from the link in the email I sent earlier. Let me know if anything is unclear or you need a new copy.',
      '',
      signOff,
    ].join('\n'),
  };
}
