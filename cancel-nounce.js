import { ethers } from "ethers"
import * as dotenv from "dotenv"
import chalk from "chalk"
import readline from "node:readline"
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import ora from "ora"
import axios from "axios"
import { Table } from "console-table-printer"
import cliProgress from "cli-progress"
import figlet from "figlet"
import gradient from "gradient-string"
import { setTimeout as sleep } from "node:timers/promises"

// Dapatkan direktori saat ini untuk ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Konstanta untuk jaringan Assam Tea
const NATIVE_TOKEN_SYMBOL = "TEA"
const BLOCK_EXPLORER_URL = "https://assam.tea.xyz/tx/"
const GAS_LIMIT_DEFAULT = 21000
const MAX_RETRY_COUNT = 5
const VERSION = "3.1.0"
const DATA_DIR = resolve(__dirname, ".data")
const CACHE_FILE = resolve(DATA_DIR, "tx-cache.json")
const HISTORY_FILE = resolve(DATA_DIR, "tx-history.json")
const LOG_FILE = resolve(DATA_DIR, "tx-logs.json")
const PARALLEL_BATCH_SIZE = 5 // Ditingkatkan dari 3 ke 5
const TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
]

// Cache untuk menyimpan data
let successfulCancellations = new Set()
let transactionHistory = []
const tokenBalanceCache = new Map()
let lastGasPriceCheck = 0
let cachedGasPrice = null

// Pastikan direktori data ada
try {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
    console.log(chalk.green(`✓ Direktori data dibuat: ${DATA_DIR}`))
  }
} catch (error) {
  console.log(chalk.yellow(`⚠ Gagal membuat direktori data: ${error.message}`))
}

// Logger yang lebih baik
const logger = {
  logs: [],
  maxLogs: 1000,

  log: function (level, message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }

    this.logs.push(logEntry)

    // Batasi jumlah log
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Simpan log ke file
    this.saveToFile()

    // Output ke konsol
    switch (level) {
      case "error":
        console.log(chalk.red(`✗ ${message}`))
        break
      case "warning":
        console.log(chalk.yellow(`⚠ ${message}`))
        break
      case "success":
        console.log(chalk.green(`✓ ${message}`))
        break
      case "info":
      default:
        console.log(chalk.blue(`ℹ️ ${message}`))
    }
  },

  error: function (message, data = null) {
    this.log("error", message, data)
  },

  warning: function (message, data = null) {
    this.log("warning", message, data)
  },

  success: function (message, data = null) {
    this.log("success", message, data)
  },

  info: function (message, data = null) {
    this.log("info", message, data)
  },

  saveToFile: function () {
    try {
      writeFileSync(LOG_FILE, JSON.stringify(this.logs, null, 2))
    } catch (error) {
      console.log(chalk.yellow(`⚠ Gagal menyimpan log: ${error.message}`))
    }
  },

  loadFromFile: function () {
    try {
      if (existsSync(LOG_FILE)) {
        this.logs = JSON.parse(readFileSync(LOG_FILE, "utf8"))
        console.log(chalk.blue(`ℹ️ Log dimuat: ${this.logs.length} entri`))
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠ Gagal memuat log: ${error.message}`))
    }
  },
}

// Konfigurasi dotenv dengan deteksi file otomatis dan validasi yang lebih baik
function loadEnvConfig() {
  const envPaths = [".env", ".env.local", ".env.development"]
  let loaded = false

  for (const path of envPaths) {
    const fullPath = resolve(__dirname, path)
    if (existsSync(fullPath)) {
      dotenv.config({ path: fullPath })
      logger.success(`File konfigurasi ${path} berhasil dimuat`)
      loaded = true
      break
    }
  }

  if (!loaded) {
    logger.warning("File .env tidak ditemukan, mencoba menggunakan variabel lingkungan yang tersedia")
    dotenv.config()
  }

  // Validasi konfigurasi wajib
  const requiredEnvVars = ["RPC_URL"]
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error(`Variabel lingkungan berikut tidak ditemukan: ${missingVars.join(", ")}`)
  }

  // Cek private keys atau wallet address
  if (!process.env.PRIVATE_KEYS && !process.env.WALLET_ADDRESS) {
    throw new Error("Harus menyediakan PRIVATE_KEYS atau WALLET_ADDRESS")
  }

  // Cek variabel Telegram (opsional)
  const hasTelegramConfig = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
  if (!hasTelegramConfig) {
    logger.warning("Konfigurasi Telegram tidak lengkap, notifikasi tidak akan dikirim")
  }

  // Ekstrak private keys dengan validasi
  let privateKeys = []
  if (process.env.PRIVATE_KEYS && process.env.PRIVATE_KEYS.trim() !== "") {
    privateKeys = process.env.PRIVATE_KEYS.split(",")
      .map((key) => key.trim())
      .filter((key) => {
        // Validasi format private key
        try {
          new ethers.Wallet(key)
          return true
        } catch (e) {
          logger.error(`Private key tidak valid: ${key.substring(0, 6)}...`)
          return false
        }
      })
  }

  // Ekstrak token contracts dengan validasi
  const tokenContracts = {}
  const tokenEnvVars = Object.keys(process.env).filter((key) => key.endsWith("_CONTRACT"))

  for (const key of tokenEnvVars) {
    const tokenSymbol = key.replace("_CONTRACT", "")
    const contractAddress = process.env[key]

    // Validasi format alamat kontrak
    if (contractAddress && ethers.isAddress(contractAddress)) {
      tokenContracts[tokenSymbol] = contractAddress
    } else if (contractAddress) {
      logger.warning(`Alamat kontrak tidak valid untuk ${tokenSymbol}: ${contractAddress}`)
    }
  }

  return {
    rpcUrl: process.env.RPC_URL,
    privateKeys: privateKeys,
    walletAddress: process.env.WALLET_ADDRESS,
    blockExplorer: process.env.BLOCK_EXPLORER_URL || BLOCK_EXPLORER_URL,
    maxGasPrice: process.env.MAX_GAS_PRICE ? Number.parseInt(process.env.MAX_GAS_PRICE) : 100, // Default max 100 GWEI
    autoMode: process.env.AUTO_MODE === "true",
    dryRun: process.env.DRY_RUN === "true",
    batchSize: process.env.BATCH_SIZE ? Number.parseInt(process.env.BATCH_SIZE) : PARALLEL_BATCH_SIZE,
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      enabled: hasTelegramConfig,
    },
    monitorInterval: process.env.MONITOR_INTERVAL ? Number.parseInt(process.env.MONITOR_INTERVAL) : 60, // Default 60 detik
    gasPriceStrategy: process.env.GAS_PRICE_STRATEGY || "optimal", // 'optimal', 'aggressive', 'economic'
    priorityFee: process.env.PRIORITY_FEE ? Number.parseInt(process.env.PRIORITY_FEE) : 1, // GWEI
    maxFeePerGas: process.env.MAX_FEE_PER_GAS ? Number.parseInt(process.env.MAX_FEE_PER_GAS) : 0, // 0 = gunakan gasPrice
    minBalance: process.env.MIN_BALANCE ? Number.parseFloat(process.env.MIN_BALANCE) : 0.001, // Minimum balance in TEA
    tokenContracts: tokenContracts,
    checkTokenBalances: process.env.CHECK_TOKEN_BALANCES === "true",
    gasPriceCacheDuration: process.env.GAS_PRICE_CACHE_DURATION
      ? Number.parseInt(process.env.GAS_PRICE_CACHE_DURATION)
      : 30, // Dalam detik
    retryDelay: process.env.RETRY_DELAY ? Number.parseInt(process.env.RETRY_DELAY) : 2000, // Dalam milidetik
    concurrentRequests: process.env.CONCURRENT_REQUESTS ? Number.parseInt(process.env.CONCURRENT_REQUESTS) : 3,
  }
}

// Fungsi untuk memuat cache dari file dengan error handling yang lebih baik
function loadCache() {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = JSON.parse(readFileSync(CACHE_FILE, "utf8"))
      successfulCancellations = new Set(data.successfulCancellations)
      logger.info(`Cache dimuat: ${successfulCancellations.size} nonce dalam cache`)
    }
  } catch (error) {
    logger.warning(`Gagal memuat cache: ${error.message}`)
    // Buat cache baru jika file rusak
    successfulCancellations = new Set()
    saveCache()
  }
}

// Fungsi untuk menyimpan cache ke file dengan throttling
let cacheLastSaved = 0
const CACHE_SAVE_INTERVAL = 5000 // 5 detik

function saveCache() {
  const now = Date.now()
  // Hanya simpan jika sudah lewat interval
  if (now - cacheLastSaved < CACHE_SAVE_INTERVAL) return

  try {
    const data = {
      successfulCancellations: Array.from(successfulCancellations),
      lastUpdated: new Date().toISOString(),
    }
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2))
    cacheLastSaved = now
  } catch (error) {
    logger.warning(`Gagal menyimpan cache: ${error.message}`)
  }
}

// Fungsi untuk memuat history dari file dengan error handling yang lebih baik
function loadHistory() {
  try {
    if (existsSync(HISTORY_FILE)) {
      transactionHistory = JSON.parse(readFileSync(HISTORY_FILE, "utf8"))
      logger.info(`History dimuat: ${transactionHistory.length} transaksi dalam history`)
    }
  } catch (error) {
    logger.warning(`Gagal memuat history: ${error.message}`)
    // Buat history baru jika file rusak
    transactionHistory = []
    saveHistory()
  }
}

// Fungsi untuk menyimpan history ke file dengan throttling
let historyLastSaved = 0
const HISTORY_SAVE_INTERVAL = 5000 // 5 detik

function saveHistory() {
  const now = Date.now()
  // Hanya simpan jika sudah lewat interval
  if (now - historyLastSaved < HISTORY_SAVE_INTERVAL) return

  try {
    // Batasi history ke 1000 transaksi terakhir untuk menghindari file terlalu besar
    if (transactionHistory.length > 1000) {
      transactionHistory = transactionHistory.slice(-1000)
    }
    writeFileSync(HISTORY_FILE, JSON.stringify(transactionHistory, null, 2))
    historyLastSaved = now
  } catch (error) {
    logger.warning(`Gagal menyimpan history: ${error.message}`)
  }
}

// Fungsi untuk menambahkan transaksi ke history dengan validasi
function addToHistory(transaction) {
  // Validasi data transaksi
  if (!transaction || typeof transaction !== "object") {
    logger.warning("Mencoba menambahkan transaksi tidak valid ke history")
    return
  }

  transaction.timestamp = new Date().toISOString()
  transactionHistory.push(transaction)

  // Simpan history secara asinkron
  setTimeout(saveHistory, 0)
}

// Fungsi untuk format waktu yang lebih baik
function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date)
  }

  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

// Fungsi untuk mengirim notifikasi Telegram dengan rate limiting dan retry
const telegramQueue = []
let isSendingTelegram = false
const TELEGRAM_RATE_LIMIT = 1000 // 1 detik antara pesan

async function sendTelegramNotification(config, message, txHash = null, type = "info") {
  if (!config.telegram.enabled) return

  // Tambahkan ke antrian
  telegramQueue.push({ config, message, txHash, type })

  // Mulai proses antrian jika belum berjalan
  if (!isSendingTelegram) {
    processTelegramQueue()
  }
}

async function processTelegramQueue() {
  if (telegramQueue.length === 0) {
    isSendingTelegram = false
    return
  }

  isSendingTelegram = true
  const { config, message, txHash, type } = telegramQueue.shift()

  try {
    // Buat footer pesan
    const timestamp = formatDate(new Date())
    let footer = `\n\n⏰ <i>${timestamp}</i>`

    // Tambahkan link ke explorer jika ada txHash
    if (txHash) {
      footer += `\n<a href="${config.blockExplorer}${txHash}">Lihat di Explorer</a>`
    }

    // Tambahkan emoji berdasarkan tipe notifikasi
    let emoji = "📢"
    if (type === "success") emoji = "✅"
    if (type === "error") emoji = "❌"
    if (type === "warning") emoji = "⚠️"
    if (type === "info") emoji = "ℹ️"

    // Format pesan dengan header & footer
    const formattedMessage = `${emoji} <b>ASSAM TEA NONCE CANCELLATION</b>\n\n${message}${footer}`

    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`
    await axios.post(
      url,
      {
        chat_id: config.telegram.chatId,
        text: formattedMessage,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      },
      {
        timeout: 10000, // 10 detik timeout
      },
    )

    logger.success(`Notifikasi Telegram berhasil dikirim`)
  } catch (error) {
    logger.warning(`Gagal mengirim notifikasi ke Telegram: ${error.message}`)

    // Coba lagi jika error bukan 400 (bad request)
    if (!error.response || error.response.status !== 400) {
      // Masukkan kembali ke antrian untuk dicoba lagi (maksimal 3 kali)
      const retryCount = telegramQueue.retryCount || 0
      if (retryCount < 3) {
        telegramQueue.unshift({
          config,
          message,
          txHash,
          type,
          retryCount: retryCount + 1,
        })
      }
    }
  }

  // Tunggu rate limit
  await sleep(TELEGRAM_RATE_LIMIT)

  // Proses item berikutnya dalam antrian
  processTelegramQueue()
}

// Buat interface untuk input user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

// Fungsi untuk menampilkan banner yang lebih menarik
function displayBanner() {
  console.log("\n")
  const banner = figlet.textSync("ASSAM TEA", {
    font: "Big",
    horizontalLayout: "default",
    verticalLayout: "default",
  })
  console.log(gradient.rainbow.multiline(banner)) // Menggunakan rainbow gradient untuk efek yang lebih menarik
  console.log(gradient.pastel("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
  console.log(gradient.cristal(`                TRANSACTION CANCELLER v${VERSION}`))
  console.log(gradient.pastel("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"))
}

// Fungsi untuk menampilkan statistik dengan visualisasi yang lebih baik
function displayStats() {
  if (transactionHistory.length === 0) {
    logger.info(`Belum ada transaksi dalam history`)
    return
  }

  // Hitung statistik
  const totalTx = transactionHistory.length
  const successTx = transactionHistory.filter((tx) => tx.status === "success").length
  const failedTx = transactionHistory.filter((tx) => tx.status === "failed").length
  const pendingTx = transactionHistory.filter((tx) => tx.status === "pending").length

  // Hitung total biaya
  const totalCost = transactionHistory
    .filter((tx) => tx.status === "success" && tx.cost)
    .reduce((sum, tx) => sum + Number.parseFloat(tx.cost), 0)

  // Hitung success rate
  const successRate = totalTx > 0 ? ((successTx / totalTx) * 100).toFixed(1) : 0

  // Tampilkan statistik
  console.log(chalk.cyan("\n📊 STATISTIK PEMBATALAN TRANSAKSI"))
  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
  console.log(chalk.green(`✓ Total transaksi: ${totalTx}`))
  console.log(chalk.green(`✓ Berhasil: ${successTx} (${successRate}%)`))
  console.log(chalk.red(`✗ Gagal: ${failedTx}`))
  console.log(chalk.yellow(`⚠ Pending: ${pendingTx}`))
  console.log(chalk.blue(`ℹ️ Total biaya: ${totalCost.toFixed(6)} ${NATIVE_TOKEN_SYMBOL}`))

  // Tampilkan rata-rata biaya per transaksi
  if (successTx > 0) {
    const avgCost = totalCost / successTx
    console.log(chalk.blue(`ℹ️ Rata-rata biaya: ${avgCost.toFixed(6)} ${NATIVE_TOKEN_SYMBOL} per transaksi`))
  }

  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"))

  // Tampilkan 5 transaksi terakhir
  console.log(chalk.cyan("5 TRANSAKSI TERAKHIR:"))
  const p = new Table({
    columns: [
      { name: "time", title: "Waktu", alignment: "left" },
      { name: "wallet", title: "Wallet", alignment: "left" },
      { name: "nonce", title: "Nonce", alignment: "right" },
      { name: "status", title: "Status", alignment: "center" },
      { name: "cost", title: "Biaya", alignment: "right" },
      { name: "gas", title: "Gas (GWEI)", alignment: "right" },
    ],
  })

  // Tambahkan data
  const lastFiveTx = transactionHistory.slice(-5).reverse()
  for (const tx of lastFiveTx) {
    const date = new Date(tx.timestamp)
    const formattedTime = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`
    const shortWallet = tx.wallet
      ? `${tx.wallet.substring(0, 6)}...${tx.wallet.substring(tx.wallet.length - 4)}`
      : "N/A"

    let statusColor = "yellow"
    if (tx.status === "success") statusColor = "green"
    if (tx.status === "failed") statusColor = "red"

    p.addRow(
      {
        time: formattedTime,
        wallet: shortWallet,
        nonce: tx.nonce || "N/A",
        status: tx.status || "N/A",
        cost: tx.cost ? `${Number.parseFloat(tx.cost).toFixed(6)}` : "N/A",
        gas: tx.gasPrice || "N/A",
      },
      { color: statusColor },
    )
  }

  p.printTable()
}

// Fungsi untuk memeriksa status transaksi dari block explorer dengan caching
const txStatusCache = new Map()

async function checkTransactionStatus(txHash, blockExplorerUrl, config) {
  // Cek cache dulu
  if (txStatusCache.has(txHash)) {
    return txStatusCache.get(txHash)
  }

  try {
    // Coba dapatkan status transaksi dari block explorer menggunakan API
    const apiUrl = `${blockExplorerUrl.replace("/tx/", "/api/v1/tx/")}${txHash}`
    const response = await axios.get(apiUrl, {
      timeout: 5000,
      headers: {
        "User-Agent": `AssamTeaTxCanceller/${VERSION}`,
      },
    })

    if (response.data && response.data.status) {
      const status = response.data.status === "success"
      // Simpan ke cache
      txStatusCache.set(txHash, status)
      return status
    }
  } catch (error) {
    // Jika API tidak tersedia, tampilkan link explorer saja
    logger.info(`Lihat status di explorer: ${blockExplorerUrl}${txHash}`)
  }

  return true // Anggap berhasil jika tidak bisa mengecek
}

// Fungsi untuk mendapatkan gas price yang optimal dengan caching
async function getOptimalGasPrice(provider, config) {
  const now = Date.now()

  // Gunakan cache jika masih valid
  if (cachedGasPrice && now - lastGasPriceCheck < config.gasPriceCacheDuration * 1000) {
    logger.info(`Menggunakan gas price dari cache: ${cachedGasPrice} GWEI`)
    return cachedGasPrice
  }

  try {
    const spinner = ora("Menganalisis gas price jaringan...").start()

    // Coba dapatkan gas price dari jaringan
    const networkGasPrice = await provider.getFeeData()
    const baseFeePerGas = networkGasPrice.lastBaseFeePerGas
      ? Number.parseFloat(ethers.formatUnits(networkGasPrice.lastBaseFeePerGas, "gwei"))
      : null

    const suggestedGasPrice = Math.ceil(Number.parseFloat(ethers.formatUnits(networkGasPrice.gasPrice, "gwei")))

    // Tentukan faktor pengali berdasarkan strategi
    let multiplier = 1.2 // default (optimal)
    if (config.gasPriceStrategy === "aggressive") {
      multiplier = 1.5
    } else if (config.gasPriceStrategy === "economic") {
      multiplier = 1.1
    }

    // Hitung gas price berdasarkan strategi
    let recommendedGasPrice = Math.min(suggestedGasPrice * multiplier, config.maxGasPrice)

    // Pastikan minimal sesuai faktor pengali dari gas price jaringan
    recommendedGasPrice = Math.max(recommendedGasPrice, suggestedGasPrice * multiplier)

    // Jika baseFeePerGas tersedia, gunakan untuk perhitungan yang lebih akurat
    if (baseFeePerGas) {
      const priorityFee = config.priorityFee || 1 // GWEI
      const estimatedBaseFee = baseFeePerGas * 1.1 // Estimasi kenaikan base fee
      recommendedGasPrice = Math.min(estimatedBaseFee + priorityFee, config.maxGasPrice)
    }

    // Tampilkan informasi gas price
    spinner.succeed(
      `Gas price jaringan: ${suggestedGasPrice} GWEI, Rekomendasi: ${Math.ceil(recommendedGasPrice)} GWEI (${config.gasPriceStrategy})`,
    )

    if (baseFeePerGas) {
      logger.info(`Base Fee: ${baseFeePerGas.toFixed(2)} GWEI, Priority Fee: ${config.priorityFee} GWEI`)
    }

    // Update cache
    cachedGasPrice = Math.ceil(recommendedGasPrice)
    lastGasPriceCheck = now

    return cachedGasPrice
  } catch (error) {
    logger.warning(`Gagal mendapatkan gas price dari jaringan: ${error.message}`)
    return config.gasPriceStrategy === "aggressive" ? 50 : 30 // Default fallback
  }
}

// Fungsi untuk membatalkan transaksi dengan nonce tertentu dengan retry dan backoff
async function cancelTransaction(wallet, nonce, gasPrice, config, retryCount = 0) {
  // Jika dry run mode, hanya simulasikan
  if (config.dryRun) {
    logger.info(`[DRY RUN] Simulasi pembatalan nonce ${nonce} untuk wallet ${wallet.address}`)
    await sleep(1000) // Simulasi delay

    // Tambahkan ke history
    addToHistory({
      wallet: wallet.address,
      nonce: nonce,
      status: "simulated",
      gasPrice: gasPrice,
      timestamp: new Date().toISOString(),
      message: "Dry run mode - tidak ada transaksi yang dikirim",
    })

    return true
  }

  // Jika sudah berhasil dibatalkan sebelumnya, lewati
  const cacheKey = `${wallet.address.toLowerCase()}-${nonce}`
  if (successfulCancellations.has(cacheKey)) {
    logger.info(`Nonce ${nonce} sudah berhasil dibatalkan sebelumnya.`)
    return true
  }

  try {
    const spinner = ora(`Membatalkan transaksi dengan nonce ${nonce}...`).start()

    // Buat transaksi dengan gas price yang tinggi
    let tx

    // Gunakan maxFeePerGas dan maxPriorityFeePerGas jika diaktifkan
    if (config.maxFeePerGas > 0) {
      tx = {
        to: wallet.address, // Kirim ke diri sendiri
        value: 0n, // 0 TEA
        nonce: nonce,
        maxFeePerGas: ethers.parseUnits(config.maxFeePerGas.toString(), "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits(config.priorityFee.toString(), "gwei"),
        gasLimit: GAS_LIMIT_DEFAULT,
      }
      spinner.text = `Membatalkan transaksi dengan nonce ${nonce} (EIP-1559)...`
    } else {
      tx = {
        to: wallet.address, // Kirim ke diri sendiri
        value: 0n, // 0 TEA
        nonce: nonce,
        gasPrice: ethers.parseUnits(gasPrice.toString(), "gwei"),
        gasLimit: GAS_LIMIT_DEFAULT,
      }
    }

    // Kirim transaksi
    const response = await wallet.sendTransaction(tx)
    spinner.succeed(`Transaksi pembatalan dikirim: ${response.hash}`)

    // Tambahkan ke history sebagai pending
    addToHistory({
      wallet: wallet.address,
      nonce: nonce,
      hash: response.hash,
      status: "pending",
      gasPrice: gasPrice,
      timestamp: new Date().toISOString(),
    })

    // Tunggu konfirmasi
    const waitSpinner = ora(`Menunggu konfirmasi untuk nonce ${nonce}...`).start()
    const receipt = await response.wait()

    if (receipt && receipt.status === 1) {
      waitSpinner.succeed(`Transaksi dengan nonce ${nonce} berhasil dibatalkan!`)
      successfulCancellations.add(cacheKey) // Tambahkan ke cache berhasil
      saveCache() // Simpan cache setelah setiap transaksi berhasil

      // Hitung biaya transaksi
      const cost = ethers.formatEther(receipt.gasUsed * (tx.gasPrice || receipt.effectiveGasPrice || 0n))

      // Update history
      const historyIndex = transactionHistory.findIndex(
        (t) => t.wallet === wallet.address && t.nonce === nonce && t.hash === response.hash,
      )

      if (historyIndex >= 0) {
        transactionHistory[historyIndex].status = "success"
        transactionHistory[historyIndex].blockNumber = receipt.blockNumber
        transactionHistory[historyIndex].gasUsed = receipt.gasUsed.toString()
        transactionHistory[historyIndex].cost = cost
        saveHistory()
      }

      // Kirim notifikasi untuk transaksi berhasil
      await sendTelegramNotification(
        config,
        `<b>Transaksi Berhasil Dibatalkan</b>\n\n` +
          `🔢 <b>Nonce:</b> <code>${nonce}</code>\n` +
          `👛 <b>Wallet:</b> <code>${wallet.address}</code>\n` +
          `🧾 <b>Hash:</b> <code>${response.hash}</code>\n` +
          `⛽ <b>Gas Price:</b> <code>${gasPrice} GWEI</code>\n` +
          `📦 <b>Block:</b> <code>${receipt.blockNumber}</code>\n` +
          `💵 <b>Gas Used:</b> <code>${receipt.gasUsed.toString()}</code>\n` +
          `💰 <b>Biaya:</b> <code>${cost} ${NATIVE_TOKEN_SYMBOL}</code>`,
        response.hash,
        "success",
      )

      // Verifikasi dengan block explorer jika URL tersedia
      if (config.blockExplorer) {
        await checkTransactionStatus(response.hash, config.blockExplorer, config)
      }

      return true
    } else {
      waitSpinner.fail(`Transaksi dikirim tetapi status tidak berhasil. Cek di explorer.`)

      // Update history
      const historyIndex = transactionHistory.findIndex(
        (t) => t.wallet === wallet.address && t.nonce === nonce && t.hash === response.hash,
      )

      if (historyIndex >= 0) {
        transactionHistory[historyIndex].status = "failed"
        saveHistory()
      }

      // Kirim notifikasi untuk transaksi gagal
      await sendTelegramNotification(
        config,
        `<b>Pembatalan Gagal</b>\n\n` +
          `🔢 <b>Nonce:</b> <code>${nonce}</code>\n` +
          `👛 <b>Wallet:</b> <code>${wallet.address}</code>\n` +
          `🧾 <b>Hash:</b> <code>${response.hash}</code>\n` +
          `⛽ <b>Gas Price:</b> <code>${gasPrice} GWEI</code>\n` +
          `❓ <b>Status:</b> Gagal`,
        response.hash,
        "error",
      )

      return false
    }
  } catch (error) {
    // Jika error "replacement transaction underpriced", coba lagi dengan gas price lebih tinggi
    if (error.message.includes("replacement transaction underpriced") && retryCount < MAX_RETRY_COUNT) {
      logger.warning(`Gas price terlalu rendah untuk nonce ${nonce}, mencoba lagi dengan gas price lebih tinggi...`)

      // Tingkatkan gas price dengan faktor yang lebih agresif berdasarkan jumlah retry
      const multiplier = 1.5 + retryCount * 0.1 // Meningkat 10% setiap retry
      const newGasPrice = Math.ceil(gasPrice * multiplier)

      // Kirim notifikasi untuk retry
      await sendTelegramNotification(
        config,
        `<b>Mencoba Ulang Pembatalan</b>\n\n` +
          `🔢 <b>Nonce:</b> <code>${nonce}</code>\n` +
          `👛 <b>Wallet:</b> <code>${wallet.address}</code>\n` +
          `🔄 <b>Percobaan:</b> <code>${retryCount + 1}/${MAX_RETRY_COUNT}</code>\n` +
          `⛽ <b>Gas Price Baru:</b> <code>${newGasPrice} GWEI</code> (naik ${Math.round((multiplier - 1) * 100)}%)\n` +
          `⚠️ <b>Error:</b> <code>Replacement transaction underpriced</code>`,
        null,
        "warning",
      )

      // Tunggu sebentar sebelum mencoba lagi dengan backoff eksponensial
      const retryDelay = config.retryDelay * Math.pow(1.5, retryCount)
      await sleep(retryDelay)

      return await cancelTransaction(wallet, nonce, newGasPrice, config, retryCount + 1)
    }

    // Jika error "nonce has already been used", anggap berhasil
    if (
      error.message.includes("nonce has already been used") ||
      error.message.includes("already known") ||
      error.message.includes("same hash was already imported")
    ) {
      logger.success(`Nonce ${nonce} sudah digunakan oleh transaksi lain.`)
      successfulCancellations.add(cacheKey) // Tambahkan ke cache berhasil
      saveCache()

      // Tambahkan ke history
      addToHistory({
        wallet: wallet.address,
        nonce: nonce,
        status: "success",
        message: "Nonce sudah digunakan oleh transaksi lain",
        timestamp: new Date().toISOString(),
      })

      // Kirim notifikasi Telegram
      await sendTelegramNotification(
        config,
        `<b>Nonce Sudah Digunakan</b>\n\n` +
          `🔢 <b>Nonce:</b> <code>${nonce}</code>\n` +
          `👛 <b>Wallet:</b> <code>${wallet.address}</code>\n` +
          `🔄 <b>Status:</b> Sudah diproses oleh transaksi lain`,
        null,
        "info",
      )

      return true
    }

    logger.error(`Gagal membatalkan nonce ${nonce}: ${error.message}`)

    // Tambahkan ke history
    addToHistory({
      wallet: wallet.address,
      nonce: nonce,
      status: "failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    })

    // Kirim notifikasi untuk error
    await sendTelegramNotification(
      config,
      `<b>Error Pembatalan</b>\n\n` +
        `🔢 <b>Nonce:</b> <code>${nonce}</code>\n` +
        `👛 <b>Wallet:</b> <code>${wallet.address}</code>\n` +
        `❌ <b>Error:</b> <code>${error.message}</code>`,
      null,
      "error",
    )

    return false
  }
}

// Fungsi untuk membatalkan transaksi secara batch dengan worker pool
async function batchCancelTransactions(wallet, nonces, gasPrice, config) {
  const batchSize = config.batchSize || PARALLEL_BATCH_SIZE
  const results = { success: 0, fail: 0 }

  // Tampilkan progress bar
  const progressBar = new cliProgress.SingleBar({
    format: `Pembatalan Batch |${chalk.cyan("{bar}")}| {percentage}% | {value}/{total} Nonces | ⏱️ {eta}s`,
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  })

  progressBar.start(nonces.length, 0)

  // Proses nonce dalam batch dengan worker pool
  const processBatch = async (startIdx) => {
    const endIdx = Math.min(startIdx + batchSize, nonces.length)
    const batch = nonces.slice(startIdx, endIdx)
    const promises = batch.map((nonce) => cancelTransaction(wallet, nonce, gasPrice, config))

    // Tunggu semua transaksi dalam batch selesai
    const batchResults = await Promise.all(promises)

    // Update hasil
    for (const success of batchResults) {
      if (success) {
        results.success++
      } else {
        results.fail++
      }
      progressBar.increment()
    }

    // Proses batch berikutnya jika masih ada
    if (endIdx < nonces.length) {
      // Tunggu sebentar sebelum batch berikutnya untuk menghindari rate limit
      await sleep(2000)
      return processBatch(endIdx)
    }
  }

  // Mulai pemrosesan batch
  await processBatch(0)

  progressBar.stop()
  return results
}

// Fungsi untuk mendapatkan saldo token dengan caching yang lebih efisien
async function getTokenBalance(provider, tokenAddress, walletAddress) {
  try {
    // Cek cache dulu
    const cacheKey = `${tokenAddress.toLowerCase()}-${walletAddress.toLowerCase()}`
    if (tokenBalanceCache.has(cacheKey)) {
      const cachedData = tokenBalanceCache.get(cacheKey)
      // Gunakan cache jika belum expired (5 menit)
      if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
        return cachedData
      }
    }

    // Buat kontrak
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, provider)

    // Dapatkan informasi token dengan Promise.all untuk paralelisasi
    const [balance, decimals, symbol, name] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name(),
    ])

    // Format balance
    const formattedBalance = ethers.formatUnits(balance, decimals)

    // Simpan ke cache
    const result = {
      balance: formattedBalance,
      decimals,
      symbol,
      name,
      timestamp: Date.now(),
    }

    tokenBalanceCache.set(cacheKey, result)
    return result
  } catch (error) {
    logger.warning(`Gagal mendapatkan saldo token: ${error.message}`)
    return { balance: "0", decimals: 18, symbol: "UNKNOWN", name: "Unknown Token" }
  }
}

// Fungsi untuk menampilkan informasi wallet dengan lebih detail
async function displayWalletInfo(wallet, provider, index, total, config) {
  console.log(chalk.cyan(`\n[Wallet ${index + 1}/${total}] ${wallet.address}`))

  try {
    // Tampilkan saldo wallet
    const balance = await provider.getBalance(wallet.address)
    const balanceInEth = Number.parseFloat(ethers.formatEther(balance))

    // Warna berdasarkan saldo
    let balanceColor = chalk.green
    if (balanceInEth < 0.01) balanceColor = chalk.red
    else if (balanceInEth < 0.05) balanceColor = chalk.yellow

    console.log(balanceColor(`  ✓ Saldo wallet: ${balanceInEth} ${NATIVE_TOKEN_SYMBOL}`))

    // Dapatkan nonce terbaru
    const currentNonce = await provider.getTransactionCount(wallet.address, "latest")
    const pendingNonce = await provider.getTransactionCount(wallet.address, "pending")

    console.log(chalk.blue(`  ℹ️ Nonce saat ini (latest): ${currentNonce}`))
    console.log(chalk.blue(`  ℹ️ Nonce pending: ${pendingNonce}`))

    // Cek apakah ada gap dalam nonce
    if (pendingNonce > currentNonce + 1) {
      console.log(chalk.yellow(`  ⚠ Terdeteksi gap dalam nonce. Mungkin ada transaksi yang stuck.`))
    }

    // Tampilkan saldo token jika diaktifkan
    if (config.checkTokenBalances && Object.values(config.tokenContracts).some((addr) => addr)) {
      console.log(chalk.cyan(`  📊 Saldo Token:`))

      // Dapatkan saldo untuk setiap token yang dikonfigurasi secara paralel
      const tokenPromises = Object.entries(config.tokenContracts)
        .filter(([_, addr]) => addr)
        .map(async ([tokenKey, tokenAddress]) => {
          try {
            return {
              key: tokenKey,
              info: await getTokenBalance(provider, tokenAddress, wallet.address),
            }
          } catch (error) {
            return {
              key: tokenKey,
              error: error.message,
            }
          }
        })

      const tokenResults = await Promise.all(tokenPromises)

      // Tampilkan hasil
      for (const result of tokenResults) {
        if (result.info) {
          console.log(
            chalk.green(
              `    ✓ ${result.info.name} (${result.info.symbol}): ${Number.parseFloat(result.info.balance).toFixed(6)}`,
            ),
          )
        } else {
          console.log(chalk.yellow(`    ⚠ Gagal mendapatkan saldo ${result.key}: ${result.error}`))
        }
      }
    }

    return { currentNonce, pendingNonce, balance: balanceInEth }
  } catch (error) {
    logger.error(`Gagal mendapatkan informasi wallet: ${error.message}`)
    throw error
  }
}

// Fungsi untuk memproses satu wallet dengan error handling yang lebih baik
async function processWallet(wallet, provider, config, gasPrice) {
  try {
    // Dapatkan informasi wallet
    const { currentNonce, pendingNonce, balance } = await displayWalletInfo(wallet, provider, 0, 1, config)

    // Cek saldo minimum
    if (balance < config.minBalance) {
      logger.error(
        `Saldo wallet terlalu rendah (${balance} ${NATIVE_TOKEN_SYMBOL}). Minimum: ${config.minBalance} ${NATIVE_TOKEN_SYMBOL}`,
      )
      return { success: 0, fail: 0 }
    }

    // Jika tidak ada transaksi pending, lewati
    if (pendingNonce <= currentNonce) {
      logger.success(`Tidak ada transaksi pending untuk wallet ini.`)
      return { success: 0, fail: 0 }
    }

    // Hitung jumlah transaksi pending
    const pendingTxCount = pendingNonce - currentNonce
    logger.warning(`Ditemukan ${pendingTxCount} transaksi pending`)

    // Hitung biaya maksimal
    const maxCost = ethers.formatEther(
      BigInt(GAS_LIMIT_DEFAULT) * ethers.parseUnits(gasPrice.toString(), "gwei") * BigInt(pendingTxCount),
    )
    logger.warning(`Biaya maksimal: ~${maxCost} ${NATIVE_TOKEN_SYMBOL} dengan gas price ${gasPrice} GWEI`)

    // Jika auto mode, langsung proses
    let shouldProcess = config.autoMode

    // Jika tidak auto mode, minta konfirmasi
    if (!shouldProcess) {
      const answer = await question(chalk.yellow(`  ⚠ Batalkan semua transaksi pending untuk wallet ini? (y/n): `))
      shouldProcess = answer.toLowerCase() === "y"
    }

    if (!shouldProcess) {
      logger.info(`Melewati wallet ini.`)
      return { success: 0, fail: 0 }
    }

    // Buat array nonce yang perlu dibatalkan
    const noncesToCancel = Array.from({ length: pendingTxCount }, (_, i) => currentNonce + i)

    // Batalkan transaksi secara batch
    return await batchCancelTransactions(wallet, noncesToCancel, gasPrice, config)
  } catch (error) {
    logger.error(`Error saat memproses wallet: ${error.message}`)

    // Kirim notifikasi untuk error wallet
    await sendTelegramNotification(
      config,
      `<b>Error Pada Wallet</b>\n\n` +
        `👛 <b>Wallet:</b> <code>${wallet.address}</code>\n` +
        `❌ <b>Error:</b> <code>${error.message}</code>`,
      null,
      "error",
    )

    return { success: 0, fail: 0 }
  }
}

// Fungsi untuk monitoring transaksi pending dengan interval yang adaptif
async function monitorPendingTransactions(config, provider) {
  console.log(chalk.cyan("\n🔍 MONITORING TRANSAKSI PENDING"))
  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
  console.log(chalk.blue(`ℹ️ Interval monitoring: ${config.monitorInterval} detik`))
  console.log(chalk.blue(`ℹ️ Mode auto: ${config.autoMode ? "Aktif" : "Tidak aktif"}`))
  console.log(chalk.blue(`ℹ️ Dry run: ${config.dryRun ? "Aktif" : "Tidak aktif"}`))
  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"))

  // Kirim notifikasi monitoring dimulai
  await sendTelegramNotification(
    config,
    `<b>Monitoring Transaksi Dimulai</b>\n\n` +
      `🔍 <b>Interval:</b> <code>${config.monitorInterval} detik</code>\n` +
      `🤖 <b>Mode Auto:</b> <code>${config.autoMode ? "Aktif" : "Tidak aktif"}</code>\n` +
      `🧪 <b>Dry Run:</b> <code>${config.dryRun ? "Aktif" : "Tidak aktif"}</code>\n` +
      `👛 <b>Jumlah Wallet:</b> <code>${config.privateKeys.length}</code>`,
    null,
    "info",
  )

  // Loop monitoring
  let isRunning = true
  let iteration = 0
  let adaptiveInterval = config.monitorInterval

  // Handle SIGINT untuk keluar dengan rapi
  const originalSigintHandler = process.listeners("SIGINT")[0]
  process.removeAllListeners("SIGINT")

  process.on("SIGINT", async () => {
    logger.warning("\nMenghentikan monitoring...")
    isRunning = false

    // Kirim notifikasi monitoring berhenti
    await sendTelegramNotification(
      config,
      `<b>Monitoring Transaksi Berhenti</b>\n\n` +
        `⏹️ <b>Status:</b> <code>Dihentikan oleh user</code>\n` +
        `🔢 <b>Total Iterasi:</b> <code>${iteration}</code>`,
      null,
      "info",
    )

    logger.warning("\nMonitoring dihentikan. Tekan Enter untuk kembali ke menu utama...")
  })

  while (isRunning) {
    iteration++
    const startTime = Date.now()
    console.log(chalk.cyan(`\n[Monitoring #${iteration}] ${new Date().toLocaleString()}`))

    try {
      // Dapatkan gas price optimal
      const gasPrice = await getOptimalGasPrice(provider, config)

      // Proses setiap wallet
      let totalSuccess = 0
      let totalFail = 0
      let pendingDetected = false

      // Buat array wallet yang akan diproses
      let wallets = []

      // Jika ada private keys, gunakan itu
      if (config.privateKeys.length > 0) {
        wallets = config.privateKeys.map((key) => new ethers.Wallet(key, provider))
      }
      // Jika tidak ada private keys tapi ada wallet address, cek saja status
      else if (config.walletAddress) {
        logger.info(`Monitoring wallet address: ${config.walletAddress} (read-only)`)

        try {
          // Dapatkan nonce terbaru
          const currentNonce = await provider.getTransactionCount(config.walletAddress, "latest")
          const pendingNonce = await provider.getTransactionCount(config.walletAddress, "pending")

          logger.info(`Nonce saat ini (latest): ${currentNonce}`)
          logger.info(`Nonce pending: ${pendingNonce}`)

          if (pendingNonce > currentNonce) {
            logger.warning(`Ditemukan ${pendingNonce - currentNonce} transaksi pending`)
            pendingDetected = true

            // Kirim notifikasi jika ada transaksi pending
            await sendTelegramNotification(
              config,
              `<b>Transaksi Pending Terdeteksi</b>\n\n` +
                `👛 <b>Wallet:</b> <code>${config.walletAddress}</code>\n` +
                `🔢 <b>Nonce Saat Ini:</b> <code>${currentNonce}</code>\n` +
                `🔢 <b>Nonce Pending:</b> <code>${pendingNonce}</code>\n` +
                `⚠️ <b>Jumlah Pending:</b> <code>${pendingNonce - currentNonce}</code>\n\n` +
                `⚠️ <b>Catatan:</b> Mode read-only aktif, tidak dapat membatalkan transaksi.`,
              null,
              "warning",
            )
          } else {
            logger.success(`Tidak ada transaksi pending untuk wallet ini.`)
          }

          // Cek saldo token jika diaktifkan
          if (config.checkTokenBalances && Object.values(config.tokenContracts).some((addr) => addr)) {
            logger.info(`Memeriksa saldo token...`)

            // Dapatkan saldo untuk setiap token secara paralel
            const tokenPromises = Object.entries(config.tokenContracts)
              .filter(([_, addr]) => addr)
              .map(async ([tokenKey, tokenAddress]) => {
                try {
                  return {
                    key: tokenKey,
                    info: await getTokenBalance(provider, tokenAddress, config.walletAddress),
                  }
                } catch (error) {
                  return {
                    key: tokenKey,
                    error: error.message,
                  }
                }
              })

            const tokenResults = await Promise.all(tokenPromises)

            // Tampilkan hasil
            for (const result of tokenResults) {
              if (result.info) {
                logger.success(
                  `${result.info.name} (${result.info.symbol}): ${Number.parseFloat(result.info.balance).toFixed(6)}`,
                )
              } else {
                logger.warning(`Gagal mendapatkan saldo ${result.key}: ${result.error}`)
              }
            }
          }
        } catch (error) {
          logger.error(`Error saat memeriksa wallet: ${error.message}`)
        }
      }

      // Proses setiap wallet jika ada private keys
      for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i]
        try {
          // Dapatkan informasi wallet
          const { currentNonce, pendingNonce } = await displayWalletInfo(wallet, provider, i, wallets.length, config)

          // Jika ada transaksi pending, proses
          if (pendingNonce > currentNonce) {
            pendingDetected = true

            if (config.autoMode) {
              logger.warning(`Ditemukan ${pendingNonce - currentNonce} transaksi pending, memproses secara otomatis...`)

              // Buat array nonce yang perlu dibatalkan
              const noncesToCancel = Array.from({ length: pendingNonce - currentNonce }, (_, i) => currentNonce + i)

              // Batalkan transaksi secara batch
              const results = await batchCancelTransactions(wallet, noncesToCancel, gasPrice, config)
              totalSuccess += results.success
              totalFail += results.fail
            } else {
              logger.warning(
                `Ditemukan ${pendingNonce - currentNonce} transaksi pending, tetapi mode auto tidak aktif.`,
              )

              // Kirim notifikasi jika ada transaksi pending
              await sendTelegramNotification(
                config,
                `<b>Transaksi Pending Terdeteksi</b>\n\n` +
                  `👛 <b>Wallet:</b> <code>${wallet.address}</code>\n` +
                  `🔢 <b>Nonce Saat Ini:</b> <code>${currentNonce}</code>\n` +
                  `🔢 <b>Nonce Pending:</b> <code>${pendingNonce}</code>\n` +
                  `⚠️ <b>Jumlah Pending:</b> <code>${pendingNonce - currentNonce}</code>`,
                null,
                "warning",
              )
            }
          } else {
            logger.success(`Tidak ada transaksi pending untuk wallet ini.`)
          }
        } catch (error) {
          logger.error(`Error saat memproses wallet: ${error.message}`)
        }
      }

      // Tampilkan ringkasan
      if (totalSuccess > 0 || totalFail > 0) {
        logger.success(`\nMonitoring #${iteration} selesai!`)
        logger.success(`Berhasil membatalkan: ${totalSuccess} transaksi`)
        if (totalFail > 0) {
          logger.error(`Gagal membatalkan: ${totalFail} transaksi`)
        }

        // Kirim notifikasi ringkasan
        await sendTelegramNotification(
          config,
          `<b>Ringkasan Monitoring #${iteration}</b>\n\n` +
            `✅ <b>Berhasil:</b> <code>${totalSuccess}</code>\n` +
            `❌ <b>Gagal:</b> <code>${totalFail}</code>\n` +
            `⏰ <b>Waktu:</b> <code>${new Date().toLocaleString()}</code>`,
          null,
          totalFail > 0 ? "warning" : "success",
        )
      } else {
        logger.info(`\nMonitoring #${iteration} selesai, tidak ada transaksi yang perlu dibatalkan.`)
      }

      // Sesuaikan interval berdasarkan aktivitas
      if (pendingDetected) {
        // Jika ada transaksi pending, kurangi interval untuk monitoring lebih sering
        adaptiveInterval = Math.max(30, config.monitorInterval / 2)
      } else {
        // Jika tidak ada transaksi pending, kembalikan ke interval normal
        adaptiveInterval = config.monitorInterval
      }

      // Hitung waktu eksekusi dan sesuaikan waktu tunggu
      const executionTime = (Date.now() - startTime) / 1000
      const waitTime = Math.max(5, adaptiveInterval - executionTime)

      // Cek apakah monitoring masih berjalan
      if (!isRunning) break

      logger.info(
        `Menunggu ${waitTime.toFixed(0)} detik untuk monitoring berikutnya... (Tekan Ctrl+C untuk kembali ke menu utama)`,
      )

      // Tunggu dengan interval yang dapat diinterupsi
      for (let i = 0; i < waitTime; i++) {
        if (!isRunning) break
        await sleep(1000)
      }
    } catch (error) {
      logger.error(`Error dalam monitoring: ${error.message}`)

      // Kirim notifikasi error
      await sendTelegramNotification(
        config,
        `<b>Error Monitoring</b>\n\n` +
          `❌ <b>Error:</b> <code>${error.message}</code>\n` +
          `🔄 <b>Mencoba lagi dalam ${config.monitorInterval} detik...</b>`,
        null,
        "error",
      )

      // Tunggu interval sebelum mencoba lagi
      if (isRunning) {
        await sleep(config.monitorInterval * 1000)
      }
    }
  }

  // Kembalikan handler SIGINT asli
  process.removeAllListeners("SIGINT")
  if (originalSigintHandler) {
    process.on("SIGINT", originalSigintHandler)
  }

  // Tunggu user menekan Enter untuk kembali ke menu utama
  await question(chalk.yellow("Tekan Enter untuk kembali ke menu utama..."))
  return
}

// Fungsi untuk memeriksa saldo token dengan visualisasi yang lebih baik
async function checkTokenBalances(config, provider) {
  console.log(chalk.cyan("\n📊 PEMERIKSAAN SALDO TOKEN"))
  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))

  // Buat array wallet yang akan diperiksa
  let addresses = []

  // Jika ada private keys, gunakan itu
  if (config.privateKeys.length > 0) {
    addresses = config.privateKeys.map((key) => new ethers.Wallet(key, provider).address)
  }
  // Jika tidak ada private keys tapi ada wallet address, gunakan itu
  else if (config.walletAddress) {
    addresses = [config.walletAddress]
  }

  if (addresses.length === 0) {
    logger.error(`Tidak ada wallet yang dikonfigurasi untuk diperiksa.`)
    return
  }

  // Periksa apakah ada token yang dikonfigurasi
  const configuredTokens = Object.entries(config.tokenContracts).filter(([_, addr]) => addr)

  if (configuredTokens.length === 0) {
    logger.error(`Tidak ada token yang dikonfigurasi untuk diperiksa.`)
    return
  }

  logger.info(`Memeriksa ${addresses.length} wallet dan ${configuredTokens.length} token...`)

  // Buat tabel untuk menampilkan hasil
  const p = new Table({
    columns: [
      { name: "wallet", title: "Wallet", alignment: "left" },
      ...configuredTokens.map(([key, _]) => ({ name: key, title: key, alignment: "right" })),
      { name: "native", title: NATIVE_TOKEN_SYMBOL, alignment: "right" },
    ],
  })

  // Spinner untuk menunjukkan progres
  const spinner = ora("Mengambil data saldo token...").start()

  // Periksa setiap wallet dengan Promise.all untuk paralelisasi
  const walletPromises = addresses.map(async (address) => {
    try {
      // Dapatkan saldo native token
      const balance = await provider.getBalance(address)
      const balanceInEth = Number.parseFloat(ethers.formatEther(balance))

      // Buat row data
      const rowData = {
        wallet: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
        native: balanceInEth.toFixed(6),
      }

      // Dapatkan saldo untuk setiap token secara paralel
      const tokenPromises = configuredTokens.map(async ([key, tokenAddress]) => {
        try {
          const tokenInfo = await getTokenBalance(provider, tokenAddress, address)
          return { key, value: Number.parseFloat(tokenInfo.balance).toFixed(6), info: tokenInfo }
        } catch (error) {
          return { key, value: "Error", error: error.message }
        }
      })

      const tokenResults = await Promise.all(tokenPromises)

      // Tambahkan hasil token ke row data
      for (const result of tokenResults) {
        rowData[result.key] = result.value
      }

      // Tentukan warna berdasarkan saldo native
      let rowColor = "green"
      if (balanceInEth < 0.01) rowColor = "red"
      else if (balanceInEth < 0.05) rowColor = "yellow"

      return { rowData, rowColor, address, balanceInEth, tokenResults }
    } catch (error) {
      logger.error(`Error saat memeriksa wallet ${address}: ${error.message}`)
      return { error: true, address, message: error.message }
    }
  })

  const results = await Promise.all(walletPromises)
  spinner.succeed("Data saldo berhasil diambil")

  // Tambahkan hasil ke tabel
  for (const result of results) {
    if (!result.error) {
      p.addRow(result.rowData, { color: result.rowColor })
    }
  }

  // Tampilkan tabel
  p.printTable()

  // Kirim notifikasi dengan saldo token
  let telegramMessage = `<b>Laporan Saldo Token</b>\n\n`

  for (const result of results) {
    if (result.error) {
      telegramMessage += `👛 <b>Wallet:</b> <code>${result.address}</code>\n`
      telegramMessage += `❌ <b>Error:</b> <code>${result.message}</code>\n\n`
    } else {
      telegramMessage += `👛 <b>Wallet:</b> <code>${result.address}</code>\n`
      telegramMessage += `💰 <b>${NATIVE_TOKEN_SYMBOL}:</b> <code>${result.balanceInEth.toFixed(6)}</code>\n`

      // Tambahkan info token
      for (const tokenResult of result.tokenResults) {
        if (!tokenResult.error) {
          const info = tokenResult.info
          telegramMessage += `🪙 <b>${info.name} (${info.symbol}):</b> <code>${tokenResult.value}</code>\n`
        } else {
          telegramMessage += `🪙 <b>${tokenResult.key}:</b> <code>Error: ${tokenResult.error}</code>\n`
        }
      }

      telegramMessage += `\n`
    }
  }

  // Kirim notifikasi
  await sendTelegramNotification(config, telegramMessage, null, "info")

  // Tunggu user menekan Enter untuk kembali ke menu utama
  await question(chalk.yellow("Tekan Enter untuk kembali ke menu utama..."))
  return
}

// Fungsi untuk memproses semua wallet
async function processAllWallets(config, provider, gasPrice) {
  let totalSuccess = 0
  let totalFail = 0

  for (let i = 0; i < config.privateKeys.length; i++) {
    const privateKey = config.privateKeys[i]
    const wallet = new ethers.Wallet(privateKey, provider)

    try {
      // Dapatkan informasi wallet
      const { currentNonce, pendingNonce, balance } = await displayWalletInfo(
        wallet,
        provider,
        i,
        config.privateKeys.length,
        config,
      )

      // Cek saldo minimum
      if (balance < config.minBalance) {
        logger.error(
          `Saldo wallet terlalu rendah (${balance} ${NATIVE_TOKEN_SYMBOL}). Minimum: ${config.minBalance} ${NATIVE_TOKEN_SYMBOL}`,
        )
        continue
      }

      // Jika tidak ada transaksi pending, lewati
      if (pendingNonce <= currentNonce) {
        logger.success(`Tidak ada transaksi pending untuk wallet ini.`)
        continue
      }

      // Hitung jumlah transaksi pending
      const pendingTxCount = pendingNonce - currentNonce
      logger.warning(`Ditemukan ${pendingTxCount} transaksi pending`)

      // Hitung biaya maksimal
      const maxCost = ethers.formatEther(
        BigInt(GAS_LIMIT_DEFAULT) * ethers.parseUnits(gasPrice.toString(), "gwei") * BigInt(pendingTxCount),
      )
      logger.warning(`Biaya maksimal: ~${maxCost} ${NATIVE_TOKEN_SYMBOL} dengan gas price ${gasPrice} GWEI`)

      // Jika auto mode, langsung proses
      let shouldProcess = config.autoMode

      // Jika tidak auto mode, minta konfirmasi
      if (!shouldProcess) {
        const answer = await question(chalk.yellow(`  ⚠ Batalkan semua transaksi pending untuk wallet ini? (y/n): `))
        shouldProcess = answer.toLowerCase() === "y"
      }

      if (!shouldProcess) {
        logger.info(`Melewati wallet ini.`)
        continue
      }

      // Buat array nonce yang perlu dibatalkan
      const noncesToCancel = Array.from({ length: pendingTxCount }, (_, i) => currentNonce + i)

      // Batalkan transaksi secara batch
      const results = await batchCancelTransactions(wallet, noncesToCancel, gasPrice, config)
      totalSuccess += results.success
      totalFail += results.fail
    } catch (error) {
      logger.error(`Error saat memproses wallet: ${error.message}`)

      // Kirim notifikasi untuk error wallet
      await sendTelegramNotification(
        config,
        `<b>Error Pada Wallet</b>\n\n` +
          `👛 <b>Wallet:</b> <code>${wallet.address}</code>\n` +
          `❌ <b>Error:</b> <code>${error.message}</code>`,
        null,
        "error",
      )
    }
  }

  // Tampilkan ringkasan
  logger.success(`\nProses pembatalan nonce selesai!`)
  logger.success(`Berhasil membatalkan: ${totalSuccess} transaksi`)
  if (totalFail > 0) {
    logger.error(`Gagal membatalkan: ${totalFail} transaksi`)
  }

  // Tampilkan statistik
  displayStats()

  // Kirim notifikasi selesai
  await sendTelegramNotification(
    config,
    `<b>Proses Pembatalan Selesai</b>\n\n` +
      `✅ <b>Status:</b> <code>Selesai</code>\n` +
      `👛 <b>Jumlah Wallet:</b> <code>${config.privateKeys.length}</code>\n` +
      `🔢 <b>Berhasil:</b> <code>${totalSuccess}</code>\n` +
      `❌ <b>Gagal:</b> <code>${totalFail}</code>`,
    null,
    "success",
  )

  // Tunggu user menekan Enter untuk kembali ke menu utama
  await question(chalk.yellow("Tekan Enter untuk kembali ke menu utama..."))
  return
}

// Fungsi untuk memproses satu wallet saja
async function processSingleWallet(config, provider, gasPrice) {
  console.log(chalk.cyan("\nDaftar wallet tersedia:"))
  for (let i = 0; i < config.privateKeys.length; i++) {
    const wallet = new ethers.Wallet(config.privateKeys[i], provider)
    console.log(chalk.cyan(`${i + 1}. ${wallet.address}`))
  }

  const walletIndexInput = await question(chalk.magenta(`Pilih wallet [1-${config.privateKeys.length}]: `))
  const walletIndex = Number.parseInt(walletIndexInput) - 1

  if (isNaN(walletIndex) || walletIndex < 0 || walletIndex >= config.privateKeys.length) {
    logger.error("Indeks wallet tidak valid!")
    await question(chalk.yellow("Tekan Enter untuk kembali ke menu utama..."))
    return
  }

  const wallet = new ethers.Wallet(config.privateKeys[walletIndex], provider)
  const result = await processWallet(wallet, provider, config, gasPrice)

  // Tampilkan ringkasan
  logger.success(`\nProses pembatalan nonce selesai!`)
  logger.success(`Berhasil membatalkan: ${result.success} transaksi`)
  if (result.fail > 0) {
    logger.error(`Gagal membatalkan: ${result.fail} transaksi`)
  }

  // Tampilkan statistik
  displayStats()

  // Tunggu user menekan Enter untuk kembali ke menu utama
  await question(chalk.yellow("Tekan Enter untuk kembali ke menu utama..."))
  return
}

// Fungsi utama untuk membatalkan semua transaksi pending
async function cancelAllPendingTransactions() {
  displayBanner()

  try {
    // Muat logger, cache dan history
    logger.loadFromFile()
    loadCache()
    loadHistory()

    // Muat konfigurasi dari .env
    const config = loadEnvConfig()
    logger.success(`Konfigurasi berhasil dimuat`)

    // Tampilkan mode
    if (config.dryRun) {
      logger.warning(`Mode DRY RUN aktif - tidak ada transaksi yang akan dikirim`)
    }

    if (config.autoMode) {
      logger.warning(`Mode AUTO aktif - transaksi akan dibatalkan secara otomatis tanpa konfirmasi`)
    }

    // Hubungkan ke provider dengan retry
    let provider
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        provider = new ethers.JsonRpcProvider(config.rpcUrl)
        await provider.getNetwork() // Test koneksi
        logger.success(`Terhubung ke RPC: ${config.rpcUrl}`)
        break
      } catch (error) {
        retryCount++
        if (retryCount >= maxRetries) {
          throw new Error(`Gagal terhubung ke RPC setelah ${maxRetries} percobaan: ${error.message}`)
        }
        logger.warning(`Gagal terhubung ke RPC (percobaan ${retryCount}/${maxRetries}): ${error.message}`)
        await sleep(2000 * retryCount) // Backoff eksponensial
      }
    }

    // Dapatkan informasi jaringan
    const network = await provider.getNetwork()
    logger.success(`Terhubung ke jaringan: ${network.name} (Chain ID: ${network.chainId})`)

    // Kirim notifikasi awal
    await sendTelegramNotification(
      config,
      `<b>Alat Pembatalan Nonce Dimulai</b>\n\n` +
        `🌐 <b>Jaringan:</b> <code>Assam Tea (Chain ID: ${network.chainId})</code>\n` +
        `🔗 <b>RPC:</b> <code>${config.rpcUrl}</code>\n` +
        `👛 <b>Jumlah Wallet:</b> <code>${config.privateKeys.length}</code>\n` +
        `🧪 <b>Dry Run:</b> <code>${config.dryRun ? "Aktif" : "Tidak aktif"}</code>\n` +
        `🤖 <b>Mode Auto:</b> <code>${config.autoMode ? "Aktif" : "Tidak aktif"}</code>`,
      null,
      "info",
    )

    // Loop menu utama
    while (true) {
      console.log(chalk.cyan("\nMENU UTAMA:"))
      console.log(chalk.cyan("1. Proses semua wallet"))
      console.log(chalk.cyan("2. Proses satu wallet saja"))
      console.log(chalk.cyan("3. Monitoring transaksi pending"))
      console.log(chalk.cyan("4. Tampilkan statistik"))
      console.log(chalk.cyan("5. Periksa saldo token"))
      console.log(chalk.cyan("6. Keluar"))

      const menuChoice = await question(chalk.magenta("Pilihan [1-6]: "))

      // Jika pilihan 4 (statistik), tampilkan dan kembali ke menu utama
      if (menuChoice === "4") {
        displayStats()
        await question(chalk.yellow("Tekan Enter untuk kembali ke menu utama..."))
        continue
      }

      // Jika pilihan 5 (periksa saldo token), tampilkan dan kembali ke menu utama
      if (menuChoice === "5") {
        await checkTokenBalances(config, provider)
        continue
      }

      // Jika pilihan 6 (keluar), langsung keluar
      if (menuChoice === "6") {
        logger.success("Terima kasih telah menggunakan Assam Tea Transaction Canceller!")
        break
      }

      // Jika pilihan 3 (monitoring), jalankan monitoring
      if (menuChoice === "3") {
        if (config.monitorInterval <= 0) {
          logger.error("Interval monitoring tidak valid. Atur MONITOR_INTERVAL di .env (dalam detik).")
          const interval = await question(chalk.magenta("Masukkan interval monitoring dalam detik [60]: "))
          config.monitorInterval = interval ? Number.parseInt(interval) : 60
        }

        await monitorPendingTransactions(config, provider)
        continue
      }

      // Jika tidak ada private keys, tampilkan pesan error
      if (config.privateKeys.length === 0) {
        logger.error("Tidak ada private keys yang dikonfigurasi. Tambahkan PRIVATE_KEYS di .env.")
        await question(chalk.yellow("Tekan Enter untuk kembali ke menu utama..."))
        continue
      }

      // Dapatkan gas price optimal
      const recommendedGasPrice = await getOptimalGasPrice(provider, config)

      // Tanya user tentang gas price
      const gasPriceInput = await question(
        chalk.magenta(`⚡ Masukkan gas price dalam GWEI [default: ${recommendedGasPrice}]: `),
      )
      let gasPrice = gasPriceInput ? Number.parseInt(gasPriceInput) : recommendedGasPrice

      // Validasi gas price
      if (isNaN(gasPrice) || gasPrice <= 0) {
        logger.warning("Gas price tidak valid, menggunakan rekomendasi.")
        gasPrice = recommendedGasPrice
      }

      if (menuChoice === "2") {
        // Mode satu wallet
        await processSingleWallet(config, provider, gasPrice)
      } else if (menuChoice === "1") {
        // Mode semua wallet
        await processAllWallets(config, provider, gasPrice)
      } else {
        logger.warning("Pilihan tidak valid. Silakan pilih 1-6.")
        await question(chalk.yellow("Tekan Enter untuk kembali ke menu utama..."))
      }
    }
  } catch (error) {
    logger.error(`Error: ${error.message}`)

    // Kirim notifikasi error
    try {
      const config = loadEnvConfig()
      await sendTelegramNotification(
        config,
        `<b>Error Fatal</b>\n\n` + `❌ <b>Error:</b> <code>${error.message}</code>`,
        null,
        "error",
      )
    } catch (e) {
      logger.error(`Gagal mengirim notifikasi error: ${e.message}`)
    }

    // Tunggu user menekan Enter sebelum keluar
    await question(chalk.yellow("Tekan Enter untuk keluar..."))
  } finally {
    rl.close()
  }
}

// Jalankan fungsi utama
cancelAllPendingTransactions()
