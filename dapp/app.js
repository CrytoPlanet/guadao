"use strict";

const elements = {
  connectButton: document.getElementById("connectButton"),
  walletStatus: document.getElementById("walletStatus"),
  walletAddress: document.getElementById("walletAddress"),
  networkStatus: document.getElementById("networkStatus"),
  claimStatus: document.getElementById("claimStatus"),
  networkWarning: document.getElementById("networkWarning"),
  contractAddress: document.getElementById("contractAddress"),
  targetChain: document.getElementById("targetChain"),
  proofsUrl: document.getElementById("proofsUrl"),
  loadProofsUrl: document.getElementById("loadProofsUrl"),
  proofsFile: document.getElementById("proofsFile"),
  proofsStatus: document.getElementById("proofsStatus"),
  recipientAddress: document.getElementById("recipientAddress"),
  claimAmount: document.getElementById("claimAmount"),
  claimProof: document.getElementById("claimProof"),
  fillFromProofs: document.getElementById("fillFromProofs"),
  claimButton: document.getElementById("claimButton"),
  claimResult: document.getElementById("claimResult"),
};

const STATE = {
  provider: null,
  signer: null,
  account: null,
  proofs: null,
  claimed: null,
};

const AIRDROP_ABI = [
  "function claim(address to,uint256 amount,bytes32[] proof)",
  "function claimed(address account) view returns (bool)",
];

function setText(el, value) {
  if (el) {
    el.textContent = value;
  }
}

function shortAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function setStatus(message, kind = "info") {
  const prefix = kind === "error" ? "Error: " : "";
  setText(elements.claimResult, `${prefix}${message}`);
}

function parseProofJson(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !parsed.proofs) {
    throw new Error("Invalid proofs.json format");
  }
  return parsed;
}

function normalizeAddress(address) {
  return address ? address.toLowerCase() : "";
}

function updateClaimStatusLabel() {
  if (!STATE.account || !STATE.proofs) {
    setText(elements.claimStatus, STATE.claimed ? "Claimed" : "-");
    return;
  }
  if (STATE.claimed === true) {
    setText(elements.claimStatus, "Claimed");
    return;
  }
  const entry = STATE.proofs.proofs[normalizeAddress(STATE.account)];
  if (!entry) {
    setText(elements.claimStatus, "Not eligible");
    return;
  }
  setText(elements.claimStatus, "Eligible");
}

async function updateClaimedFlag() {
  if (!STATE.signer || !STATE.account) return;
  const address = elements.contractAddress.value.trim();
  if (!address || !ethers.utils.isAddress(address)) {
    return;
  }
  try {
    const contract = new ethers.Contract(address, AIRDROP_ABI, STATE.signer);
    const claimed = await contract.claimed(STATE.account);
    STATE.claimed = claimed;
    updateClaimStatusLabel();
  } catch (error) {
    setText(elements.claimStatus, "Unknown");
  }
}

function updateNetworkStatus(chainId) {
  if (!chainId) {
    setText(elements.networkStatus, "-");
    return;
  }
  const target = Number(elements.targetChain.value);
  const mismatch = chainId !== target;
  elements.networkWarning.classList.toggle("hidden", !mismatch);
  const suffix = mismatch ? " (mismatch)" : "";
  setText(elements.networkStatus, `${chainId}${suffix}`);
}

async function connectWallet() {
  if (!window.ethereum) {
    setText(elements.walletStatus, "No wallet detected");
    return;
  }
  STATE.provider = new ethers.providers.Web3Provider(window.ethereum);
  const accounts = await STATE.provider.send("eth_requestAccounts", []);
  if (!accounts || !accounts.length) {
    setText(elements.walletStatus, "No account");
    return;
  }
  STATE.account = ethers.utils.getAddress(accounts[0]);
  STATE.signer = STATE.provider.getSigner();
  setText(elements.walletStatus, "Connected");
  setText(elements.walletAddress, shortAddress(STATE.account));
  elements.recipientAddress.value = STATE.account;
  const network = await STATE.provider.getNetwork();
  updateNetworkStatus(network.chainId);
  STATE.claimed = null;
  updateClaimStatusLabel();
  await updateClaimedFlag();
}

async function loadProofsFromUrl() {
  const url = elements.proofsUrl.value.trim();
  if (!url) {
    setText(elements.proofsStatus, "No URL provided.");
    return;
  }
  setText(elements.proofsStatus, "Loading proofs...");
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    STATE.proofs = parseProofJson(JSON.stringify(json));
    setText(elements.proofsStatus, "Proofs loaded.");
    updateClaimStatusLabel();
  } catch (error) {
    setText(elements.proofsStatus, `Failed to load proofs: ${error.message}`);
  }
}

async function loadProofsFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  setText(elements.proofsStatus, "Loading proofs...");
  const reader = new FileReader();
  reader.onload = () => {
    try {
      STATE.proofs = parseProofJson(reader.result);
      setText(elements.proofsStatus, "Proofs loaded.");
      updateClaimStatusLabel();
    } catch (error) {
      setText(elements.proofsStatus, `Failed to parse proofs: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

function fillFromProofs() {
  if (!STATE.proofs) {
    setText(elements.claimResult, "No proofs loaded.");
    return;
  }
  const address = elements.recipientAddress.value.trim();
  if (!ethers.utils.isAddress(address)) {
    setText(elements.claimResult, "Recipient address is invalid.");
    return;
  }
  const entry = STATE.proofs.proofs[normalizeAddress(address)];
  if (!entry) {
    setText(elements.claimResult, "Address not found in proofs.");
    return;
  }
  elements.claimAmount.value = entry.amount;
  elements.claimProof.value = JSON.stringify(entry.proof, null, 2);
  setText(elements.claimResult, "Filled from proofs.json.");
}

async function claimTokens() {
  if (!STATE.signer) {
    setStatus("Connect wallet first.", "error");
    return;
  }
  const address = elements.contractAddress.value.trim();
  if (!ethers.utils.isAddress(address)) {
    setStatus("Invalid contract address.", "error");
    return;
  }
  const recipient = elements.recipientAddress.value.trim();
  if (!ethers.utils.isAddress(recipient)) {
    setStatus("Invalid recipient address.", "error");
    return;
  }
  const amountRaw = elements.claimAmount.value.trim();
  if (!amountRaw) {
    setStatus("Amount is required.", "error");
    return;
  }
  let proof;
  try {
    proof = JSON.parse(elements.claimProof.value.trim() || "[]");
    if (!Array.isArray(proof)) {
      throw new Error("Proof must be an array.");
    }
  } catch (error) {
    setStatus(`Invalid proof: ${error.message}`, "error");
    return;
  }
  const target = Number(elements.targetChain.value);
  const network = await STATE.provider.getNetwork();
  if (network.chainId !== target) {
    setStatus("Wrong network. Switch and retry.", "error");
    return;
  }
  try {
    const contract = new ethers.Contract(address, AIRDROP_ABI, STATE.signer);
    setStatus("Submitting claim...");
    const tx = await contract.claim(recipient, amountRaw, proof);
    setStatus(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    setStatus("Claim successful.");
    await updateClaimedFlag();
  } catch (error) {
    const message = error?.error?.message || error?.data?.message || error?.message || "Claim failed";
    if (message.includes("invalid proof")) {
      setStatus("Proof error. Please verify amount and proof.", "error");
    } else if (message.includes("already claimed")) {
      setStatus("Already claimed for this epoch.", "error");
    } else {
      setStatus(message, "error");
    }
  }
}

function bindEvents() {
  elements.connectButton.addEventListener("click", connectWallet);
  elements.loadProofsUrl.addEventListener("click", loadProofsFromUrl);
  elements.proofsFile.addEventListener("change", loadProofsFromFile);
  elements.fillFromProofs.addEventListener("click", fillFromProofs);
  elements.claimButton.addEventListener("click", claimTokens);
  elements.targetChain.addEventListener("change", () => {
    if (!STATE.provider) return;
    STATE.provider.getNetwork().then((network) => updateNetworkStatus(network.chainId));
  });

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => connectWallet());
    window.ethereum.on("chainChanged", () => connectWallet());
  }
}

bindEvents();
