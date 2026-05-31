-- ══════════════════════════════════════════════════════════════════════
-- HIKO — Streak consecutivi giornalieri
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak_corrente integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_accesso  date;

-- Funzione chiamata al login: aggiorna lo streak e restituisce il valore corrente
CREATE OR REPLACE FUNCTION public.update_streak(uid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ultimo  date;
  v_streak  integer;
  v_oggi    date := CURRENT_DATE;
BEGIN
  SELECT ultimo_accesso, streak_corrente
  INTO   v_ultimo, v_streak
  FROM   profiles
  WHERE  id = uid;

  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_ultimo IS NULL THEN
    -- Prima apertura in assoluto
    v_streak := 1;
  ELSIF v_ultimo = v_oggi - 1 THEN
    -- Accesso ieri → incrementa
    v_streak := v_streak + 1;
  ELSIF v_ultimo < v_oggi - 1 THEN
    -- Gap di più di un giorno → reset
    v_streak := 1;
  END IF;
  -- v_ultimo = v_oggi → già aggiornato oggi, nessun cambio

  UPDATE profiles
  SET    streak_corrente = v_streak,
         ultimo_accesso  = v_oggi
  WHERE  id = uid;

  RETURN v_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak(uuid) TO authenticated;
