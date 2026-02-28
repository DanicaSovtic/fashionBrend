// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * DesignerSupplierContract
 *
 * Pametni ugovor koji povezuje modnog dizajnera (vlasnika brenda)
 * i dobavljača materijala oko narudžbine materijala.
 *
 * Tok:
 * - Dizajner kreira zahtev za materijal (količine u kg, dobavljač, ukupna cena u wei)
 * - Dizajner deponuje sredstva za taj zahtev u ugovor (fundRequest)
 * - Dobavljač prihvata zahtev (acceptRequest)
 *   - Ugovor proverava da li su sredstva deponovana
 *   - Prenosi sredstva na dobavljačev wallet
 *   - Backend paralelno proverava zalihe i umanjuje ih u bazi
 *
 * Napomena:
 * - Provera zaliha dobavljača radi se u backendu (Opcija A),
 *   ugovor ovde samo čuva i izvršava finansijski deo dogovora.
 */
contract DesignerSupplierContract {
    /// @notice Vlasnik ugovora (može biti admin sistema)
    address public owner;

    /// @notice Jedna linija materijala unutar zahteva
    struct MaterialLine {
        string materialName;   // npr. "Lan", "Pamuk"
        uint256 quantityKg;    // količina u kilogramima (zaokružena, dodatna preciznost po potrebi)
    }

    /// @notice Status zahteva
    enum RequestStatus {
        None,
        Pending,   // Kreiran, ali još nije deponovan novac
        Funded,    // Deponovan novac od dizajnera
        Accepted,  // Dobavljač prihvatio, sredstva isplaćena
        Rejected,  // Odbijen (sa ili bez refundacije)
        Refunded   // Novac vraćen dizajneru (bez prihvatanja)
    }

    /// @notice Struktura zahteva
    struct MaterialRequest {
        address designer;       // Wallet modnog dizajnera (vlasnik brenda)
        address supplier;       // Wallet dobavljača materijala
        uint256 totalPriceWei;  // Ukupna cena u wei (npr. konverzija iz RSD)
        RequestStatus status;   // Status zahteva
        uint256 createdAt;      // Vreme kreiranja
        uint256 updatedAt;      // Vreme poslednje promene
    }

    /// @notice requestId (bytes32) -> zahtev
    mapping(bytes32 => MaterialRequest) public requests;

    /// @notice requestId (bytes32) -> linije materijala
    mapping(bytes32 => MaterialLine[]) private requestLines;

    /// @notice Eventi za praćenje toka ugovora
    event RequestCreated(
        bytes32 indexed requestId,
        address indexed designer,
        address indexed supplier,
        uint256 totalPriceWei,
        uint256 timestamp
    );

    event RequestFunded(
        bytes32 indexed requestId,
        address indexed designer,
        uint256 amountWei,
        uint256 timestamp
    );

    event RequestAccepted(
        bytes32 indexed requestId,
        address indexed supplier,
        uint256 amountWei,
        uint256 timestamp
    );

    event RequestRejected(
        bytes32 indexed requestId,
        address indexed by,
        string reason,
        uint256 timestamp
    );

    event RequestRefunded(
        bytes32 indexed requestId,
        address indexed designer,
        uint256 amountWei,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Samo vlasnik moze pozvati");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Kreira novi zahtev za materijal.
     *
     * @param requestId Jedinstveni ID zahteva (preporuka: keccak256(UUID iz baze))
     * @param supplier Adresa dobavljača materijala
     * @param totalPriceWei Ukupna cena u wei (prethodno izracunata u backendu)
     * @param materials Niz linija materijala (naziv + kg) – referentno, ne koristi se za računanje cene
     */
    function createRequest(
        bytes32 requestId,
        address supplier,
        uint256 totalPriceWei,
        MaterialLine[] calldata materials
    ) external {
        require(requestId != bytes32(0), "requestId ne sme biti prazan");
        require(supplier != address(0), "Dobavljac ne sme biti nula adresa");
        require(totalPriceWei > 0, "Cena mora biti veca od 0");
        require(requests[requestId].status == RequestStatus.None, "Zahtev vec postoji");

        MaterialRequest storage req = requests[requestId];
        req.designer = msg.sender;
        req.supplier = supplier;
        req.totalPriceWei = totalPriceWei;
        req.status = RequestStatus.Pending;
        req.createdAt = block.timestamp;
        req.updatedAt = block.timestamp;

        // Sačuvaj linije materijala (samo kao referencu/event)
        for (uint256 i = 0; i < materials.length; i++) {
            requestLines[requestId].push(
                MaterialLine({
                    materialName: materials[i].materialName,
                    quantityKg: materials[i].quantityKg
                })
            );
        }

        emit RequestCreated(
            requestId,
            msg.sender,
            supplier,
            totalPriceWei,
            block.timestamp
        );
    }

    /**
     * Dizajner deponuje sredstva za zahtev.
     * msg.value MORA biti tacno jednak totalPriceWei.
     */
    function fundRequest(bytes32 requestId) external payable {
        MaterialRequest storage req = requests[requestId];
        require(req.status == RequestStatus.Pending, "Zahtev nije u Pending statusu");
        require(req.designer == msg.sender, "Samo dizajner moze deponovati");
        require(msg.value == req.totalPriceWei, "Iznos mora biti jednak totalPriceWei");

        req.status = RequestStatus.Funded;
        req.updatedAt = block.timestamp;

        emit RequestFunded(requestId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * Dobavljač prihvata zahtev.
     * Uslovi:
     * - Zahtev mora biti u statusu Funded
     * - Pozivalac mora biti dobavljac iz zahteva
     * - Ugovor mora imati dovoljno sredstava (msg.value se ne koristi ovde)
     *
     * Na uspeh:
     * - Sredstva se prenose na dobavljaca
     * - Status prelazi u Accepted
     */
    function acceptRequest(bytes32 requestId) external {
        MaterialRequest storage req = requests[requestId];
        require(req.status == RequestStatus.Funded, "Zahtev nije u Funded statusu");
        require(req.supplier == msg.sender, "Samo dobavljac moze prihvatiti");

        uint256 amount = req.totalPriceWei;
        require(address(this).balance >= amount, "Nedovoljno sredstava u ugovoru");

        req.status = RequestStatus.Accepted;
        req.updatedAt = block.timestamp;

        // Efekti pre interakcije
        (bool success, ) = payable(req.supplier).call{value: amount}("");
        require(success, "Transfer ka dobavljacu nije uspeo");

        emit RequestAccepted(requestId, msg.sender, amount, block.timestamp);
    }

    /**
     * Dobavljač ili dizajner mogu odbiti zahtev pre prihvatanja.
     * Ako su sredstva vec deponovana (Funded), mogu se vratiti dizajneru.
     */
    function rejectRequest(bytes32 requestId, string calldata reason) external {
        MaterialRequest storage req = requests[requestId];
        require(
            req.status == RequestStatus.Pending || req.status == RequestStatus.Funded,
            "Zahtev nije u stanju koje se moze odbiti"
        );
        require(
            msg.sender == req.designer || msg.sender == req.supplier || msg.sender == owner,
            "Samo dizajner, dobavljac ili vlasnik mogu odbiti"
        );

        // Ako je bio Funded, vrati sredstva dizajneru
        if (req.status == RequestStatus.Funded && req.totalPriceWei > 0) {
            uint256 amount = req.totalPriceWei;

            req.status = RequestStatus.Refunded;
            req.updatedAt = block.timestamp;

            (bool success, ) = payable(req.designer).call{value: amount}("");
            require(success, "Refund ka dizajneru nije uspeo");

            emit RequestRefunded(requestId, req.designer, amount, block.timestamp);
        } else {
            req.status = RequestStatus.Rejected;
            req.updatedAt = block.timestamp;
        }

        emit RequestRejected(requestId, msg.sender, reason, block.timestamp);
    }

    /**
     * Pregled svih linija materijala za dati zahtev.
     * Vraća ceo niz MaterialLine struktura.
     */
    function getRequestLines(bytes32 requestId)
        external
        view
        returns (MaterialLine[] memory)
    {
        return requestLines[requestId];
    }

    /**
     * Pomoćna funkcija: vraca osnovne informacije o zahtevu.
     */
    function getRequest(bytes32 requestId)
        external
        view
        returns (
            address designer,
            address supplier,
            uint256 totalPriceWei,
            RequestStatus status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        MaterialRequest memory req = requests[requestId];
        return (
            req.designer,
            req.supplier,
            req.totalPriceWei,
            req.status,
            req.createdAt,
            req.updatedAt
        );
    }
}

