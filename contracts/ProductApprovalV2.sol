// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ProductApprovalV2 - Poboljšana verzija sa strukturom podataka za materijale
 * 
 * Razlike od V1:
 * - Struktura podataka za materijale (umesto string-a)
 * - Verifikacija iz pouzdanog izvora (certifikati, lab testovi)
 * - Oracles za verifikaciju (Chainlink)
 * - Integracija sa dobavljačima
 */
contract ProductApprovalV2 {
    address public owner;
    address public qualityTester;
    
    // Struktura za materijal sa procentima
    struct Material {
        string name;        // npr. "Vuna", "Viskoza", "Pamuk"
        uint8 percentage;    // npr. 100, 50, 30
        bool verified;       // Da li je verifikovan iz pouzdanog izvora
        address verifiedBy; // Ko je verifikovao (lab, dobavljač, oracle)
        uint256 verifiedAt; // Kada je verifikovano
    }
    
    // Struktura za proizvod
    struct Product {
        bytes32 productId;
        Material[] materials;
        string stage;
        bool approved;
        address approvedBy;
        uint256 approvedAt;
    }
    
    // Mapping proizvoda
    mapping(bytes32 => Product) public products;
    
    // Pouzdani izvori za verifikaciju (labovi, dobavljači, oracles)
    mapping(address => bool) public trustedVerifiers;
    
    // Eventi
    event ProductApproved(
        bytes32 indexed productId,
        address indexed tester,
        Material[] materials,
        uint256 timestamp
    );
    
    event MaterialVerified(
        bytes32 indexed productId,
        string materialName,
        uint8 percentage,
        address verifiedBy,
        uint256 timestamp
    );
    
    event ProductRejected(
        bytes32 indexed productId,
        address indexed tester,
        string reason,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Samo vlasnik moze menjati postavke");
        _;
    }
    
    modifier onlyTester() {
        require(msg.sender == qualityTester || msg.sender == owner, "Samo tester kvaliteta moze odobriti");
        _;
    }
    
    modifier onlyTrustedVerifier() {
        require(trustedVerifiers[msg.sender] || msg.sender == owner, "Samo pouzdani verifikatori");
        _;
    }
    
    constructor(address _owner, address _qualityTester) {
        owner = _owner != address(0) ? _owner : msg.sender;
        qualityTester = _qualityTester != address(0) ? _qualityTester : msg.sender;
        trustedVerifiers[msg.sender] = true; // Owner je automatski pouzdan
    }
    
    /**
     * Dodaje pouzdanog verifikatora (lab, dobavljač, oracle)
     */
    function addTrustedVerifier(address verifier) external onlyOwner {
        trustedVerifiers[verifier] = true;
    }
    
    /**
     * Uklanja pouzdanog verifikatora
     */
    function removeTrustedVerifier(address verifier) external onlyOwner {
        trustedVerifiers[verifier] = false;
    }
    
    /**
     * Verifikuje materijal proizvoda (poziva lab, dobavljač ili oracle)
     * @param productId ID proizvoda
     * @param materialIndex Indeks materijala u nizu
     * @param percentage Procentualni sastav (npr. 100 za 100% vuna)
     */
    function verifyMaterial(
        bytes32 productId,
        uint256 materialIndex,
        uint8 percentage
    ) external onlyTrustedVerifier {
        Product storage product = products[productId];
        require(product.materials.length > materialIndex, "Materijal ne postoji");
        
        Material storage material = product.materials[materialIndex];
        material.verified = true;
        material.percentage = percentage;
        material.verifiedBy = msg.sender;
        material.verifiedAt = block.timestamp;
        
        emit MaterialVerified(
            productId,
            material.name,
            percentage,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * Registruje proizvod sa materijalima (poziva dizajner ili sistem)
     */
    function registerProduct(
        bytes32 productId,
        string[] memory materialNames,
        uint8[] memory percentages,
        string memory stage
    ) external {
        require(products[productId].productId == bytes32(0), "Proizvod vec postoji");
        
        Product storage product = products[productId];
        product.productId = productId;
        product.stage = stage;
        
        require(materialNames.length == percentages.length, "Nizovi moraju biti iste duzine");
        
        for (uint256 i = 0; i < materialNames.length; i++) {
            product.materials.push(Material({
                name: materialNames[i],
                percentage: percentages[i],
                verified: false,
                verifiedBy: address(0),
                verifiedAt: 0
            }));
        }
    }
    
    /**
     * Proverava da li materijali odgovaraju zahtevima
     * @param productId ID proizvoda
     * @param requiredMaterials Zahtevani materijali (npr. ["Vuna", "Viskoza"])
     * @param requiredPercentages Zahtevani procenti (npr. [100, 0] - 100% vuna, bilo koliko viskoze)
     */
    function checkMaterialsMatch(
        bytes32 productId,
        string[] memory requiredMaterials,
        uint8[] memory requiredPercentages
    ) public view returns (bool) {
        Product storage product = products[productId];
        require(product.productId != bytes32(0), "Proizvod ne postoji");
        
        require(
            requiredMaterials.length == requiredPercentages.length,
            "Nizovi moraju biti iste duzine"
        );
        
        // Proveravamo svaki zahtevani materijal
        for (uint256 i = 0; i < requiredMaterials.length; i++) {
            bool found = false;
            
            // Tražimo materijal u proizvodu
            for (uint256 j = 0; j < product.materials.length; j++) {
                Material memory material = product.materials[j];
                
                // Proveravamo ime materijala
                if (keccak256(bytes(material.name)) == keccak256(bytes(requiredMaterials[i]))) {
                    // Proveravamo da li je verifikovan
                    if (!material.verified) {
                        return false; // Materijal nije verifikovan
                    }
                    
                    // Proveravamo procenat
                    if (requiredPercentages[i] > 0 && material.percentage < requiredPercentages[i]) {
                        return false; // Procenat ne odgovara
                    }
                    
                    found = true;
                    break;
                }
            }
            
            if (!found && requiredPercentages[i] > 0) {
                return false; // Zahtevani materijal nije pronađen
            }
        }
        
        return true;
    }
    
    /**
     * Odobrava proizvod ako su svi uslovi ispunjeni
     */
    function approveProduct(
        bytes32 productId,
        string[] memory requiredMaterials,
        uint8[] memory requiredPercentages
    ) external onlyTester {
        require(productId != bytes32(0), "Product ID ne sme biti prazan");
        
        Product storage product = products[productId];
        require(product.productId != bytes32(0), "Proizvod ne postoji");
        
        // Proveravamo da li je proizvod u fazi testiranja
        require(
            keccak256(bytes(product.stage)) == keccak256(bytes("testing")),
            "Proizvod mora biti u fazi testiranja"
        );
        
        // Proveravamo materijale
        bool materialsOk = checkMaterialsMatch(productId, requiredMaterials, requiredPercentages);
        require(materialsOk, "Materijali ne odgovaraju zahtevima ili nisu verifikovani");
        
        // Proveravamo da li su SVI materijali verifikovani
        for (uint256 i = 0; i < product.materials.length; i++) {
            require(product.materials[i].verified, "Svi materijali moraju biti verifikovani");
        }
        
        // Odobravamo proizvod
        product.approved = true;
        product.approvedBy = msg.sender;
        product.approvedAt = block.timestamp;
        
        emit ProductApproved(
            productId,
            msg.sender,
            product.materials,
            block.timestamp
        );
    }
    
    /**
     * Odbija proizvod sa razlogom
     */
    function rejectProduct(
        bytes32 productId,
        string memory reason
    ) external onlyTester {
        require(productId != bytes32(0), "Product ID ne sme biti prazan");
        
        emit ProductRejected(
            productId,
            msg.sender,
            reason,
            block.timestamp
        );
    }
    
    /**
     * Dobija informacije o proizvodu
     */
    function getProduct(bytes32 productId) external view returns (
        bytes32 id,
        Material[] memory materials,
        string memory stage,
        bool approved,
        address approvedBy,
        uint256 approvedAt
    ) {
        Product storage product = products[productId];
        return (
            product.productId,
            product.materials,
            product.stage,
            product.approved,
            product.approvedBy,
            product.approvedAt
        );
    }
}
