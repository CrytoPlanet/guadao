#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { utils, BigNumber } = require("ethers");

const DEFAULT_OUT_DIR = "merkle";

function printHelp() {
  const text = [
    "Usage: node script/GenerateMerkleRoot.js --input <path> [--out-dir <dir>]",
    "",
    "Options:",
    "  --input, -i     Path to snapshot file (.csv or .json)",
    "  --out-dir, -o   Output directory (default: merkle)",
    "  --help, -h      Show this help",
  ].join("\n");
  console.log(text);
}

function exitWith(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { input: null, outDir: DEFAULT_OUT_DIR };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    }
    if (value === "--input" || value === "-i") {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }
    if (value === "--out-dir" || value === "-o") {
      args.outDir = argv[i + 1];
      i += 1;
      continue;
    }
    exitWith(`Unknown argument: ${value}`);
  }
  if (!args.input) {
    printHelp();
    exitWith("Missing --input");
  }
  return args;
}

function normalizeAmount(value) {
  const raw = typeof value === "string" ? value.trim() : String(value);
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Amount must be an integer string, got: ${value}`);
  }
  const bn = BigNumber.from(raw);
  if (bn.lt(0)) {
    throw new Error(`Amount must be non-negative, got: ${value}`);
  }
  return bn.toString();
}

function normalizeAddress(value) {
  if (typeof value !== "string") {
    throw new Error(`Address must be a string, got: ${value}`);
  }
  if (!utils.isAddress(value)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return utils.getAddress(value);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const parts = trimmed.split(",").map((part) => part.trim());
    if (parts.length < 2) {
      exitWith(`Invalid CSV row: "${line}"`);
    }
    if (rows.length === 0 && /address/i.test(parts[0]) && /amount/i.test(parts[1])) {
      continue;
    }
    rows.push({ address: parts[0], amount: parts[1] });
  }
  return rows;
}

function parseJson(text) {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) {
    return parsed.map((entry) => {
      if (Array.isArray(entry)) {
        if (entry.length !== 2) {
          throw new Error("JSON array entries must be [address, amount]");
        }
        return { address: entry[0], amount: entry[1] };
      }
      if (entry && typeof entry === "object") {
        return { address: entry.address, amount: entry.amount };
      }
      throw new Error("JSON entries must be objects or [address, amount] tuples");
    });
  }
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).map(([address, amount]) => ({ address, amount }));
  }
  throw new Error("Unsupported JSON format");
}

function readAllocations(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const text = fs.readFileSync(filePath, "utf8");
  if (ext === ".csv") {
    return parseCsv(text);
  }
  if (ext === ".json") {
    return parseJson(text);
  }
  exitWith(`Unsupported file extension: ${ext}`);
}

function bufferFromHex(hex) {
  return Buffer.from(hex.slice(2), "hex");
}

function compareHex(a, b) {
  return Buffer.compare(bufferFromHex(a), bufferFromHex(b));
}

function hashLeaf(address, amount) {
  return utils.solidityKeccak256(["address", "uint256"], [address, amount]);
}

function hashPair(a, b) {
  const [left, right] = compareHex(a, b) <= 0 ? [a, b] : [b, a];
  return utils.keccak256(utils.solidityPack(["bytes32", "bytes32"], [left, right]));
}

function buildTree(leaves) {
  if (leaves.length === 0) {
    exitWith("No allocations provided");
  }
  const levels = [leaves];
  while (levels[levels.length - 1].length > 1) {
    const level = levels[levels.length - 1];
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || level[i];
      next.push(hashPair(left, right));
    }
    levels.push(next);
  }
  return levels;
}

function getProof(index, levels) {
  const proof = [];
  let idx = index;
  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
    const level = levels[levelIndex];
    const isOddLast = idx === level.length - 1 && level.length % 2 === 1;
    const pairIndex = isOddLast ? idx : idx ^ 1;
    proof.push(level[pairIndex]);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  if (!fs.existsSync(inputPath)) {
    exitWith(`Input file not found: ${inputPath}`);
  }

  const rawAllocations = readAllocations(inputPath);
  const seen = new Set();
  const allocations = rawAllocations.map((entry) => {
    if (!entry || entry.address === undefined || entry.amount === undefined) {
      throw new Error("Each entry must include address and amount");
    }
    const address = normalizeAddress(entry.address);
    const amount = normalizeAmount(entry.amount);
    const dedupeKey = address.toLowerCase();
    if (seen.has(dedupeKey)) {
      throw new Error(`Duplicate address: ${address}`);
    }
    seen.add(dedupeKey);
    return { address, amount };
  });

  const entries = allocations.map((entry) => ({
    ...entry,
    leaf: hashLeaf(entry.address, entry.amount),
  }));
  entries.sort((a, b) => compareHex(a.leaf, b.leaf));

  const leaves = entries.map((entry) => entry.leaf);
  const levels = buildTree(leaves);
  const root = levels[levels.length - 1][0];

  const proofMap = new Map();
  for (let i = 0; i < entries.length; i += 1) {
    proofMap.set(entries[i].address, {
      amount: entries[i].amount,
      proof: getProof(i, levels),
    });
  }

  const outDir = path.resolve(args.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const rootOutput = {
    merkleRoot: root,
    totalEntries: entries.length,
    leafHash: "keccak256(abi.encodePacked(address, amount))",
    sortLeaves: true,
    sortPairs: true,
    duplicateOdd: true,
    inputFile: path.relative(process.cwd(), inputPath),
    generatedAt: new Date().toISOString(),
  };

  const sortedAddresses = Array.from(proofMap.keys()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const proofs = {};
  for (const address of sortedAddresses) {
    proofs[address] = proofMap.get(address);
  }

  const proofsOutput = {
    merkleRoot: root,
    proofs,
  };

  fs.writeFileSync(path.join(outDir, "root.json"), JSON.stringify(rootOutput, null, 2));
  fs.writeFileSync(path.join(outDir, "proofs.json"), JSON.stringify(proofsOutput, null, 2));

  console.log(`Merkle root: ${root}`);
  console.log(`Wrote: ${path.join(outDir, "root.json")}`);
  console.log(`Wrote: ${path.join(outDir, "proofs.json")}`);
}

try {
  main();
} catch (error) {
  exitWith(error.message || String(error));
}
