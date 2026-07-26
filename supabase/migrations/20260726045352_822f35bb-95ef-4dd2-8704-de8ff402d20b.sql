
-- 1. tasks: position for drag-and-drop
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- 2. goals: extend for weekly/monthly/custom + linking
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS linked_habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS linked_category TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_time TEXT;

-- 4. events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  color TEXT DEFAULT 'primary',
  source TEXT NOT NULL DEFAULT 'manual',
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_owner_all" ON public.events;
CREATE POLICY "events_owner_all" ON public.events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.habits; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.goals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.habits REPLICA IDENTITY FULL;
ALTER TABLE public.habit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 6. Trigger to auto-update linked_category goals when a task completes
CREATE OR REPLACE FUNCTION public.recalc_linked_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.category IS NOT NULL THEN
    UPDATE public.goals
      SET current_value = current_value + 1,
          updated_at = now()
      WHERE user_id = NEW.user_id
        AND linked_category = NEW.category
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        AND (start_date IS NULL OR start_date <= CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_recalc_goals ON public.tasks;
CREATE TRIGGER tasks_recalc_goals
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.recalc_linked_goals();

-- Same for habit_logs
CREATE OR REPLACE FUNCTION public.recalc_habit_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.goals
    SET current_value = current_value + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND linked_habit_id = NEW.habit_id
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      AND (start_date IS NULL OR start_date <= CURRENT_DATE);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS habit_logs_recalc_goals ON public.habit_logs;
CREATE TRIGGER habit_logs_recalc_goals
  AFTER INSERT ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.recalc_habit_goals();
