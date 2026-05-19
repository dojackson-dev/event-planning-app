-- Ticket forward codes
-- Allows ticket owners to forward a ticket to someone via phone/email
-- Recipient uses the code to view the ticket QR code

CREATE TABLE IF NOT EXISTS ticket_forward_codes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  code          varchar(8) NOT NULL UNIQUE,
  recipient_phone text,
  recipient_email text,
  created_at    timestamptz DEFAULT now(),
  expires_at    timestamptz DEFAULT (now() + interval '7 days'),
  claimed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ticket_forward_codes_ticket_id ON ticket_forward_codes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_forward_codes_code ON ticket_forward_codes(code);
