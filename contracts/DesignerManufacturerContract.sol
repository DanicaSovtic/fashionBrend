// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * DesignerManufacturerContract
 *
 * Pametni ugovor između modnog dizajnera i proizvođača za završetak šivenja.
 * Proizvođač kreira zapis o završenom nalogu (slika + cena po komadu u aplikaciji).
 * Dizajner pregleda sliku i bira:
 *   - "Pusti na testiranje" → prenos sredstava sa dizajnera na proizvođača (ugovor uspešan).
 *   - "Vrati na doradu" → bez prenosa, ugovor nije uspešan.
 *
 * Cena usluge = broj komada × cena po komadu (zadaje proizvođač pri kreiranju).
 */
contract DesignerManufacturerContract {
    enum CompletionStatus {
        None,
        PendingDesignerReview,
        ApprovedForTesting,
        ReturnedForRework
    }

    struct SewingCompletion {
        address designer;
        address manufacturer;
        uint256 quantityPieces;
        uint256 pricePerPieceWei;
        uint256 totalAmountWei;
        CompletionStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(bytes32 => SewingCompletion) public completions;

    event SewingCompletionCreated(
        bytes32 indexed completionId,
        address indexed designer,
        address indexed manufacturer,
        uint256 quantityPieces,
        uint256 pricePerPieceWei,
        uint256 totalAmountWei,
        uint256 timestamp
    );

    event DesignerApprovedForTesting(
        bytes32 indexed completionId,
        address indexed designer,
        address indexed manufacturer,
        uint256 amountWei,
        uint256 timestamp
    );

    event DesignerReturnedForRework(
        bytes32 indexed completionId,
        address indexed designer,
        string reason,
        uint256 timestamp
    );

    error CompletionDoesNotExist();
    error OnlyDesigner();
    error InvalidStatus();
    error InvalidAmount();

    modifier onlyExisting(bytes32 completionId) {
        if (completions[completionId].status == CompletionStatus.None) revert CompletionDoesNotExist();
        _;
    }

    /**
     * Proizvođač kreira zapis o završenom šivenju.
     * Ukupna cena = quantityPieces * pricePerPieceWei (računa ugovor).
     *
     * @param completionId  Jedinstveni ID (npr. keccak256(sewing_order_id))
     * @param designer      Adresa dizajnera koji će platiti ako odobri
     * @param quantityPieces Broj sašivenih komada
     * @param pricePerPieceWei Cena po komadu u wei
     */
    function createSewingCompletion(
        bytes32 completionId,
        address designer,
        uint256 quantityPieces,
        uint256 pricePerPieceWei
    ) external {
        if (designer == address(0)) revert("Dizajner ne sme biti nula adresa");
        if (quantityPieces == 0) revert("Broj komada mora biti veci od 0");
        if (pricePerPieceWei == 0) revert("Cena po komadu mora biti veca od 0");
        if (completions[completionId].status != CompletionStatus.None) revert("Completion vec postoji");

        uint256 total = quantityPieces * pricePerPieceWei;

        completions[completionId] = SewingCompletion({
            designer: designer,
            manufacturer: msg.sender,
            quantityPieces: quantityPieces,
            pricePerPieceWei: pricePerPieceWei,
            totalAmountWei: total,
            status: CompletionStatus.PendingDesignerReview,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit SewingCompletionCreated(
            completionId,
            designer,
            msg.sender,
            quantityPieces,
            pricePerPieceWei,
            total,
            block.timestamp
        );
    }

    /**
     * Dizajner odobrava proizvod za testiranje i plaća proizvođača.
     * msg.value mora biti tačno jednak totalAmountWei za ovaj completion.
     */
    function designerApproveForTesting(bytes32 completionId) external payable onlyExisting(completionId) {
        SewingCompletion storage c = completions[completionId];
        if (msg.sender != c.designer) revert OnlyDesigner();
        if (c.status != CompletionStatus.PendingDesignerReview) revert InvalidStatus();
        if (msg.value != c.totalAmountWei) revert InvalidAmount();

        c.status = CompletionStatus.ApprovedForTesting;
        c.updatedAt = block.timestamp;

        (bool success, ) = payable(c.manufacturer).call{value: msg.value}("");
        require(success, "Transfer ka proizvodjacu nije uspeo");

        emit DesignerApprovedForTesting(
            completionId,
            msg.sender,
            c.manufacturer,
            msg.value,
            block.timestamp
        );
    }

    /**
     * Dizajner vraća proizvod na doradu. Novac se ne prenosi.
     */
    function designerReturnForRework(bytes32 completionId, string calldata reason) external onlyExisting(completionId) {
        SewingCompletion storage c = completions[completionId];
        if (msg.sender != c.designer) revert OnlyDesigner();
        if (c.status != CompletionStatus.PendingDesignerReview) revert InvalidStatus();

        c.status = CompletionStatus.ReturnedForRework;
        c.updatedAt = block.timestamp;

        emit DesignerReturnedForRework(completionId, msg.sender, reason, block.timestamp);
    }

    /**
     * Pregled zapisa o završenom šivenju.
     */
    function getCompletion(bytes32 completionId)
        external
        view
        returns (
            address designer,
            address manufacturer,
            uint256 quantityPieces,
            uint256 pricePerPieceWei,
            uint256 totalAmountWei,
            CompletionStatus status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        SewingCompletion memory c = completions[completionId];
        return (
            c.designer,
            c.manufacturer,
            c.quantityPieces,
            c.pricePerPieceWei,
            c.totalAmountWei,
            c.status,
            c.createdAt,
            c.updatedAt
        );
    }

    /**
     * Pomocna funkcija: generisanje completionId iz string ID-a (npr. UUID naloga iz baze).
     */
    function completionIdFromString(string calldata sewingOrderId) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(sewingOrderId));
    }
}
