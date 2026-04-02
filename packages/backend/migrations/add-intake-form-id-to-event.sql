-- Migration: Link event <-> intake_form bidirectionally
-- event.intake_form_id: which intake form triggered this event
-- intake_forms.event_id: which event was auto-created from this form

ALTER TABLE event
  ADD COLUMN IF NOT EXISTS intake_form_id UUID REFERENCES intake_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_intake_form_id ON event(intake_form_id);

ALTER TABLE intake_forms
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES event(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intake_forms_event_id ON intake_forms(event_id);
