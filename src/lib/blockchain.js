/**
 * Blockchain konfiguracija za modni brend – testnet (Sepolia)
 * Za potrebe testiranja i doktorske disertacije.
 */

import { ethers } from 'ethers'

// Sepolia testnet
export const SEPOLIA_CHAIN_ID = 11155111
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'

export const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainIdDecimal: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia',
  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.sepolia.org', 'https://ethereum-sepolia.publicnode.com'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
}

// Za testnet: fiksna stopa (1 USD ≈ 0.0005 ETH za lakše testiranje)
// RSD_RATE = 118 (RSD po 1 USD) -> totalRsd / 118 = USD, * 0.0005 = ETH
const RSD_PER_USD = 118
const ETH_PER_USD_TESTNET = 0.0005 // približno za demo

/**
 * Konvertuje RSD u Wei (1 ETH = 10^18 wei)
 * @param {number} totalRsd - Ukupan iznos u RSD
 * @param {number} rsdRate - RSD po 1 USD (default iz env ili 118)
 * @param {number} ethPerUsd - Koliko ETH po 1 USD (za testnet ~0.0005)
 */
export const rsdToWei = (totalRsd, rsdRate = RSD_PER_USD, ethPerUsd = ETH_PER_USD_TESTNET) => {
  const usd = totalRsd / rsdRate
  const eth = usd * ethPerUsd
  return ethers.parseEther(eth.toFixed(18))
}

/**
 * Vraća ETH vrednost u čitljivom formatu
 */
export const weiToEth = (wei) => ethers.formatEther(wei)

/**
 * Prebacuje MetaMask na Sepolia testnet
 */
export const switchToSepolia = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }]
    })
    return true
  } catch (err) {
    if (err.code === 4902) {
      // Mreža nije dodata – dodaj je
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [SEPOLIA_NETWORK]
      })
      return true
    }
    throw err
  }
}

/**
 * Proverava da li je trenutna mreža Sepolia
 */
export const isSepolia = async () => {
  if (typeof window === 'undefined' || !window.ethereum) return false
  const chainId = await window.ethereum.request({ method: 'eth_chainId' })
  return chainId === SEPOLIA_CHAIN_ID_HEX
}

/**
 * Product Approval Contract ABI (updated)
 * Koristi JSON format za structs - ethers.js zahteva kompletan ABI
 */
const PRODUCT_APPROVAL_ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "productId",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "materialName",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "percentage",
            "type": "uint8"
          }
        ],
        "internalType": "struct ProductApproval.TestResult[]",
        "name": "testResults",
        "type": "tuple[]"
      },
      {
        "internalType": "string",
        "name": "requiredMaterials",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "currentStage",
        "type": "string"
      }
    ],
    "name": "approveProduct",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "productId",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "rejectProduct",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_address",
        "type": "address"
      }
    ],
    "name": "isAuthorizedTester",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "materialName",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "percentage",
            "type": "uint8"
          }
        ],
        "internalType": "struct ProductApproval.TestResult[]",
        "name": "testResults",
        "type": "tuple[]"
      },
      {
        "internalType": "string",
        "name": "requiredMaterialsText",
        "type": "string"
      }
    ],
    "name": "validateTestResults",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "productId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tester",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "materials",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ProductApproved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "productId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tester",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ProductRejected",
    "type": "event"
  }
]

/**
 * Proverava i vraća trenutni MetaMask account
 */
export const getCurrentMetaMaskAccount = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    })

    if (accounts && accounts.length > 0) {
      return accounts[0]
    }

    // Ako nema povezanih account-a, zatraži povezivanje
    const requestedAccounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })

    return requestedAccounts && requestedAccounts.length > 0 ? requestedAccounts[0] : null
  } catch (error) {
    console.error('Error getting MetaMask account:', error)
    throw error
  }
}

/**
 * Traži od korisnika da prebaci account u MetaMask-u
 */
export const requestAccountSwitch = async (targetAccount = null) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }

  try {
    // Ako je targetAccount specificiran, pokušaj da prebaciš na njega
    // MetaMask ne dozvoljava direktno prebacivanje, ali možemo zatražiti da korisnik ručno prebaci
    if (targetAccount) {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      const currentAccount = accounts && accounts.length > 0 ? accounts[0] : null
      
      if (currentAccount && currentAccount.toLowerCase() !== targetAccount.toLowerCase()) {
        throw new Error(
          `Molimo prebacite MetaMask na account: ${targetAccount}\n\n` +
          `Trenutni account: ${currentAccount}\n` +
          `Kliknite na MetaMask ikonu i izaberite "Tester kvaliteta" account.`
        )
      }
    } else {
      // Ako nije specificiran, samo zatraži povezivanje
      await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
    }
  } catch (error) {
    if (error.message.includes('Molimo prebacite')) {
      throw error
    }
    throw new Error(`Greška pri prebacivanju account-a: ${error.message}`)
  }
}

/**
 * Odobrava proizvod preko smart contracta
 * Smart contract proverava rezultate testova od laboranta i upoređuje sa zahtevanim materijalima
 * @param {string} contractAddress Adresa ProductApproval contracta
 * @param {string} productId UUID proizvoda (konvertuje se u bytes32)
 * @param {Array} testResults Rezultati testova od laboranta [{ materialName: string, percentage: number }, ...]
 * @param {string} requiredMaterials Zahtevani materijali (npr. "Vuna 95%, Viskoza 5%")
 * @param {string} currentStage Trenutna faza (mora biti "testing")
 * @param {string} requiredAccount Opciono: adresa account-a koji treba da potpiše transakciju
 */
export const approveProductOnBlockchain = async (
  contractAddress,
  productId,
  testResults,
  requiredMaterials,
  currentStage = 'testing',
  requiredAccount = null
) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }

  if (!testResults || testResults.length === 0) {
    throw new Error('Rezultati testova su obavezni. Proizvod mora biti testiran pre odobrenja.')
  }

  // Prebacujemo na Sepolia
  await switchToSepolia()

  // Proveri trenutni account i prebaci ako je potrebno
  if (requiredAccount) {
    try {
      await requestAccountSwitch(requiredAccount)
    } catch (error) {
      // Ako korisnik ne prebaci account, prikaži poruku i baci grešku
      throw error
    }
  } else {
    // Ako nije specificiran, samo zatraži povezivanje
    await getCurrentMetaMaskAccount()
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  
  // Proveri trenutni account koji će potpisati transakciju
  const currentAccount = await signer.getAddress()
  console.log('[Blockchain] Current MetaMask account:', currentAccount)
  
  if (requiredAccount && currentAccount.toLowerCase() !== requiredAccount.toLowerCase()) {
    throw new Error(
      `Molimo prebacite MetaMask na "Tester kvaliteta" account.\n\n` +
      `Trenutni account: ${currentAccount}\n` +
      `Potreban account: ${requiredAccount}\n\n` +
      `Kliknite na MetaMask ikonu i izaberite "Tester kvaliteta" account, zatim pokušajte ponovo.`
    )
  }
  
  // Proveri da li contract postoji na adresi
  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    throw new Error(`Smart contract nije deploy-ovan na adresi ${contractAddress}. Proveri da li si deploy-ovao contract na Sepolia testnet.`)
  }

  const contract = new ethers.Contract(contractAddress, PRODUCT_APPROVAL_ABI, signer)

  // Proveri da li funkcija postoji
  if (!contract.approveProduct) {
    throw new Error('Funkcija approveProduct ne postoji u contractu. Proveri da li si deploy-ovao ispravnu verziju ProductApproval.sol.')
  }

  // Konvertujemo UUID u bytes32
  const productIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(productId))

  // Konvertujemo rezultate testova u format koji smart contract očekuje
  const testResultsStruct = testResults.map(tr => ({
    materialName: tr.material_name || tr.materialName,
    percentage: tr.percentage
  }))

  console.log('[Blockchain] Calling approveProduct with:', {
    productId: productId,
    productIdBytes32: productIdBytes32,
    testResults: testResultsStruct,
    requiredMaterials: requiredMaterials,
    currentStage: currentStage,
    contractAddress: contractAddress
  })

  // Pozivamo smart contract - on će proveriti da li rezultati testova odgovaraju zahtevima
  const tx = await contract.approveProduct(
    productIdBytes32,
    testResultsStruct,
    requiredMaterials,
    currentStage
  )

  // Čekamo potvrdu transakcije
  const receipt = await tx.wait()

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString()
  }
}

// ----- DesignerSupplierContract (zahtev za materijal: dizajner -> dobavljač) -----

const DESIGNER_SUPPLIER_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "requestId", "type": "bytes32" },
      { "internalType": "address", "name": "supplier", "type": "address" },
      { "internalType": "uint256", "name": "totalPriceWei", "type": "uint256" },
      {
        "components": [
          { "internalType": "string", "name": "materialName", "type": "string" },
          { "internalType": "uint256", "name": "quantityKg", "type": "uint256" }
        ],
        "internalType": "struct DesignerSupplierContract.MaterialLine[]",
        "name": "materials",
        "type": "tuple[]"
      }
    ],
    "name": "createRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "requestId", "type": "bytes32" }],
    "name": "fundRequest",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "requestId", "type": "bytes32" }],
    "name": "acceptRequest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "requestId", "type": "bytes32" }],
    "name": "getRequest",
    "outputs": [
      { "internalType": "address", "name": "designer", "type": "address" },
      { "internalType": "address", "name": "supplier", "type": "address" },
      { "internalType": "uint256", "name": "totalPriceWei", "type": "uint256" },
      { "internalType": "uint8", "name": "status", "type": "uint8" },
      { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
      { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "requestId", "type": "bytes32" }],
    "name": "getRequestLines",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "materialName", "type": "string" },
          { "internalType": "uint256", "name": "quantityKg", "type": "uint256" }
        ],
        "internalType": "struct DesignerSupplierContract.MaterialLine[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// Podešavanja za gas za DesignerSupplierContract
// Pokušavamo prvo da procenimo gas, pa ga pomnožimo sa ovim faktorom.
// Ako procena padne, koristimo fallback vrednost.
const DESIGNER_SUPPLIER_GAS_MULTIPLIER = 2n
const DESIGNER_SUPPLIER_FALLBACK_GAS = 600000n

/**
 * Jedan zahtev (bundle) = jedan requestId. Iz bundle UUID-a (string) dobija bytes32 za ugovor.
 * @param {string} bundleId UUID bundle-a iz baze
 * @returns {string} Hex string bytes32 (0x...)
 */
export const requestIdFromBundleId = (bundleId) => {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(bundleId))
  return hash
}

/**
 * Kreira zahtev na DesignerSupplierContract (poziva dizajner).
 * @param {string} contractAddress Adresa DesignerSupplierContract
 * @param {string} bundleId UUID bundle-a (isti za sve linije zahteva)
 * @param {string} supplierWallet Ethereum adresa dobavljača
 * @param {bigint|string} totalPriceWei Ukupna cena u wei
 * @param {Array<{ materialName: string, quantityKg: number }>} materials Linije materijala (naziv + kg)
 */
export const createMaterialRequestOnBlockchain = async (
  contractAddress,
  bundleId,
  supplierWallet,
  totalPriceWei,
  materials
) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }
  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    throw new Error(`DesignerSupplierContract nije deploy-ovan na adresi ${contractAddress}`)
  }

  const contract = new ethers.Contract(contractAddress, DESIGNER_SUPPLIER_ABI, signer)
  const requestIdBytes32 = requestIdFromBundleId(bundleId)
  const totalWei = typeof totalPriceWei === 'string' ? BigInt(totalPriceWei) : totalPriceWei
  const materialsStruct = (materials || []).map((m) => ({
    materialName: m.materialName || m.material_name || '',
    quantityKg: BigInt(m.quantityKg ?? m.quantity_kg ?? 0)
  }))
  // Proceni gas pa ga uvećaj, ili koristi fallback
  let gasLimit
  try {
    const estimated = await contract.createRequest.estimateGas(
      requestIdBytes32,
      supplierWallet,
      totalWei,
      materialsStruct
    )
    gasLimit = estimated * DESIGNER_SUPPLIER_GAS_MULTIPLIER
  } catch (err) {
    console.warn('[Blockchain] Gas estimation failed for createRequest, using fallback.', err)
    gasLimit = DESIGNER_SUPPLIER_FALLBACK_GAS
  }

  const tx = await contract.createRequest(requestIdBytes32, supplierWallet, totalWei, materialsStruct, {
    gasLimit
  })
  const receipt = await tx.wait()
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, requestIdHex: requestIdBytes32 }
}

/**
 * Dizajner deponuje sredstva za zahtev (tačno totalPriceWei).
 */
export const fundMaterialRequestOnBlockchain = async (
  contractAddress,
  bundleId,
  totalPriceWei
) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }
  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    throw new Error(`DesignerSupplierContract nije deploy-ovan na adresi ${contractAddress}`)
  }

  const contract = new ethers.Contract(contractAddress, DESIGNER_SUPPLIER_ABI, signer)
  const requestIdBytes32 = requestIdFromBundleId(bundleId)
  const value = typeof totalPriceWei === 'string' ? BigInt(totalPriceWei) : totalPriceWei
  // Proceni gas pa ga uvećaj, ili fallback
  let gasLimit
  try {
    const estimated = await contract.fundRequest.estimateGas(requestIdBytes32, { value })
    gasLimit = estimated * DESIGNER_SUPPLIER_GAS_MULTIPLIER
  } catch (err) {
    console.warn('[Blockchain] Gas estimation failed for fundRequest, using fallback.', err)
    gasLimit = DESIGNER_SUPPLIER_FALLBACK_GAS
  }

  const tx = await contract.fundRequest(requestIdBytes32, {
    value,
    gasLimit
  })
  const receipt = await tx.wait()
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber }
}

/**
 * Dobavljač prihvata zahtev; ugovor prebacuje sredstva na njegov wallet.
 * Nakon uspeha backend umanjuje zalihe u bazi.
 */
export const acceptMaterialRequestOnBlockchain = async (contractAddress, bundleId) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }
  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    throw new Error(`DesignerSupplierContract nije deploy-ovan na adresi ${contractAddress}`)
  }

  const contract = new ethers.Contract(contractAddress, DESIGNER_SUPPLIER_ABI, signer)
  const requestIdBytes32 = requestIdFromBundleId(bundleId)
  // Proceni gas pa ga uvećaj, ili fallback
  let gasLimit
  try {
    const estimated = await contract.acceptRequest.estimateGas(requestIdBytes32)
    gasLimit = estimated * DESIGNER_SUPPLIER_GAS_MULTIPLIER
  } catch (err) {
    console.warn('[Blockchain] Gas estimation failed for acceptRequest, using fallback.', err)
    gasLimit = DESIGNER_SUPPLIER_FALLBACK_GAS
  }

  const tx = await contract.acceptRequest(requestIdBytes32, {
    gasLimit
  })
  const receipt = await tx.wait()
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber }
}

/**
 * Čita status zahteva sa ugovora (0=None, 1=Pending, 2=Funded, 3=Accepted, 4=Rejected, 5=Refunded).
 */
export const getMaterialRequestOnBlockchain = async (contractAddress, bundleId) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }
  await switchToSepolia()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    return null
  }

  const contract = new ethers.Contract(contractAddress, DESIGNER_SUPPLIER_ABI, provider)
  const requestIdBytes32 = requestIdFromBundleId(bundleId)
  const [designer, supplier, totalPriceWei, status, createdAt, updatedAt] = await contract.getRequest(requestIdBytes32)
  const lines = await contract.getRequestLines(requestIdBytes32)
  return {
    designer,
    supplier,
    totalPriceWei: totalPriceWei.toString(),
    status: Number(status),
    createdAt: Number(createdAt),
    updatedAt: Number(updatedAt),
    lines: lines.map((l) => ({ materialName: l.materialName, quantityKg: Number(l.quantityKg) }))
  }
}

// ----- SupplierManufacturerContract (pošiljka dobavljač -> proizvođač) -----

const SUPPLIER_MANUFACTURER_GAS_MULTIPLIER = 2n
const SUPPLIER_MANUFACTURER_FALLBACK_GAS = 600000n

const SUPPLIER_MANUFACTURER_ABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'shipmentId', type: 'bytes32' },
      { internalType: 'address', name: 'manufacturer', type: 'address' },
      { internalType: 'bytes32', name: 'productModelId', type: 'bytes32' },
      { internalType: 'bytes32[]', name: 'expectedMaterialHashes_', type: 'bytes32[]' },
      {
        components: [
          { internalType: 'string', name: 'material', type: 'string' },
          { internalType: 'string', name: 'color', type: 'string' },
          { internalType: 'uint256', name: 'quantityKg', type: 'uint256' }
        ],
        internalType: 'struct SupplierManufacturerContract.ShipmentLine[]',
        name: 'lines',
        type: 'tuple[]'
      }
    ],
    name: 'createShipment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'shipmentId', type: 'bytes32' }],
    name: 'acceptShipment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'shipmentId', type: 'bytes32' },
      { internalType: 'string', name: 'reason', type: 'string' }
    ],
    name: 'rejectShipment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'shipmentId', type: 'bytes32' }],
    name: 'getShipment',
    outputs: [
      { internalType: 'address', name: 'supplier', type: 'address' },
      { internalType: 'address', name: 'manufacturer', type: 'address' },
      { internalType: 'bytes32', name: 'productModelId', type: 'bytes32' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'shipmentId', type: 'bytes32' }],
    name: 'getShipmentLines',
    outputs: [
      {
        components: [
          { internalType: 'string', name: 'material', type: 'string' },
          { internalType: 'string', name: 'color', type: 'string' },
          { internalType: 'uint256', name: 'quantityKg', type: 'uint256' }
        ],
        internalType: 'struct SupplierManufacturerContract.ShipmentLine[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'string', name: 'materialName', type: 'string' }],
    name: 'hashMaterialName',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function'
  }
]

/**
 * shipmentId za ugovor = keccak256(bundleId) – isti princip kao za DesignerSupplier.
 */
export const shipmentIdFromBundleId = (bundleId) => {
  return ethers.keccak256(ethers.toUtf8Bytes(bundleId))
}

/**
 * productModelId (bytes32) za ugovor = keccak256(product_model UUID).
 */
export const productModelIdHash = (productModelUuid) => {
  return ethers.keccak256(ethers.toUtf8Bytes(productModelUuid))
}

/**
 * Kreira pošiljku na SupplierManufacturerContract (poziva dobavljač).
 * @param {string} contractAddress Adresa SupplierManufacturerContract
 * @param {string} bundleId UUID bundle-a (shipment_bundle_id)
 * @param {string} manufacturerWallet Ethereum adresa proizvođača
 * @param {string} productModelUuid UUID modela proizvoda
 * @param {string[]} expectedMaterialHashes Niz bytes32 (hex) hashova imena materijala iz skice
 * @param {Array<{ material: string, color: string, quantityKg: number }>} lines Linije pošiljke
 */
export const createShipmentOnBlockchain = async (
  contractAddress,
  bundleId,
  manufacturerWallet,
  productModelUuid,
  expectedMaterialHashes,
  lines
) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }
  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    throw new Error(`SupplierManufacturerContract nije deploy-ovan na adresi ${contractAddress}`)
  }

  const contract = new ethers.Contract(contractAddress, SUPPLIER_MANUFACTURER_ABI, signer)
  const shipmentIdBytes32 = shipmentIdFromBundleId(bundleId)
  const productModelIdBytes32 = productModelIdHash(productModelUuid)
  const linesStruct = (lines || []).map((l) => ({
    material: l.material || '',
    color: l.color || '',
    quantityKg: BigInt(l.quantityKg ?? l.quantity_kg ?? 0)
  }))
  const expectedHashes = (expectedMaterialHashes || []).map((h) => (typeof h === 'string' && h.startsWith('0x') ? h : ethers.keccak256(ethers.toUtf8Bytes(String(h)))))

  let gasLimit
  try {
    const estimated = await contract.createShipment.estimateGas(
      shipmentIdBytes32,
      manufacturerWallet,
      productModelIdBytes32,
      expectedHashes,
      linesStruct
    )
    gasLimit = estimated * SUPPLIER_MANUFACTURER_GAS_MULTIPLIER
  } catch (err) {
    console.warn('[Blockchain] Gas estimation failed for createShipment, using fallback.', err)
    gasLimit = SUPPLIER_MANUFACTURER_FALLBACK_GAS
  }

  const tx = await contract.createShipment(
    shipmentIdBytes32,
    manufacturerWallet,
    productModelIdBytes32,
    expectedHashes,
    linesStruct,
    { gasLimit }
  )
  const receipt = await tx.wait()
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, shipmentIdHex: shipmentIdBytes32 }
}

/**
 * Proizvođač prihvata pošiljku; ugovor proverava da svi očekivani materijali iz skice postoje u pošiljci.
 */
export const acceptShipmentOnBlockchain = async (contractAddress, bundleId) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }
  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    throw new Error(`SupplierManufacturerContract nije deploy-ovan na adresi ${contractAddress}`)
  }

  const contract = new ethers.Contract(contractAddress, SUPPLIER_MANUFACTURER_ABI, signer)
  const shipmentIdBytes32 = typeof bundleId === 'string' && bundleId.startsWith('0x') ? bundleId : shipmentIdFromBundleId(bundleId)

  let gasLimit
  try {
    const estimated = await contract.acceptShipment.estimateGas(shipmentIdBytes32)
    gasLimit = estimated * SUPPLIER_MANUFACTURER_GAS_MULTIPLIER
  } catch (err) {
    console.warn('[Blockchain] Gas estimation failed for acceptShipment, using fallback.', err)
    gasLimit = SUPPLIER_MANUFACTURER_FALLBACK_GAS
  }

  const tx = await contract.acceptShipment(shipmentIdBytes32, { gasLimit })
  const receipt = await tx.wait()
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber }
}

/**
 * Proizvođač odbija pošiljku.
 */
export const rejectShipmentOnBlockchain = async (contractAddress, bundleId, reason) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }
  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    throw new Error(`SupplierManufacturerContract nije deploy-ovan na adresi ${contractAddress}`)
  }

  const contract = new ethers.Contract(contractAddress, SUPPLIER_MANUFACTURER_ABI, signer)
  const shipmentIdBytes32 = typeof bundleId === 'string' && bundleId.startsWith('0x') ? bundleId : shipmentIdFromBundleId(bundleId)

  let gasLimit
  try {
    const estimated = await contract.rejectShipment.estimateGas(shipmentIdBytes32, reason || '')
    gasLimit = estimated * SUPPLIER_MANUFACTURER_GAS_MULTIPLIER
  } catch (err) {
    console.warn('[Blockchain] Gas estimation failed for rejectShipment, using fallback.', err)
    gasLimit = SUPPLIER_MANUFACTURER_FALLBACK_GAS
  }

  const tx = await contract.rejectShipment(shipmentIdBytes32, reason || '', { gasLimit })
  const receipt = await tx.wait()
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber }
}

/**
 * Čita stanje pošiljke sa ugovora (0=None, 1=Created, 2=Accepted, 3=Rejected).
 */
export const getShipmentOnBlockchain = async (contractAddress, bundleId) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null
  }
  await switchToSepolia()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') return null

  const contract = new ethers.Contract(contractAddress, SUPPLIER_MANUFACTURER_ABI, provider)
  const shipmentIdBytes32 = typeof bundleId === 'string' && bundleId.startsWith('0x') ? bundleId : shipmentIdFromBundleId(bundleId)
  const [supplier, manufacturer, productModelId, status, createdAt, updatedAt] = await contract.getShipment(shipmentIdBytes32)
  const lines = await contract.getShipmentLines(shipmentIdBytes32)
  return {
    supplier,
    manufacturer,
    productModelId,
    status: Number(status),
    createdAt: Number(createdAt),
    updatedAt: Number(updatedAt),
    lines: lines.map((l) => ({ material: l.material, color: l.color, quantityKg: Number(l.quantityKg) }))
  }
}


/**
 * Inventory Contract ABI
 */
const INVENTORY_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "material", "type": "string" },
      { "internalType": "string", "name": "color", "type": "string" },
      { "internalType": "uint256", "name": "quantityKg", "type": "uint256" },
      { "internalType": "uint256", "name": "pricePerKg", "type": "uint256" },
      { "internalType": "uint256", "name": "leadTimeDays", "type": "uint256" }
    ],
    "name": "addItem",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "itemId", "type": "uint256" },
      { "internalType": "uint256", "name": "newQuantityKg", "type": "uint256" },
      { "internalType": "uint256", "name": "newPricePerKg", "type": "uint256" }
    ],
    "name": "updateQty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "itemId", "type": "uint256" }],
    "name": "pauseItem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "itemId", "type": "uint256" }],
    "name": "activateItem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "supplier", "type": "address" },
      { "internalType": "uint256", "name": "itemId", "type": "uint256" }
    ],
    "name": "getItem",
    "outputs": [
      { "internalType": "string", "name": "material", "type": "string" },
      { "internalType": "string", "name": "color", "type": "string" },
      { "internalType": "uint256", "name": "quantityKg", "type": "uint256" },
      { "internalType": "uint256", "name": "pricePerKg", "type": "uint256" },
      { "internalType": "uint256", "name": "leadTimeDays", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
      { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "supplier", "type": "address" }],
    "name": "getItemCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "supplier", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "itemId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "material", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "color", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "quantityKg", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "pricePerKg", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "leadTimeDays", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ItemAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "supplier", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "itemId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "quantityKg", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "pricePerKg", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ItemUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "supplier", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "itemId", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "isActive", "type": "bool" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ItemStatusChanged",
    "type": "event"
  }
]

/**
 * Dodaje novu stavku u zalihu na blockchainu
 * @param {string} contractAddress Adresa InventoryContract
 * @param {string} material Naziv materijala
 * @param {string} color Boja
 * @param {number} quantityKg Količina u kilogramima
 * @param {number} pricePerKg Cena po kilogramu (u RSD, konvertuje se u wei)
 * @param {number} leadTimeDays Rok isporuke u danima
 * @returns {Promise<{itemId: number, txHash: string, blockNumber: number}>}
 */
export const addInventoryItemOnBlockchain = async (
  contractAddress,
  material,
  color,
  quantityKg,
  pricePerKg = 0,
  leadTimeDays = 0
) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }

  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  // Proveri da li contract postoji
  const code = await provider.getCode(contractAddress)
  if (code === '0x' || code === '0x0') {
    throw new Error(`Smart contract nije deploy-ovan na adresi ${contractAddress}`)
  }

  const contract = new ethers.Contract(contractAddress, INVENTORY_CONTRACT_ABI, signer)

  // Konvertuj cenu u wei (ako je cena u RSD, koristi se rsdToWei)
  // Za sada, ako je pricePerKg 0, šaljemo 0
  const priceWei = pricePerKg > 0 ? rsdToWei(pricePerKg) : ethers.parseEther('0')

  console.log('[Blockchain] Calling addItem with:', {
    material,
    color,
    quantityKg,
    pricePerKg,
    priceWei: priceWei.toString(),
    leadTimeDays,
    contractAddress
  })

  const tx = await contract.addItem(
    material,
    color,
    ethers.parseEther(quantityKg.toString()), // Konvertuj kg u wei format za preciznost
    priceWei,
    leadTimeDays
  )

  const receipt = await tx.wait()

  // Pronađi itemId iz eventa
  const event = receipt.logs.find(log => {
    try {
      const parsed = contract.interface.parseLog(log)
      return parsed && parsed.name === 'ItemAdded'
    } catch {
      return false
    }
  })

  let itemId = null
  if (event) {
    const parsed = contract.interface.parseLog(event)
    itemId = parsed.args.itemId.toString()
  }

  return {
    itemId: itemId || 'unknown',
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  }
}

/**
 * Ažurira količinu i/ili cenu stavke na blockchainu
 * @param {string} contractAddress Adresa InventoryContract
 * @param {number} itemId ID stavke
 * @param {number} newQuantityKg Nova količina (0 = ne menja se)
 * @param {number} newPricePerKg Nova cena (0 = ne menja se)
 * @returns {Promise<{txHash: string, blockNumber: number}>}
 */
export const updateInventoryItemOnBlockchain = async (
  contractAddress,
  itemId,
  newQuantityKg = 0,
  newPricePerKg = 0
) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }

  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const contract = new ethers.Contract(contractAddress, INVENTORY_CONTRACT_ABI, signer)

  const quantityWei = newQuantityKg > 0 ? ethers.parseEther(newQuantityKg.toString()) : ethers.parseEther('0')
  const priceWei = newPricePerKg > 0 ? rsdToWei(newPricePerKg) : ethers.parseEther('0')

  console.log('[Blockchain] Calling updateQty with:', {
    itemId,
    newQuantityKg,
    quantityWei: quantityWei.toString(),
    newPricePerKg,
    priceWei: priceWei.toString()
  })

  const tx = await contract.updateQty(itemId, quantityWei, priceWei)
  const receipt = await tx.wait()

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  }
}

/**
 * Pauzira stavku na blockchainu
 */
export const pauseInventoryItemOnBlockchain = async (contractAddress, itemId) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }

  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const contract = new ethers.Contract(contractAddress, INVENTORY_CONTRACT_ABI, signer)

  const tx = await contract.pauseItem(itemId)
  const receipt = await tx.wait()

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  }
}

/**
 * Aktivira pauziranu stavku na blockchainu
 */
export const activateInventoryItemOnBlockchain = async (contractAddress, itemId) => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask nije instaliran')
  }

  await switchToSepolia()
  await getCurrentMetaMaskAccount()

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const contract = new ethers.Contract(contractAddress, INVENTORY_CONTRACT_ABI, signer)

  const tx = await contract.activateItem(itemId)
  const receipt = await tx.wait()

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber
  }
}
