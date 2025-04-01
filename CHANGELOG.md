# Changelog Assam Multisender

Repository: [edosetiawan-xyz/Sepolia-tea-multisender](https://github.com/edosetiawan-xyz/Sepolia-tea-multisender.git)

## 📋 Perbandingan Script Lama (Assam-multisender-beta.js) dan Script Baru (Assam-multisender.js)

Tanggal: 1 April 2025
Waktu: 10.49.50 PM


## 🔍 Ringkasan Perubahan

Script baru (Sepolia-multisender.js) merupakan versi yang telah disempurnakan dari script lama (Assam-multisender-beta.js) dengan berbagai peningkatan signifikan dalam hal antarmuka pengguna, fungsionalitas, penanganan data, notifikasi, dan optimasi teknis.

## 🎨 Peningkatan Antarmuka Pengguna (UI)

### ✨ Fitur Baru pada Antarmuka
- **Tampilan ASCII Art yang Lebih Baik**: Peningkatan tampilan ASCII art dengan logo Assam Testnet yang lebih jelas
- **Pemformatan Warna yang Lebih Konsisten**: Penggunaan warna yang lebih konsisten dengan library `chalk` untuk meningkatkan keterbacaan
- **Menu yang Lebih Terstruktur**: Struktur menu yang lebih jelas dengan bingkai dan pemisah yang lebih baik
- **Pesan Status yang Lebih Informatif**: Pesan status transaksi yang lebih informatif dengan emoji dan warna yang sesuai
- **Cek Saldo Token**: Menu khusus untuk memeriksa saldo semua token (TEA, BTC, MTT, TDI)

## 🚀 Peningkatan Fungsionalitas

### ✨ Fitur Baru pada Fungsionalitas

- **Fitur Cancel Nonce**: Menambahkan fitur untuk membatalkan transaksi dengan nonce tertentu yang stuck
- **Dukungan Multiple RPC**: Kemampuan untuk menggunakan beberapa RPC URL untuk meningkatkan keandalan
- **Deteksi Kemacetan Jaringan**: Sistem yang dapat mendeteksi kemacetan jaringan dan menyesuaikan gas fee
- **Retry Mechanism yang Lebih Baik**: Mekanisme retry yang lebih canggih dengan peningkatan gas fee secara bertahap
- **Checkpoint System**: Sistem checkpoint untuk melanjutkan transaksi dari titik terakhir jika terjadi interupsi
- **Estimasi Waktu Transaksi**: Estimasi waktu untuk setiap transaksi dan total waktu yang dibutuhkan
- **Opsi Jeda Transaksi**: Tiga mode jeda transaksi: tanpa jeda, jeda manual, dan jeda acak.
- **Input Manual Address**: Opsi untuk memasukkan alamat secara manual tanpa file CSV
- **Pengacakan Jumlah Token**: Opsi untuk mengirim jumlah token acak dalam rentang tertentu
- **Ekspor CSV ke Telegram**: Mengirim laporan CSV langsung ke Telegram setelah transaksi selesai
- **Konfirmasi Transaksi**: Sistem konfirmasi sebelum memulai transaksi untuk mencegah kesalahan
- **Dukungan Native Token**: Menambahkan dukungan untuk token native (TEA)
- 
### 🔄 Perbandingan Kode Fungsionalitas

Script Lama (Assam-multisender-beta.js):
```Javascript
// Konfigurasi provider sederhana
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Tidak ada mekanisme retry yang canggih
async function sendTransaction(wallet, tokenAddress, recipient, amount) {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ["function transfer(address to, uint256 value) public returns (bool)"],
      wallet
    );
    const amountInWei = ethers.parseUnits(amount.toString(), 18);
    const tx = await tokenContract.transfer(recipient, amountInWei);
    console.log(`Transaksi dikirim: ${tx.hash}`);
    return "SUKSES";
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return "GAGAL";
  }
}
```

Script Baru (Sepolia-multisender.js):

```javascript
// Konfigurasi provider dengan multiple RPC
const RPC_URLS = process.env.RPC_URLS ? process.env.RPC_URLS.split(",") : [process.env.RPC_URL];
let currentRpcIndex = 0;

function getNextProvider() {
  try {
    const url = RPC_URLS[currentRpcIndex];
    currentRpcIndex = (currentRpcIndex + 1) % RPC_URLS.length;
    return new ethers.JsonRpcProvider(url);
  } catch (error) {
    logError("Provider Setup", error);
    throw new Error("Failed to initialize provider");
  }
}

let provider = getNextProvider();

// Mekanisme retry yang canggih dengan peningkatan gas fee
async function sendTransactionWithRetry(
  wallet,
  tokenAddress,
  recipient,
  amount,
  tokenSymbol,
  currentIndex,
  totalTx,
  suggestedNonce = null,
  maxRetries = 5,
) {
  let retries = 0;
  const baseDelay = 1000;
  let nonce = suggestedNonce !== null ? suggestedNonce : await getValidNonce(wallet);
  let lastError = null;

  // Cek dan tangani transaksi yang stuck sebelum mengirim yang baru
  await checkStuckTransactions(wallet);

  // Daftar persentase kenaikan gas untuk setiap percobaan
  const gasIncreasePercentages = [0, 10, 20, 30, 40];

  while (retries &lt; maxRetries) {
    try {
      // ... kode transaksi ...
      
      // Hitung gas parameters untuk percobaan ini
      const increasePercentage = gasIncreasePercentages[Math.min(retries, gasIncreasePercentages.length - 1)];
      const gasParams = await calculateGasParameters(increasePercentage);
      
      // ... kode transaksi lainnya ...
      
      return "SUKSES";
    } catch (err) {
      // ... penanganan error dengan retry logic ...
      retries++;
      if (retries &lt; maxRetries) {
        const waitTime = Math.min(baseDelay * Math.pow(2, retries), 30000);
        console.log(
          chalk.hex("#FFFF00")(
            `⏳ Menunggu ${waitTime / 1000} detik sebelum mencoba lagi (Percobaan ${retries + 1}/${maxRetries})...`,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // ... penanganan kegagalan setelah semua retry ...
  return "GAGAL";
}
```
## 📊 Peningkatan Penanganan Data

### ✨ Fitur Baru pada Penanganan Data

- **Validasi Input yang Lebih Ketat**: Validasi input yang lebih komprehensif untuk mencegah error
- **Penanganan File CSV yang Lebih Baik**: Dukungan untuk berbagai format file CSV dan penanganan header
- **Tracking Nonce yang Digunakan**: Sistem untuk melacak nonce yang sudah digunakan untuk mencegah duplikasi
- **Tracking Transaksi Pending**: Sistem untuk melacak transaksi pending dan menangani transaksi yang stuck
- **Laporan Transaksi yang Lebih Baik**: Laporan transaksi yang lebih detail dengan status sukses/gagal
- **Penyimpanan Checkpoint**: Menyimpan checkpoint untuk melanjutkan transaksi jika terjadi interupsi

### 🔄 Perbandingan Kode Penanganan Data

Script Lama (Assam-multisender-beta.js):
```Javascript
function readCSVFile(filePath) {
  const data = fs.readFileSync(filePath, "utf8");
  const lines = data.trim().split("\n");
  const transactions = [];
  
  for (let i = 0; i &lt; lines.length; i++) {
    const [address, amount] = lines[i].split(",");
    if (ethers.isAddress(address) && !isNaN(amount)) {
      transactions.push({ address, amount: parseFloat(amount) });
    }
  }
  
  return transactions;
}
```
Script Baru (Assam-multisender.js):
```Javascript
// Kode Baru: Pemrosesan file CSV dengan opsi yang lebih fleksibel
function processCSVFile(filePath) {
  try {
    let data = fs.readFileSync(filePath, "utf8").trim().split("\n")

    if (data.length > 0 && data[0].toLowerCase().includes("quantity")) {
      console.log(getRandomGradient()("⚠️ Melewati baris pertama karena berisi header"))
      data = data.slice(1)
    }

    console.log(getRandomGradient()("\n╔═══════════════════════════════════════════════════════════════════════════╗"))
    console.log(getRandomGradient()("║                        OPSI JUMLAH KOIN                                   ║"))
    console.log(getRandomGradient()("╚═══════════════════════════════════════════════════════════════════════════╝\n"))

    console.log(getRandomGradient()("[1] Gunakan nilai dari file CSV (jika ada)"))
    console.log(getRandomGradient()("[2] Atur jumlah manual (sama untuk semua address)"))
    console.log(getRandomGradient()("[3] Otomatis acak (kustom)"))
    // ... kode lainnya ...
  } catch (error) {
    // ... penanganan error ...
  }
}
```
## 📱 Peningkatan Notifikasi Telegram

### ✨ Fitur Baru

- **Format Pesan yang Lebih Baik**: Pesan Telegram dengan format Markdown yang lebih terstruktur
- **Pengiriman File CSV**: Kemampuan untuk mengirim file CSV laporan langsung ke Telegram
- **Informasi Transaksi yang Lebih Lengkap**: Detail transaksi yang lebih komprehensif dalam notifikasi

## Kode Baru: Format pesan Telegeam yang lebih baik dengan Markdown
```Javaacript
const message = `🚀 *TRANSAKSI BERHASIL*  
  
👛 *Wallet:* \`${escapeMarkdownV2(txInfo.wallet)}\`  
📤 *Dikirim:* \`${escapeMarkdownV2(txInfo.amount)} ${escapeMarkdownV2(txInfo.token)}\`  
🎯 *Penerima:* \`${escapeMarkdownV2(txInfo.recipient)}\`  
🔗 [Lihat di Sepolia Tea](${escapedAssamUrl})  

⛽ *Gas Usage:*  
• Max Priority Fee: \`${escapeMarkdownV2(txInfo.gasPrice)}\`  
• *Biaya Gas:* \`${escapeMarkdownV2(txInfo.gasUsed)}\`  

💰 *Sisa Saldo:* \`${escapeMarkdownV2(formattedBalance)} TEA\`  
⚠️ *Jaringan:* ${txInfo.networkCongestion > 1 ? "*Padat*" : "*Normal*"}  
⏰ *Waktu:* \`${escapeMarkdownV2(formattedDate)}\`  

🔄 *Transaksi \\#${escapeMarkdownV2(txInfo.currentIndex)} dari ${escapeMarkdownV2(txInfo.totalTx)}* \\| 🌐 *Sepolia Testnet*
  
✨ *Powered by* [edosetiawan\\.eth](${escapedTwitterUrl}) ✨
```
## 🔄 Perbandingan dengan Kode Lama
```Javascript
const message =
  `🚀 Mengirim ${amount} ${tokenSymbol} ke ${recipient}\n` +
  `• felicia (${currentIndex + 1}/${totalTx}) edosetiawan.eth\n` +
  `✅ Transaksi dikirim: ${tx.hash}\n` +
  `⏱️ Estimasi waktu: ${estimatedTime}\n` +
  `⛽ ${
    gasParams.supportsEIP1559
      ? `Max Priority Fee: ${ethers.formatUnits(gasParams.maxPriorityFeePerGas, "gwei")} Gwei, Max Fee: ${ethers.formatUnits(gasParams.maxFeePerGas, "gwei")} Gwei`
      : `Gas Price: ${ethers.formatUnits(gasParams.gasPrice, "gwei")} Gwei`
  }\n` +
  `⏰ Waktu transaksi: ${formattedTimestamp}`
  ```
  ## 🛠️ Peningkatan Teknis

### ✨ Fitur Baru

- **Penanganan Error yang Lebih Baik**: Sistem logging error yang lebih komprehensif
- **Optimasi Performa**: Penggunaan Promise dan async/await yang lebih efisien
- **Dukungan EIP-1559 yang Lebih Baik**: Implementasi yang lebih baik untuk transaksi EIP-1559
- **Penanganan Nonce yang Lebih Cerdas**: Sistem yang lebih baik untuk mengelola nonce transaksi
- **Deteksi Kemacetan Jaringan**: Sistem yang lebih baik untuk mendeteksi dan menangani kemacetan jaringan
- **Estimasi Gas yang Lebih Akurat**: Perhitungan gas yang lebih akurat untuk transaksi

### 🔄 Perbandingan Teknis

Kode Lama:
```Javascript
// Tidak ada penanganan gas yang baik
// Tidak ada dukungan EIP-1559
// Tidak ada penanganan provider yang baik

async function sendTransaction(to, value) {
  const tx = {
    to,
    value,
    gasPrice: await provider.getGasPrice(),
    gasLimit: 21000,
  };
  
  return wallet.sendTransaction(tx);
}
```
Kode Baru:
```Javascript
// Penanganan gas yang baik dengan dukungan EIP-1559
async function calculateGasParameters(increasePercentage = 0) {
  try {
    const feeData = await provider.getFeeData()
    const congestion = await checkNetworkCongestion()

    // Tambahkan persentase berdasarkan congestion level
    let totalIncrease = increasePercentage
    if (congestion.congested) {
      const congestionIncrease = [10, 20, 40][congestion.level - 1] || 0
      totalIncrease += congestionIncrease
      console.log(
        chalk.hex("#FFFF00")(`⚠️ Jaringan padat (level ${congestion.level}), menambah gas +${congestionIncrease}%`),
      )
    }

    const multiplier = 1 + totalIncrease / 100

    // Jika mendukung EIP-1559
    if (feeData.maxFeePerGas) {
      const maxPriorityFeePerGas = BigInt(Math.floor(Number(feeData.maxPriorityFeePerGas) * multiplier))
      const maxFeePerGas = feeData.lastBaseFeePerGas
        ? BigInt(Math.floor(Number(feeData.lastBaseFeePerGas) * 2)) + maxPriorityFeePerGas
        : BigInt(Math.floor(Number(feeData.maxFeePerGas) * multiplier))

      return {
        type: 2, // EIP-1559
        maxPriorityFeePerGas,
        maxFeePerGas,
        supportsEIP1559: true,
      }
    }
    // Jika tidak mendukung EIP-1559
    else {
      return {
        type: 0, // Legacy
        gasPrice: BigInt(Math.floor(Number(feeData.gasPrice) * multiplier)),
        supportsEIP1559: false,
      }
    }
  } catch (error) {
    logError("Calculate Gas Parameters", error)
    // Fallback ke provider lain jika error
    provider = getNextProvider()
    return calculateGasParameters(increasePercentage)
  }
}

// Penanganan provider yang baik
function getNextProvider() {
  try {
    const url = RPC_URLS[currentRpcIndex]
    currentRpcIndex = (currentRpcIndex + 1) % RPC_URLS.length
    return new ethers.JsonRpcProvider(url)
  } catch (error) {
    logError("Provider Setup", error)
    throw new Error("Failed to initialize provider")
  }
}
```
## 📅 Log Perubahan dari Git

Berdasarkan log git yang disediakan, berikut adalah perubahan utama yang dilakukan pada repository:

### 25 Maret 2025

- **15a68bf**: Update README: Add Telegram notification example image
- **31c17c7**: Merge pull request #4 dari Felicia-xyz/main - Replace felicia_extracted.zip with Address.zip and restructure file naming
- **4c17804**: Dataset Update: From felicia_extracted.zip to Address.zip
- Sebelumnya: felicia_1.csv to felicia_13.csv (100,000 alamat per file)
- Sekarang: Address_1.csv to Address_102.csv (5,000 alamat per file)
- Developer_Address.csv diformat sebagai file CSV yang benar
- **fd569f1**: UI: Major improvements to CLI interface

- Desain CLI baru dengan skema warna yang lebih baik
- Peningkatan keterbacaan dan fitur interaktif tambahan
- Pesan error yang lebih baik dan format yang dioptimalkan

### 18 Maret 2025

- **704a504**: Added new features: Batch Optimization, Smart Nonce Handling & EIP-1559 Support
- Implementasi Batch Optimization untuk transfer token yang efisien
- Smart Nonce Handling yang mengambil nonce terbaru secara dinamis
- Dukungan EIP-1559 yang ditingkatkan dengan penyesuaian base fee dan priority fee
- Peningkatan kecepatan dan keandalan eksekusi secara keseluruhan

### 15-16 Maret 2025

- **31a7425**: Update LICENSE to MIT
- **3e4f1e1**: Update .env configuration
- **7e413bd**: Update README.md: Menambahkan konfigurasi & panduan penggunaan
- **c6abcf0**: Refactor: Improved cancel-nounce.js execution & module handling
- **80b27f4**: Lockfile Sync: Regenerated package-lock.json for dependency integrity
- **0694755**: Config Update: Enhance package.json for better package management
- **fe3d77b**: Enhance nonce cancellation for better transaction safety
- **d2665f5**: Optimize multisender logic & improve retry mechanism

### 14 Maret 2025

- **00d7727**: Add package-lock.json
- **6137763**: Update dependencies & fix vulnerabilities (npm audit fix)

### 4 Maret 2025

- **6137763**: Remove BatchTransfer_compData.json
- **b3dfa2e**: Remove BatchTransfer_compData (1).json
- **1b0ca1d**: Ignore CSV files from git tracking
- **a4159e0**: Update package-lock.json after dependency optimization
- **3c20e87**: Update package.json and package-lock.json

### 1 Maret 2025

- **dc7c2c6**: Add files via upload
- **0b0ecf7**: Add files via upload
- **d3c8785**: Update felicia_extracted.zip

### 26-27 Februari 2025

- **c8e4129**: docs(readme): improve installation guide and formatting
- **47509b7**: Extracted Data: Daftar Alamat Address
- **f233a87**: XYZ UPGRADE: Cancel Pending Nounce Initiated...
- **7413400**: Updated .gitignore to exclude unnecessary files
- **5d3313f**: Removed unnecessary upload_contributing.sh file
- **506665e**: Optimized Assam-multisender.js for better performance

### 25 Februari 2025

- **f3f188e**: Enhanced PULL_REQUEST_TEMPLATE.md for better PR workflow
- **02f6907**: Improved SECURITY.md with better vulnerability reporting
- **d5d1791**: Updated CONTRIBUTING.md with latest guidelines
- **dc9788f**: Updated CODE_OF_CONDUCT.md to improve clarity
- **fbacc70**: Forced update to .github files
- **1e799ed**: Fully removed submodule Assam-multisender & cleaned repo
- **3419b7d**: Removed unnecessary Assam-multisender folder
- **ab35b48**: Added pull request template
- **f512a5f**: Added bug report template
- **53ffb23**: Added CODE_OF_CONDUCT.md with contact email
- **b9db27f**: Added CONTRIBUTING.md for contribution guidelines
- **472c000**: Added SECURITY.md for security reporting
- **1db5d5c**: Added MIT License (Indonesian)
- **9539e8f**: Removed env.sample (only keeping env.example)
- **7ceba1b**: Re-added env.example (DO NOT UPLOAD .env!)
- **2881710**: Force added package-lock.json for dependency version control
- **854a774**: package.json
- **85355c0**: Enhanced security: Updated .gitignore for better protection
- **a8cf5a4**: Assam-multisender.js
- **6472796**: Initial commit

## 🔍 Kesimpulan

Script baru (Assam-multisender.js) merupakan peningkatan signifikan dari script lama (Assam-multisender-beta.js) dengan penambahan fitur-fitur berikut:
1. **Antarmuka pengguna yang lebih baik** dengan tampilan ASCII art yang lebih menarik, pemformatan warna yang lebih konsisten, dan menu yang lebih terstruktur
2. **Fungsionalitas yang lebih lengkap** termasuk cancel nonce, kirim token manual, dukungan multi-token, penanganan transaksi stuck, dan estimasi waktu transaksi
3. **Penanganan data yang lebih baik** dengan validasi input yang lebih ketat, pemrosesan file CSV yang lebih baik, dan sistem tracking nonce
4. **Notifikasi yang lebih baik** dengan integrasi Telegram, format pesan yang lebih informatif, dan notifikasi untuk berbagai jenis event
5. **Peningkatan teknis** termasuk penanganan gas yang lebih baik, dukungan EIP-1559, penanganan provider yang lebih baik, dan sistem retry yang lebih canggih


Repository ini terus dikembangkan secara aktif dengan commit terakhir pada 25 Maret 2025, menunjukkan komitmen untuk meningkatkan fungsionalitas dan pengalaman pengguna.

## 📝 Fitur yang Direncanakan untuk Versi Mendatang

Berdasarkan analisis kode dan tren pengembangan, berikut adalah fitur-fitur yang mungkin akan ditambahkan pada versi mendatang:

1. **Dukungan untuk Lebih Banyak Token**: Menambahkan dukungan untuk token-token baru di Assam Testnet
2. **Antarmuka Web**: Mengembangkan antarmuka web untuk memudahkan penggunaan
3. **Integrasi dengan Wallet Eksternal**: Menambahkan dukungan untuk wallet eksternal seperti MetaMask
4. **Optimasi Gas yang Lebih Baik**: Meningkatkan algoritma optimasi gas untuk menghemat biaya transaksi
5. **Sistem Monitoring**: Menambahkan sistem monitoring untuk memantau status transaksi secara real-time
6. **Dukungan Multi-Chain**: Menambahkan dukungan untuk blockchain lain selain Assam Testnet

## 📚 Panduan Penggunaan

### Instalasi

1. Clone repository:
 ```shellscript
git clone https://github.com/edosetiawan-xyz/Sepolia-tea-multisender.git
cd Sepolia-tea-multisender
```
2. Install dependencies:

```shellscript
Npm install
```
3. Salin file `.env.example` menjadi `.env` dan isi dengan konfigurasi yang sesuai:
```shellscript
cp .env.example .env
```
4. Jalankan script:
```shellscript
node Assam-multisender.js
```
**Konfigurasi .env**
```shellscript
# RPC URLs (comma separated for multiple)
RPC_URL=https://tea-sepolia.g.alchemy.com/public tambahkan (koma) jika lebih dari 1 RPC
# Private Keys (comma separated for multiple)
PRIVATE_KEYS=your_private_key_1,your_private_key_2

# Token Contracts
BTC_CONTRACT=0x615a02020b4cd1171551e3379491B825315ce77B
MTT_CONTRACT=0x2b3aBf76D9D2eD4Eb2975D5DBb6981B77DF06E5A
TDI_CONTRACT=0xE1b512683cb5c3d56D462dB326a6632EeEbb60BB

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```
### Fitur Utama

1. **Kirim Token BTC/MTT/TDI**: Mengirim token ke banyak alamat sekaligus
2. **Kirim Token Manual**: Mengirim token dengan alamat kontrak yang diinputkan secara manual
3. **Cancel Nonce**: Membatalkan transaksi yang pending dengan nonce tertentu
4. **Cek Saldo Token**: Memeriksa saldo token di wallet

Script diatas adalah penyempurnaaan dari Script Assam-multisender.js dan Assam-multisender-beta.js

Dibuat oleh: edosetiawan.onion  
Email: [edosetiawan.eth@gmail.com](mailto:edosetiawan.eth@gmail.com)  
Tanggal: 1 April 2025  
Waktu: 10.49.50 PM
