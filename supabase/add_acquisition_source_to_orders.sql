-- Izvor kupovine za analitiku (sajt, društvena mreža, kampanja)
-- Vrednosti: 'website' | 'instagram' | 'facebook' | 'google' | 'newsletter' | null (stari podaci)
alter table orders add column if not exists acquisition_source text;
