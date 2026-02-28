// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * SupplierManufacturerContract
 *
 * Pametni ugovor između dobavljača materijala i proizvođača.
 * Dobavljač kreira pošiljku (šta šalje + koje materijale skica zahteva).
 * Proizvođač prihvata pošiljku samo ako su svi očekivani materijali iz skice
 * zastupljeni u pošiljci – poređenje se radi u ugovoru.
 *
 * Tok:
 * - Dobavljač: createShipment(shipmentId, manufacturer, productModelId, expectedMaterialHashes, lines)
 *   - expectedMaterialHashes = [keccak256("Lan"), keccak256("Pamuk"), ...] iz skice
 *   - lines = šta se šalje: [{ material: "Lan", color: "bela", quantityKg: 30 }, ...]
 * - Proizvođač: acceptShipment(shipmentId)
 *   - Ugovor proverava: za svaki očekivani materijal postoji bar jedna linija sa tim materijalom
 *   - Ako da → status = Accepted. Ako ne → revert.
 * - Proizvođač može i rejectShipment(shipmentId, reason).
 */
contract SupplierManufacturerContract {
    enum ShipmentStatus {
        None,
        Created,
        Accepted,
        Rejected
    }

    struct ShipmentLine {
        string material;
        string color;
        uint256 quantityKg;
    }

    struct Shipment {
        address supplier;
        address manufacturer;
        bytes32 productModelId; // keccak256(model UUID) za identifikaciju u backendu
        ShipmentStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(bytes32 => Shipment) public shipments;
    mapping(bytes32 => ShipmentLine[]) private shipmentLines;
    /// @notice Očekivani materijali iz skice – hashovi imena (keccak256), da bi acceptShipment mogao da poredi
    mapping(bytes32 => bytes32[]) private expectedMaterialHashes;

    event ShipmentCreated(
        bytes32 indexed shipmentId,
        address indexed supplier,
        address indexed manufacturer,
        bytes32 productModelId,
        uint256 lineCount,
        uint256 expectedCount
    );

    event ShipmentAccepted(bytes32 indexed shipmentId, address indexed manufacturer);
    event ShipmentRejected(bytes32 indexed shipmentId, address indexed manufacturer, string reason);

    error ShipmentDoesNotExist();
    error OnlyManufacturer();
    error InvalidStatus();
    error MissingExpectedMaterial(bytes32 materialHash);

    modifier onlyExisting(bytes32 shipmentId) {
        if (shipments[shipmentId].status == ShipmentStatus.None) revert ShipmentDoesNotExist();
        _;
    }

    /**
     * @param shipmentId  Jedinstveni ID pošiljke (npr. keccak256(bundleId))
     * @param manufacturer  Adresa proizvođača koji prima materijal
     * @param productModelId  keccak256(product_model UUID) za referencu u backendu
     * @param expectedMaterialHashes_  Hashovi imena materijala iz skice (npr. keccak256("Lan"), keccak256("Pamuk"))
     * @param lines  Linije pošiljke – šta dobavljač šalje (materijal, boja, kg)
     */
    function createShipment(
        bytes32 shipmentId,
        address manufacturer,
        bytes32 productModelId,
        bytes32[] calldata expectedMaterialHashes_,
        ShipmentLine[] calldata lines
    ) external {
        if (manufacturer == address(0)) revert("Neispravan proizvodjac");
        if (lines.length == 0) revert("Mora bar jedan materijal");
        if (shipments[shipmentId].status != ShipmentStatus.None) revert("Shipment vec postoji");

        shipments[shipmentId] = Shipment({
            supplier: msg.sender,
            manufacturer: manufacturer,
            productModelId: productModelId,
            status: ShipmentStatus.Created,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        for (uint256 i = 0; i < expectedMaterialHashes_.length; i++) {
            expectedMaterialHashes[shipmentId].push(expectedMaterialHashes_[i]);
        }

        for (uint256 i = 0; i < lines.length; i++) {
            shipmentLines[shipmentId].push(ShipmentLine({
                material: lines[i].material,
                color: lines[i].color,
                quantityKg: lines[i].quantityKg
            }));
        }

        emit ShipmentCreated(
            shipmentId,
            msg.sender,
            manufacturer,
            productModelId,
            lines.length,
            expectedMaterialHashes_.length
        );
    }

    /**
     * Proizvođač prihvata pošiljku. Ugovor proverava da su svi očekivani materijali
     * (iz skice) zastupljeni u linijama pošiljke – poređenje na lancu.
     */
    function acceptShipment(bytes32 shipmentId) external onlyExisting(shipmentId) {
        Shipment storage s = shipments[shipmentId];
        if (msg.sender != s.manufacturer) revert OnlyManufacturer();
        if (s.status != ShipmentStatus.Created) revert InvalidStatus();

        bytes32[] storage expected = expectedMaterialHashes[shipmentId];
        ShipmentLine[] storage lines = shipmentLines[shipmentId];

        for (uint256 i = 0; i < expected.length; i++) {
            bytes32 want = expected[i];
            bool found = false;
            for (uint256 j = 0; j < lines.length; j++) {
                if (keccak256(abi.encodePacked(lines[j].material)) == want) {
                    found = true;
                    break;
                }
            }
            if (!found) revert MissingExpectedMaterial(want);
        }

        s.status = ShipmentStatus.Accepted;
        s.updatedAt = block.timestamp;

        emit ShipmentAccepted(shipmentId, msg.sender);
    }

    function rejectShipment(bytes32 shipmentId, string calldata reason) external onlyExisting(shipmentId) {
        Shipment storage s = shipments[shipmentId];
        if (msg.sender != s.manufacturer) revert OnlyManufacturer();
        if (s.status != ShipmentStatus.Created) revert InvalidStatus();

        s.status = ShipmentStatus.Rejected;
        s.updatedAt = block.timestamp;

        emit ShipmentRejected(shipmentId, msg.sender, reason);
    }

    function getShipment(bytes32 shipmentId)
        external
        view
        returns (
            address supplier,
            address manufacturer,
            bytes32 productModelId,
            ShipmentStatus status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        Shipment memory s = shipments[shipmentId];
        return (s.supplier, s.manufacturer, s.productModelId, s.status, s.createdAt, s.updatedAt);
    }

    function getShipmentLines(bytes32 shipmentId) external view returns (ShipmentLine[] memory) {
        return shipmentLines[shipmentId];
    }

    function getExpectedMaterialHashes(bytes32 shipmentId) external view returns (bytes32[] memory) {
        return expectedMaterialHashes[shipmentId];
    }

    /// @notice Pomocna funkcija za frontend: hash materijala za upoređivanje (isti format kao u createShipment)
    function hashMaterialName(string calldata materialName) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(materialName));
    }
}
