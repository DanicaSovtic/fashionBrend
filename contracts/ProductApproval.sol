// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ProductApproval - Pametni ugovor za odobrenje proizvoda od strane testera kvaliteta
 * 
 * Tok: Tester kvaliteta -> proverava rezultate testova od laboranta -> odobrava proizvod -> event se emituje
 * 
 * Uslovi za odobrenje:
 * - Rezultati testova od laboranta moraju odgovarati zahtevanim materijalima (procenti ±5%)
 * - Proizvod mora biti u fazi "testing"
 * - Tester mora biti autorizovan
 */
contract ProductApproval {
    address public owner; // Vlasnik brenda ili admin
    address public qualityTester; // Adresa testera kvaliteta
    
    // Struktura za rezultat testa materijala od laboranta
    struct TestResult {
        string materialName; // npr. "Vuna", "Viskoza"
        uint8 percentage; // 0-100
    }
    
    // Struktura za zahtevani materijal
    struct RequiredMaterial {
        string name; // npr. "Vuna"
        uint8 percentage; // 0-100
    }
    
    // Event za odobrenje proizvoda
    event ProductApproved(
        bytes32 indexed productId,
        address indexed tester,
        string materials,
        uint256 timestamp
    );
    
    // Event za odbijanje proizvoda
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
        require(msg.sender == qualityTester, "Samo tester kvaliteta moze odobriti");
        _;
    }
    
    constructor(address _owner, address _qualityTester) {
        owner = _owner != address(0) ? _owner : msg.sender;
        qualityTester = _qualityTester != address(0) ? _qualityTester : msg.sender;
    }
    
    /**
     * Postavlja adresu testera kvaliteta
     */
    function setQualityTester(address _tester) external onlyOwner {
        qualityTester = _tester;
    }
    
    /**
     * Parsira string materijala u strukturu RequiredMaterial
     * Format: "Vuna 95%, Viskoza 5%"
     */
    function _parseRequiredMaterials(string memory materialsText) 
        private 
        pure 
        returns (RequiredMaterial[] memory) 
    {
        // Jednostavna implementacija - očekuje format "Materijal X%, Materijal Y%"
        // U produkciji bi bilo bolje koristiti orakl ili kompleksniji parser
        bytes memory text = bytes(materialsText);
        
        // Brojimo koliko ima materijala (po broju zareza + 1)
        uint count = 1;
        for (uint i = 0; i < text.length; i++) {
            if (text[i] == bytes1(uint8(44))) { // ','
                count++;
            }
        }
        
        RequiredMaterial[] memory materials = new RequiredMaterial[](count);
        uint materialIndex = 0;
        uint start = 0;
        
        for (uint i = 0; i <= text.length; i++) {
            if (i == text.length || text[i] == bytes1(uint8(44))) { // ',' ili kraj
                // Ekstraktujemo deo između start i i
                uint length = i - start;
                bytes memory part = new bytes(length);
                for (uint j = 0; j < length; j++) {
                    part[j] = text[start + j];
                }
                
                // Parsiramo "Materijal X%" ili "Materijal X"
                string memory partStr = string(part);
                materials[materialIndex] = _parseMaterialPart(partStr);
                materialIndex++;
                
                start = i + 1;
                // Preskačemo razmake posle zareza
                while (start < text.length && text[start] == bytes1(uint8(32))) {
                    start++;
                }
            }
        }
        
        return materials;
    }
    
    /**
     * Parsira jedan deo materijala (npr. "Vuna 95%")
     */
    function _parseMaterialPart(string memory part) 
        private 
        pure 
        returns (RequiredMaterial memory) 
    {
        bytes memory partBytes = bytes(part);
        uint8 percentage = 0;
        string memory name = "";
        
        // Tražimo procenat (broj pre %)
        for (uint i = partBytes.length; i > 0; i--) {
            if (partBytes[i-1] == bytes1(uint8(37))) { // '%'
                // Tražimo broj pre %
                uint numStart = i - 1;
                while (numStart > 0 && partBytes[numStart-1] >= bytes1(uint8(48)) && partBytes[numStart-1] <= bytes1(uint8(57))) {
                    numStart--;
                }
                
                // Ekstraktujemo broj
                uint numLength = i - 1 - numStart;
                bytes memory numBytes = new bytes(numLength);
                for (uint j = 0; j < numLength; j++) {
                    numBytes[j] = partBytes[numStart + j];
                }
                
                percentage = uint8(_stringToUint(string(numBytes)));
                
                // Ime materijala je sve pre broja
                bytes memory nameBytes = new bytes(numStart);
                for (uint j = 0; j < numStart; j++) {
                    nameBytes[j] = partBytes[j];
                }
                name = string(nameBytes);
                
                // Uklanjamo trailing razmake
                name = _trim(name);
                
                break;
            }
        }
        
        return RequiredMaterial({
            name: name,
            percentage: percentage
        });
    }
    
    /**
     * Konvertuje string u uint
     */
    function _stringToUint(string memory s) private pure returns (uint) {
        bytes memory b = bytes(s);
        uint result = 0;
        for (uint i = 0; i < b.length; i++) {
            if (uint8(b[i]) >= 48 && uint8(b[i]) <= 57) {
                result = result * 10 + (uint8(b[i]) - 48);
            }
        }
        return result;
    }
    
    /**
     * Uklanja razmake sa početka i kraja stringa
     */
    function _trim(string memory s) private pure returns (string memory) {
        bytes memory b = bytes(s);
        uint start = 0;
        uint end = b.length;
        
        // Pronađi početak (preskoči razmake)
        while (start < end && b[start] == bytes1(uint8(32))) {
            start++;
        }
        
        // Pronađi kraj (preskoči razmake)
        while (end > start && b[end-1] == bytes1(uint8(32))) {
            end--;
        }
        
        bytes memory result = new bytes(end - start);
        for (uint i = 0; i < end - start; i++) {
            result[i] = b[start + i];
        }
        
        return string(result);
    }
    
    /**
     * Proverava da li se materijali poklapaju (case-insensitive)
     */
    function _materialsMatch(string memory a, string memory b) private pure returns (bool) {
        bytes memory aBytes = bytes(_toLower(a));
        bytes memory bBytes = bytes(_toLower(b));
        
        if (aBytes.length != bBytes.length) {
            return false;
        }
        
        for (uint i = 0; i < aBytes.length; i++) {
            if (aBytes[i] != bBytes[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Konvertuje string u lowercase
     */
    function _toLower(string memory str) private pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            uint8 char = uint8(bStr[i]);
            if (char >= 65 && char <= 90) {
                bLower[i] = bytes1(char + 32); // A-Z -> a-z
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
    
    /**
     * Proverava da li rezultati testova odgovaraju zahtevanim materijalima
     * @param testResults Rezultati testova od laboranta
     * @param requiredMaterialsText Zahtevani materijali kao string (npr. "Vuna 95%, Viskoza 5%")
     * @return bool Da li su svi uslovi ispunjeni
     * @return string Razlog ako nisu ispunjeni
     */
    function validateTestResults(
        TestResult[] memory testResults,
        string memory requiredMaterialsText
    ) public pure returns (bool, string memory) {
        if (testResults.length == 0) {
            return (false, "Nema rezultata testova");
        }
        
        RequiredMaterial[] memory required = _parseRequiredMaterials(requiredMaterialsText);
        
        if (required.length == 0) {
            return (false, "Nema zahtevanih materijala");
        }
        
        // Za svaki zahtevani materijal, proveri da li postoji u rezultatima testova
        for (uint i = 0; i < required.length; i++) {
            bool found = false;
            
            for (uint j = 0; j < testResults.length; j++) {
                if (_materialsMatch(testResults[j].materialName, required[i].name)) {
                    found = true;
                    
                    // Proveri da li se procenti poklapaju (dozvoljavamo razliku od ±5%)
                    uint8 difference = testResults[j].percentage > required[i].percentage
                        ? testResults[j].percentage - required[i].percentage
                        : required[i].percentage - testResults[j].percentage;
                    
                    if (difference > 5) {
                        return (
                            false,
                            string.concat(
                                "Materijal ",
                                required[i].name,
                                ": zahtevano ",
                                _uintToString(required[i].percentage),
                                "%, testirano ",
                                _uintToString(testResults[j].percentage),
                                "%"
                            )
                        );
                    }
                    
                    break;
                }
            }
            
            if (!found) {
                return (
                    false,
                    string.concat("Materijal ", required[i].name, " nije testiran")
                );
            }
        }
        
        return (true, "");
    }
    
    /**
     * Konvertuje uint u string
     */
    function _uintToString(uint v) private pure returns (string memory) {
        if (v == 0) {
            return "0";
        }
        uint j = v;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (v != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(v - v / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            v /= 10;
        }
        return string(bstr);
    }
    
    /**
     * Odobrava proizvod ako su svi uslovi ispunjeni
     * @param productId Hash proizvoda (može biti keccak256 od product_id iz baze)
     * @param testResults Rezultati testova od laboranta
     * @param requiredMaterials Zahtevani materijali (npr. "Vuna 95%, Viskoza 5%")
     * @param currentStage Trenutna faza proizvoda (mora biti "testing")
     */
    function approveProduct(
        bytes32 productId,
        TestResult[] memory testResults,
        string memory requiredMaterials,
        string memory currentStage
    ) external onlyTester {
        require(productId != bytes32(0), "Product ID ne sme biti prazan");
        
        // Proveravamo da li je proizvod u fazi testiranja
        require(
            keccak256(bytes(currentStage)) == keccak256(bytes("testing")),
            "Proizvod mora biti u fazi testiranja"
        );
        
        // Validiraj rezultate testova
        (bool isValid, string memory reason) = validateTestResults(testResults, requiredMaterials);
        require(isValid, reason);
        
        // Emitujemo event
        emit ProductApproved(
            productId,
            msg.sender,
            requiredMaterials,
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
     * Proverava da li je adresa autorizovani tester
     */
    function isAuthorizedTester(address _address) external view returns (bool) {
        return _address == qualityTester;
    }
}
