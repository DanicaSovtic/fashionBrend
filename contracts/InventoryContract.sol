// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * InventoryContract - Pametni ugovor za zalihe dobavljača materijala
 * Omogućava dobavljačima da upisuju i ažuriraju zalihe na blockchainu
 * 
 * Funkcionalnosti:
 * - addItem: Dodaje novu stavku u zalihu (materijal, boja, kg, cena, rok)
 * - updateQty: Ažurira količinu (kg) postojeće stavke
 * - updatePrice: Ažurira cenu postojeće stavke
 * - pauseItem: Pauzira stavku (status = paused)
 * - activateItem: Aktivira pauziranu stavku
 */
contract InventoryContract {
    address public owner;

    struct InventoryItem {
        string material;
        string color;
        uint256 quantityKg; // u gramima (za preciznost)
        uint256 pricePerKg; // u wei (za preciznost)
        uint256 leadTimeDays;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // Mapping: supplierAddress => itemId => InventoryItem
    mapping(address => mapping(uint256 => InventoryItem)) public inventory;
    
    // Mapping: supplierAddress => nextItemId
    mapping(address => uint256) public nextItemId;

    event ItemAdded(
        address indexed supplier,
        uint256 indexed itemId,
        string material,
        string color,
        uint256 quantityKg,
        uint256 pricePerKg,
        uint256 leadTimeDays,
        uint256 timestamp
    );

    event ItemUpdated(
        address indexed supplier,
        uint256 indexed itemId,
        uint256 quantityKg,
        uint256 pricePerKg,
        uint256 timestamp
    );

    event ItemStatusChanged(
        address indexed supplier,
        uint256 indexed itemId,
        bool isActive,
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
     * Dodaje novu stavku u zalihu
     * @param material Naziv materijala (npr. "Likra")
     * @param color Boja (npr. "Crna")
     * @param quantityKg Količina u kilogramima (konvertuje se u grame)
     * @param pricePerKg Cena po kilogramu (u wei)
     * @param leadTimeDays Rok isporuke u danima
     * @return itemId ID nove stavke
     */
    function addItem(
        string memory material,
        string memory color,
        uint256 quantityKg,
        uint256 pricePerKg,
        uint256 leadTimeDays
    ) external returns (uint256) {
        require(bytes(material).length > 0, "Materijal ne sme biti prazan");
        require(bytes(color).length > 0, "Boja ne sme biti prazna");
        require(quantityKg > 0, "Kolicina mora biti veca od 0");

        uint256 itemId = nextItemId[msg.sender];
        
        inventory[msg.sender][itemId] = InventoryItem({
            material: material,
            color: color,
            quantityKg: quantityKg,
            pricePerKg: pricePerKg,
            leadTimeDays: leadTimeDays,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        nextItemId[msg.sender]++;

        emit ItemAdded(
            msg.sender,
            itemId,
            material,
            color,
            quantityKg,
            pricePerKg,
            leadTimeDays,
            block.timestamp
        );

        return itemId;
    }

    /**
     * Ažurira količinu i/ili cenu postojeće stavke
     * @param itemId ID stavke
     * @param newQuantityKg Nova količina u kilogramima (0 = ne menja se)
     * @param newPricePerKg Nova cena po kilogramu u wei (0 = ne menja se)
     */
    function updateQty(
        uint256 itemId,
        uint256 newQuantityKg,
        uint256 newPricePerKg
    ) external {
        InventoryItem storage item = inventory[msg.sender][itemId];
        require(bytes(item.material).length > 0, "Stavka ne postoji");

        bool updated = false;

        if (newQuantityKg > 0) {
            item.quantityKg = newQuantityKg;
            updated = true;
        }

        if (newPricePerKg > 0) {
            item.pricePerKg = newPricePerKg;
            updated = true;
        }

        if (updated) {
            item.updatedAt = block.timestamp;

            emit ItemUpdated(
                msg.sender,
                itemId,
                item.quantityKg,
                item.pricePerKg,
                block.timestamp
            );
        }
    }

    /**
     * Pauzira stavku (status = paused)
     */
    function pauseItem(uint256 itemId) external {
        InventoryItem storage item = inventory[msg.sender][itemId];
        require(bytes(item.material).length > 0, "Stavka ne postoji");
        require(item.isActive, "Stavka je vec pauzirana");

        item.isActive = false;
        item.updatedAt = block.timestamp;

        emit ItemStatusChanged(msg.sender, itemId, false, block.timestamp);
    }

    /**
     * Aktivira pauziranu stavku
     */
    function activateItem(uint256 itemId) external {
        InventoryItem storage item = inventory[msg.sender][itemId];
        require(bytes(item.material).length > 0, "Stavka ne postoji");
        require(!item.isActive, "Stavka je vec aktivna");

        item.isActive = true;
        item.updatedAt = block.timestamp;

        emit ItemStatusChanged(msg.sender, itemId, true, block.timestamp);
    }

    /**
     * Dobija informacije o stavci
     */
    function getItem(address supplier, uint256 itemId)
        external
        view
        returns (
            string memory material,
            string memory color,
            uint256 quantityKg,
            uint256 pricePerKg,
            uint256 leadTimeDays,
            bool isActive,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        InventoryItem memory item = inventory[supplier][itemId];
        return (
            item.material,
            item.color,
            item.quantityKg,
            item.pricePerKg,
            item.leadTimeDays,
            item.isActive,
            item.createdAt,
            item.updatedAt
        );
    }

    /**
     * Dobija broj stavki za dobavljača
     */
    function getItemCount(address supplier) external view returns (uint256) {
        return nextItemId[supplier];
    }
}
