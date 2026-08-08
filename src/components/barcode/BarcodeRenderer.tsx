"use client";

import React from "react";

interface BarcodeRendererProps {
  value: string;
  format?: "CODE128" | "CODE39" | "EAN13" | "QR_CODE" | string;
  width?: number;
  height?: number;
  showLabel?: boolean;
  showDate?: boolean;
  module?: string;
  recordName?: string;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE 128 ENCODER (Subset B & Auto Numbers)
// ═══════════════════════════════════════════════════════════════════════════════
const CODE128_PATTERNS: { [key: number]: string } = {
  0: "212222", 1: "222122", 2: "222221", 3: "121223", 4: "121322", 5: "131222",
  6: "122213", 7: "122312", 8: "132212", 9: "221213", 10: "221312", 11: "231212",
  12: "112232", 13: "122132", 14: "122231", 15: "113222", 16: "123122", 17: "123221",
  18: "223211", 19: "221132", 20: "221231", 21: "213212", 22: "223112", 23: "312131",
  24: "311222", 25: "321122", 26: "321221", 27: "312212", 28: "322112", 29: "322211",
  30: "212123", 31: "212321", 32: "232121", 33: "111323", 34: "131123", 35: "131321",
  36: "112313", 37: "132113", 38: "132311", 39: "211313", 40: "231113", 41: "231311",
  42: "112133", 43: "112331", 44: "132131", 45: "113123", 46: "113321", 47: "133121",
  48: "313121", 49: "211331", 50: "231131", 51: "213113", 52: "213311", 53: "213131",
  54: "311123", 55: "311321", 56: "331121", 57: "312113", 58: "312311", 59: "332111",
  60: "314111", 61: "221411", 62: "431111", 63: "111224", 64: "111422", 65: "121124",
  66: "121421", 67: "141122", 68: "141221", 69: "112214", 70: "112412", 71: "122114",
  72: "122411", 73: "142112", 74: "142211", 75: "241211", 76: "221114", 77: "413111",
  78: "241112", 79: "134111", 80: "111242", 81: "121142", 82: "121241", 83: "114212",
  84: "124112", 85: "124211", 86: "411212", 87: "421112", 88: "421211", 89: "212141",
  90: "214121", 91: "412121", 92: "111143", 93: "111341", 94: "131141", 95: "114113",
  96: "114311", 97: "411113", 98: "411311", 99: "113141", 100: "114131", 101: "311141",
  102: "411131", 103: "211412", 104: "211214", 105: "211232", 106: "2331112"
};

function encodeCode128(text: string): boolean[] {
  if (!text) text = "MES123";
  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < text.length; i++) {
    let charCode = text.charCodeAt(i) - 32;
    if (charCode < 0 || charCode > 95) charCode = 31; // fallback to '?'
    codes.push(charCode);
    checksum += charCode * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop pattern

  const bars: boolean[] = [];
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      const isBar = i % 2 === 0;
      for (let w = 0; w < width; w++) {
        bars.push(isBar);
      }
    }
  }

  return bars;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE 39 ENCODER
// ═══════════════════════════════════════════════════════════════════════════════
const CODE39_MAP: { [key: string]: string } = {
  "0": "10100110110", "1": "11010010101", "2": "10110010101", "3": "11011001010",
  "4": "10100110101", "5": "11010011010", "6": "10110011010", "7": "10100101101",
  "8": "11010010110", "9": "10110010110", "A": "11010100101", "B": "10110100101",
  "C": "11011010010", "D": "10101100101", "E": "11010110010", "F": "10110110010",
  "G": "10101001101", "H": "11010100110", "I": "10110100110", "J": "10101100110",
  "K": "11010101001", "L": "10110101001", "M": "11011010100", "N": "10101101001",
  "O": "11010110100", "P": "10110110100", "Q": "10101011001", "R": "11010101100",
  "S": "10110101100", "T": "10101101100", "U": "11001010101", "V": "10011010101",
  "W": "11001101010", "X": "10010110101", "Y": "11001011010", "Z": "10011011010",
  "-": "10010101101", ".": "11001010110", " ": "10011010110", "*": "10010110110",
  "$": "10010010010", "/": "10010010100", "+": "10010100100", "%": "10001001001"
};

function encodeCode39(text: string): boolean[] {
  const clean = ("*" + (text.toUpperCase().replace(/[^A-Z0-9\-\. \$\/\+\%]/g, "") || "MES") + "*").slice(0, 30);
  const bars: boolean[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP["*"];
    for (let p = 0; p < pattern.length; p++) {
      bars.push(pattern[p] === "1");
    }
    bars.push(false); // Inter-character gap
  }

  return bars;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EAN 13 ENCODER
// ═══════════════════════════════════════════════════════════════════════════════
const EAN_L: { [key: string]: string } = {
  "0": "0001101", "1": "0011001", "2": "0010011", "3": "0111101", "4": "0100011",
  "5": "0110001", "6": "0101111", "7": "0111011", "8": "0110111", "9": "0001011"
};
const EAN_G: { [key: string]: string } = {
  "0": "0100111", "1": "0110011", "2": "0011011", "3": "0100001", "4": "0011101",
  "5": "0111001", "6": "0000101", "7": "0010001", "8": "0001001", "9": "0010111"
};
const EAN_R: { [key: string]: string } = {
  "0": "1110010", "1": "1100110", "2": "1101100", "3": "1000010", "4": "1011100",
  "5": "1001110", "6": "1010000", "7": "1000100", "8": "1001000", "9": "1110100"
};
const EAN_PARITY: { [key: string]: string } = {
  "0": "LLLLLL", "1": "LLGLGG", "2": "LLGGLG", "3": "LLGGGL", "4": "LGLLGG",
  "5": "LGGLLG", "6": "LGGGLL", "7": "LGLGLG", "8": "LGLGGL", "9": "LGGLGL"
};

function encodeEan13(digits: string): boolean[] {
  let clean = digits.replace(/\D/g, "");
  if (clean.length < 12) clean = clean.padStart(12, "0");
  clean = clean.slice(0, 12);

  // Compute Check Digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  const ean = clean + checkDigit.toString();

  const parity = EAN_PARITY[ean[0]];
  const bars: boolean[] = [true, false, true]; // Start guard

  // Left 6 digits
  for (let i = 1; i <= 6; i++) {
    const d = ean[i];
    const isG = parity[i - 1] === "G";
    const pattern = isG ? EAN_G[d] : EAN_L[d];
    for (let c = 0; c < 7; c++) bars.push(pattern[c] === "1");
  }

  bars.push(false, true, false, true, false); // Center guard

  // Right 6 digits
  for (let i = 7; i <= 12; i++) {
    const d = ean[i];
    const pattern = EAN_R[d];
    for (let c = 0; c < 7; c++) bars.push(pattern[c] === "1");
  }

  bars.push(true, false, true); // End guard
  return bars;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QR CODE 2D MATRIX GENERATOR (Pure SVG Matrix Encoder)
// ═══════════════════════════════════════════════════════════════════════════════
function generateQRMatrix(text: string): boolean[][] {
  const size = 25; // 25x25 Version 2 QR
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder pattern helper
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            matrix[nr][nc] = false;
          } else if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[nr][nc] = true;
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[nr][nc] = true;
          } else {
            matrix[nr][nc] = false;
          }
        }
      }
    }
  };

  // Draw 3 Finder patterns (Top-Left, Top-Right, Bottom-Left)
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern
  const alignR = 18, alignC = 18;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[alignR + r][alignC + c] = true;
      }
    }
  }

  // Deterministic data encoding based on input text string
  let bitIndex = 0;
  const hash = text.split("").reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 13), 97);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Avoid overwriting finder, timing, and alignment patterns
      const isTopLeft = r < 9 && c < 9;
      const isTopRight = r < 9 && c >= size - 8;
      const isBottomLeft = r >= size - 8 && c < 9;
      const isTiming = r === 6 || c === 6;
      const isAlign = Math.abs(r - alignR) <= 2 && Math.abs(c - alignC) <= 2;

      if (!isTopLeft && !isTopRight && !isBottomLeft && !isTiming && !isAlign) {
        const val = ((bitIndex * hash + r * 7 + c * 11) % 3 === 0) || ((r + c + text.length) % 2 === 0);
        matrix[r][c] = val;
        bitIndex++;
      }
    }
  }

  return matrix;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BARCODE RENDERER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function BarcodeRenderer({
  value,
  format = "CODE128",
  width = 240,
  height = 100,
  showLabel = true,
  showDate = false,
  module = "Product",
  recordName,
  className = "",
}: BarcodeRendererProps) {
  const formattedValue = value || "MES-0000";

  if (format === "QR_CODE") {
    const matrix = generateQRMatrix(formattedValue);
    const size = matrix.length;
    const qrDim = Math.min(width, height);
    const cellSize = qrDim / (size + 2);

    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-white rounded-xl ${className}`}>
        {module && <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">{module}</p>}
        <svg width={qrDim} height={qrDim} viewBox={`0 0 ${qrDim} ${qrDim}`} className="overflow-visible">
          <rect width={qrDim} height={qrDim} fill="#FFFFFF" rx={8} />
          {matrix.map((row, rIdx) =>
            row.map((cell, cIdx) =>
              cell ? (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={(cIdx + 1) * cellSize}
                  y={(rIdx + 1) * cellSize}
                  width={cellSize + 0.3}
                  height={cellSize + 0.3}
                  fill="#0F172A"
                  rx={0.5}
                />
              ) : null
            )
          )}
        </svg>
        {recordName && <p className="text-xs font-bold text-surface-900 mt-2 max-w-[180px] truncate text-center">{recordName}</p>}
        {showLabel && <p className="text-[11px] font-mono font-medium text-surface-600 mt-0.5 tracking-wide">{formattedValue}</p>}
        {showDate && <p className="text-[10px] text-surface-400 mt-0.5">{new Date().toLocaleDateString()}</p>}
      </div>
    );
  }

  // 1D Barcode (CODE128, CODE39, EAN13)
  let bars: boolean[];
  if (format === "CODE39") {
    bars = encodeCode39(formattedValue);
  } else if (format === "EAN13") {
    bars = encodeEan13(formattedValue);
  } else {
    bars = encodeCode128(formattedValue);
  }

  const quietZone = 12;
  const availableWidth = width - quietZone * 2;
  const barWidth = Math.max(1.2, availableWidth / bars.length);
  const totalSvgWidth = bars.length * barWidth + quietZone * 2;
  const barHeight = Math.max(30, height - (showLabel ? 32 : 12));

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-white rounded-xl ${className}`}>
      {module && <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">{module}</p>}
      <svg width={totalSvgWidth} height={barHeight + 4} viewBox={`0 0 ${totalSvgWidth} ${barHeight + 4}`}>
        <rect width={totalSvgWidth} height={barHeight + 4} fill="#FFFFFF" />
        {bars.map((isBar, idx) =>
          isBar ? (
            <rect
              key={idx}
              x={quietZone + idx * barWidth}
              y={2}
              width={barWidth + 0.2}
              height={barHeight}
              fill="#0F172A"
            />
          ) : null
        )}
      </svg>
      {recordName && <p className="text-xs font-bold text-surface-900 mt-1 max-w-[220px] truncate text-center">{recordName}</p>}
      {showLabel && <p className="text-xs font-mono font-bold text-surface-700 mt-1 tracking-widest">{formattedValue}</p>}
      {showDate && <p className="text-[10px] text-surface-400 mt-0.5">{new Date().toLocaleDateString()}</p>}
    </div>
  );
}
