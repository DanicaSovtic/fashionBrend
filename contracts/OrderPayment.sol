// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * OrderPayment - Pametni ugovor za plaćanja porudžbina modnog brenda
 * Za potrebe testiranja na Sepolia testnetu (doktorska disertacija)
 *
 * Tok: Kupac -> plaća ETH -> event se emituje -> ETH odmah ide vlasniku brenda
 * Vlasnik brenda = owner, dobija sve transakcije direktno na svoju adresu.
 *
 * Ostali učesnici (modni dizajner, tester kvaliteta) - odvojeni ugovori za
 * kvalitet, procenat pamuka itd.
 */
contract OrderPayment {
    address public owner;

    event OrderPaid(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amountWei,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Samo vlasnik moze povuci sredstva");
        _;
    }

    /**
     * @param _brandOwner Adresa vlasnika brenda koja prima sva plaćanja.
     *                    Ako je address(0), koristi se msg.sender (ko deploy-uje).
     */
    constructor(address _brandOwner) {
        owner = _brandOwner != address(0) ? _brandOwner : msg.sender;
    }

    /**
     * Kupac poziva ovu funkciju sa orderId (hash narudžbine) i šalje ETH.
     * ETH odmah ide na adresu vlasnika brenda.
     */
    function payForOrder(bytes32 orderId) external payable {
        require(msg.value > 0, "Iznos mora biti veci od 0");
        require(orderId != bytes32(0), "orderId ne sme biti prazan");

        emit OrderPaid(orderId, msg.sender, msg.value, block.timestamp);

        (bool sent, ) = payable(owner).call{value: msg.value}("");
        require(sent, "Slanje vlasniku brenda nije uspelo");
    }

    /**
     * Vlasnik (brend) povlači ETH ako je neko slučajno poslao direktno na ugovor.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nema sredstava za povlacenje");

        (bool sent, ) = payable(owner).call{value: balance}("");
        require(sent, "Povlacenje nije uspelo");
    }

    /**
     * Pregled stanja na ugovoru (obično 0 jer se ETH odmah prosleđuje)
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
