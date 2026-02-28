-- Polja za pametni ugovor DesignerManufacturerContract (završetak šivenja)
-- Cena po komadu (RSD) koju proizvođač unosi pri "Završi šivenje"; completionId za referencu na ugovor.

ALTER TABLE sewing_orders
  ADD COLUMN IF NOT EXISTS price_per_piece_rsd numeric,
  ADD COLUMN IF NOT EXISTS contract_completion_id_hex text;

COMMENT ON COLUMN sewing_orders.price_per_piece_rsd IS 'Cena po komadu u RSD koju je proizvođač uneo pri završetku šivenja (za ugovor dizajner–proizvođač).';
COMMENT ON COLUMN sewing_orders.contract_completion_id_hex IS 'bytes32 completionId (hex) iz DesignerManufacturerContract za ovaj nalog.';
