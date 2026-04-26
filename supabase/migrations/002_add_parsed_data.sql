-- Add parsed NormalizedReport data to reports for PDF generation
alter table reports add column if not exists parsed_data jsonb;

-- Add Supabase Storage bucket setup note:
-- Run in Supabase dashboard Storage settings:
-- Create bucket "pdfs" (private)
-- Create bucket "attachments" (private)
