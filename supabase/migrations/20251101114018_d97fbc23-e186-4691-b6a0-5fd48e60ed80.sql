-- Enable realtime for challenge_submissions table
ALTER TABLE challenge_submissions REPLICA IDENTITY FULL;

-- Add the table to the realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'challenge_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE challenge_submissions;
  END IF;
END $$;