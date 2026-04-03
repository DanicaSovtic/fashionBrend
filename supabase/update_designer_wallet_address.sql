-- Ažuriranje wallet_address za dizajnera (modni_dizajner)
-- Potrebno za DesignerSupplierContract i DesignerManufacturerContract.

-- 1) Provera: prikaži sve dizajnere (da nađeš user_id ili potvrdiš ime)
SELECT user_id, full_name, role, wallet_address
FROM profiles
WHERE role = 'modni_dizajner';

-- 2) Ažuriraj wallet za konkretnog dizajnera po user_id (zameni UUID i adresu)
-- UPDATE profiles
-- SET wallet_address = '0xTvojaEthereumAdresa'
-- WHERE user_id = 'uuid-dizajnera-ovde';

-- 3) Ili ažuriraj po imenu (ako je jedinstveno)
-- UPDATE profiles
-- SET wallet_address = '0xTvojaEthereumAdresa'
-- WHERE role = 'modni_dizajner' AND full_name ILIKE '%Ime%';

-- 4) Ako imaš samo jednog dizajnera, možeš i ovako (ažurira samo prvog)
-- UPDATE profiles
-- SET wallet_address = '0xTvojaEthereumAdresa'
-- WHERE user_id = (SELECT user_id FROM profiles WHERE role = 'modni_dizajner' LIMIT 1);

-- Primer (odkomentariši i zameni adresu):
-- UPDATE profiles
-- SET wallet_address = '0xed335aD7895c7A7b0B8653007c650b9835E03d8B'
-- WHERE role = 'modni_dizajner';
